import { inject, injectable } from "inversify";
import { View } from "./View";
import { View as SystemView } from "../../shared/System/Component/View";
import { Services } from "../DependencyInjection/Services";
import { WebSocketClient } from "../Client/WebSocketClient";
import { User } from "../Entity/User";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { Binding, BindingElement } from "../../shared/System/Binding";
import { CharacterState } from "../State/CharacterState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { Tree } from "../../shared/System/Tree";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { MenuView } from "./MenuView";
import { Views } from "../DependencyInjection/Views";
import { Template } from "./Template";
import { JournalView } from "./JournalView";
import { ChatTab, ChatTabs } from "./Chat/ChatTabs";
import { UserRepository } from "../Repository/UserRepository";
import { Repository } from "../DependencyInjection/Repository";
import { UserState } from "../State/UserState";
import { DockableView, ViewOpenMode } from "./DockableView";
import { WindowState } from "../State/WindowState";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { Emojis } from "./Chat/Emojis";
import { PopinManager } from "./Popin/PopinManager";
import { Popin } from "./Popin/Popin";
import { DiceRollerConfigType, DiceRollerView } from "./DiceRollerView";
import $ = require("jquery");

export interface ChatMessage {
  from: User | string;
  fromId?: number;
  message: string;
  me?: boolean;
  toId?: number;
  to?: User | string;
  bindings?: any[];
  character?: any;
  page?: number;
  history?: boolean;
  at?: Date | null;
}

export enum ChatSystemUser {
  System = "system",
  Notice = "notice",
  Admin = "admin",
  Error = "error",
}

enum ChatDateFormat {
  onlyTime = "onlyTime",
  dateAndTime = "dateAndTime",
}

@injectable()
export class ChatView extends View {
  protected dock: DockableView;
  protected related: HTMLElement;
  protected input: HTMLInputElement;
  protected inputPosition = 0;
  protected emojiDrawer: HTMLElement;
  protected tabs: ChatTabs;

  protected client: WebSocketClient;
  protected binding: Binding;

  protected previousFrom: string;
  protected previousDate: Date;
  protected sameCount = 0;
  protected previousFroms: any = {};
  protected previousDates: Record<number, Date> = {};
  protected sameCounts: any = {};

  protected isTypingSmiley = false;
  protected isTypingBinding = false;
  protected iAmTyping = false;
  protected iAmTypingTimeout: any;
  protected lastIAmTypingSent: number;

  protected isRelatedOpen = false;
  protected matchingWord = "";
  protected word = "";
  protected previousMessage: string = null;

  protected bindings: BindingElement[] = [];
  protected isDisplayingBinding = false;

  protected defaultTitle: string;
  protected notificationEnabled = false;
  protected unreadCount = 0;
  //protected notificationSound: HTMLAudioElement;

  protected static readonly DelayToDisplayTimeSamePerson: number =
    15 * 60 * 1000;
  protected static readonly DelayToDisplayTimeDiffPerson: number =
    5 * 60 * 1000;
  protected static readonly DateFormatTimeFormatter: Record<
    ChatDateFormat,
    Intl.DateTimeFormat
  > = {
    onlyTime: new Intl.DateTimeFormat([], {
      hour: "numeric",
      minute: "numeric",
    }),
    dateAndTime: new Intl.DateTimeFormat([], {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      year: "2-digit",
      hour: "numeric",
      minute: "numeric",
    }),
  };

  public visible = true;

  public constructor(
    @inject(Services.WebSocketClient) client: WebSocketClient,
    @inject(Services.SystemBinding) binding: Binding
  ) {
    super();

    this.client = client;
    this.binding = binding;

    this.defaultTitle = document.title;
  }

  protected getCurrentContainer(): HTMLElement {
    if (this.tabs.currentTab) {
      return this.tabs.currentTab.container;
    }

    return this.getDefaultContainer();
  }

  public getDefaultContainer(): HTMLElement {
    return this.dock.container.querySelector("#chat-container-all");
  }

  public createContainer(id: number): HTMLElement {
    const container: HTMLElement = document.createElement("div");
    container.classList.add("chat-container");
    container.id = "chat-container-" + id.toString(10);

    this.dock.container.prepend(container);

    this.initContainer(container);

    this.getClient().get(
      "chat",
      "history",
      {
        toId: id,
      },
      (response) => {
        this.loadHistory(response.history, id);
      }
    );

    return container;
  }

  public scrollToLastMessage() {
    const container = this.getCurrentContainer();
    container.scrollTop = container.scrollHeight - container.clientHeight;
  }

  public init() {
    const chatTaskBarItem = new TaskBarItem(
      this.__("Chat"),
      "fas fa-comment-lines",
      TaskBarCategory.Main
    );

    this.dock = new DockableView({
      taskBarItem: chatTaskBarItem,
      id: "chat",
      icon: "fas fa-comments-alt",
      title: this.__("Chat"),
      mode: ViewOpenMode.DockLeft,
      html: Template.render("chat/view.html.njk"),
      header: Template.render("chat/header.html.njk"),
      defaultConfiguration: {
        index: 0,
        hidden: false,
        minimized: false,
        mode: ViewOpenMode.DockLeft,
      },
    });

    this.getUi().register(this.dock);
    this.getTaskBarView().add(chatTaskBarItem);

    this.dock.on(DockableView.ON_OPEN, () => {
      this.scrollToLastMessage();
    });

    this.initIAmTyping();

    EventDispatcher.on(Events.CHAT_ADDED, (e) => {
      if (!this.visible) {
        chatTaskBarItem.notify();
      }
    });

    EventDispatcher.on(Events.CHARACTER_COLOR_CHANGED, (e) => {
      this.onColorChange(e.cid, e.color);
    });

    EventDispatcher.on(Events.WINDOW_FOCUS, () => {
      if (!this.dock.minimized) {
        this.unreadCount = 0;
        this.updateTitle();
      }
    });

    this.dock.onMaximize(() => {
      this.unreadCount = 0;
      this.updateTitle();
    });

    this.input = this.dock.container.querySelector("#chat-input");
    this.related = this.dock.container.querySelector("#chat-related");

    const tabsContainer: HTMLElement =
      this.dock.container.querySelector("#chat-tabs");
    this.tabs = new ChatTabs(tabsContainer, this);

    this.input.addEventListener("keyup", (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();

        if (this.isRelatedOpen) {
          this.relatedMoveUp();
        } else if (this.previousMessage !== null && this.input.value === "") {
          this.input.value = this.previousMessage;
        }
      } else if (event.key === "ArrowDown") {
        event.preventDefault();

        if (this.isRelatedOpen) {
          this.relatedMoveDown();
        }
      } else if (event.key === " ") {
        this.word = "";
      } else if (event.keyCode === 219) {
        this.isTypingBinding = false;
      } else if (event.key === "Escape") {
        this.removeRelated();
      } else if (event.key === "Enter") {
        if (this.isRelatedOpen) {
          $("#chat-related a.active").trigger("click");
        } else {
          this.send();
        }
      } else if (event.keyCode === 53) {
        this.isTypingBinding = true;
        this.word = "";
        this.removeRelated();
      } else if (event.key === "Backspace") {
        if (this.word.length > 0) {
          this.word = this.word.substring(0, this.word.length - 1);
        } else {
          this.isTypingSmiley = false;
          this.isTypingBinding = false;
          this.removeRelated();
        }
      } else if (event.key.length === 1) {
        this.word += event.key;
        this.activateIAmTyping();
      }

      if (this.isTypingBinding && this.word) {
        const related = this.binding.getRelated(this.word);
        this.displayBindings(related);
        this.matchingWord = this.word;
      }
    });

    const updatePosition = () => {
      this.inputPosition = this.input.selectionStart;
    };

    this.input.addEventListener("keyup", updatePosition);
    this.input.addEventListener("click", updatePosition);
    this.input.addEventListener("focus", updatePosition);

    $(this.dock.container)
      .find("#chat-related")
      .on("click", "a", (e) => {
        e.preventDefault();
        const code = $(e.target).data("code");

        const pos = this.input.selectionStart;
        const val = this.input.value;

        const from = pos - this.word.length - 1;
        const to = from + this.word.length + 1;
        const after = from + code.length;

        this.input.value = val.substring(0, from) + code + val.substring(to);
        this.input.selectionStart = this.input.selectionEnd = after;
        this.input.focus();

        if (this.isTypingBinding) {
          const name = $(e.target).data("name");
          const binding = this.binding.find(name);
          this.bindings.push(binding);
        }

        this.removeRelated();

        this.isTypingBinding = false;
        this.isTypingSmiley = false;
      });

    this.dock.container
      .querySelector("#emoji-drawer-btn")
      .addEventListener("click", (event: MouseEvent) => {
        event.preventDefault();

        if (this.emojiDrawer === undefined) {
          this.createEmojiDrawer();
        }

        this.toggleEmojiDrawer();
      });

    this.dock.container
      .querySelector("#dice-roller-btn")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.openDiceRoller();
      });

    EventDispatcher.on(Events.USER_ME_LOADED, (e) => {
      if (!this.getUserState().isGm()) {
        return;
      }

      const clearChatBtn: HTMLElement =
        this.dock.header.querySelector("#clear-chat-btn");
      clearChatBtn.classList.remove("d-none");

      clearChatBtn.addEventListener("click", (e) => {
        e.preventDefault();

        if (confirm("Clear the chat ?")) {
          this.getClient().send("chat", "clear", {});
        }
      });
    });

    this.initContainer(this.getDefaultContainer());
  }

  protected activateIAmTyping() {
    if (this.tabs.currentTab != null) {
      return;
    }

    if (!this.iAmTyping) {
      this.sendIAmTyping();
    }

    this.iAmTyping = true;
    clearTimeout(this.iAmTypingTimeout);

    setTimeout(() => {
      this.iAmTyping = false;
    }, 3500);
  }

  protected clearIAmTyping() {
    this.iAmTyping = false;

    this.getClient().send("chat", "clearTyping");
  }

  protected initIAmTyping() {
    setInterval(() => {
      if (this.iAmTyping) {
        this.sendIAmTyping();
      } else {
        this.loadTypings();
      }
    }, 2500);
  }

  protected loadTypings() {
    this.getClient().send("chat", "whoIsTyping");
  }

  protected sendIAmTyping() {
    const doSend = () => {
      this.getClient().send("chat", "typing");
      this.lastIAmTypingSent = +new Date();
    };

    if (!this.lastIAmTypingSent) {
      doSend();
    } else {
      const now: number = +new Date();

      if (now - this.lastIAmTypingSent > 1000) {
        doSend();
      }
    }
  }

  public onColorChange(cid: number, color: string) {
    const container: HTMLElement = this.getDefaultContainer();

    container
      .querySelectorAll(
        '.message[data-character-id="' + cid.toString(10) + '"]'
      )
      .forEach((message: HTMLElement) => {
        this.removeClassByPrefix(message, "theme");
        message.classList.add("theme-" + color);
      });
  }

  protected initContainer(container: HTMLElement) {
    $(container).on("mouseenter", "a.binding", (e) => {
      const $item = $(e.currentTarget);
      const viewId: string = $item.data("view");
      const data: any = $item.data("data");
      const character: any = $item.data("character");

      const id: string = this.getRandomString(8);

      const sheet: CharacterSheet = new CharacterSheet(
        data,
        this.getTree(),
        viewId,
        "binding-" + id
      );
      const view: SystemView = sheet.getView();
      view.context = data;

      document.getElementById("bindings").innerHTML = Template.render(
        "chat/display-binding.html.njk",
        {
          view: view.render(),
          character: character,
          cdnUrl: window["configuration"].cdnReadUrl,
          id: id,
        }
      );

      sheet.init();

      this.isDisplayingBinding = true;

      this.onBindingMouseMove(e.originalEvent);
    });

    $(container).on("mouseleave", "a.binding", (e) => {
      document.getElementById("bindings").innerHTML = "";
      this.isDisplayingBinding = false;
    });

    container.addEventListener("mousemove", (e) => {
      if (this.isDisplayingBinding) {
        this.onBindingMouseMove(e);
      }
    });
  }

  protected onBindingMouseMove(event: MouseEvent) {
    const elt: HTMLElement = document
      .getElementById("bindings")
      .querySelector(".binding-view");
    let top = event.clientY - elt.clientHeight;

    if (top < 10) {
      top = 10;
    }

    const totalWidth = this.getWindowState().getTotalWidth();

    if (event.clientX > totalWidth / 2) {
      const rect = elt.getBoundingClientRect();

      elt.style.left = (event.clientX - rect.width).toString(10) + "px";
    } else {
      elt.style.left = event.clientX.toString(10) + "px";
    }

    elt.style.top = top.toString(10) + "px";
  }

  protected send() {
    this.clearIAmTyping();
    const text = this.input.value.trim();

    if (text === "") {
      return;
    }

    const getToId = () => {
      const current = this.tabs.currentTab;

      if (current == null) {
        return null;
      }

      return current.user.id;
    };

    EventDispatcher.emit(Events.CHAT_SAY, {
      text: text,
      toId: getToId(),
      bindings: this.getTransformedBindings(),
    });

    this.previousMessage = this.input.value;
    this.input.value = "";

    this.word = "";
    this.isTypingSmiley = false;
    this.removeRelated();
    this.bindings = [];
  }

  public openDiceRoller() {
    this.getDiceRollerView().open({
      type: DiceRollerConfigType.Chat,
    });
  }

  public getTransformedBindings(): any[] {
    const state: CharacterState = this.getCharacterState();

    if (!state.isEnabled()) {
      return [];
    }

    const data: any = state.sheet.character.data;
    const result: any[] = [];

    this.bindings.forEach((binding: BindingElement) => {
      result.push({
        name: binding.name,
        view: binding.view.id,
        data: binding.data(data),
      });
    });

    return result;
  }

  protected createEmojiDrawer() {
    const html = Template.render("chat/emoji-drawer.html.njk", {
      emojis: Emojis,
    });

    this.dock.container.insertAdjacentHTML("beforeend", html);
    this.emojiDrawer = this.dock.container.querySelector("#emoji-drawer");

    $(this.emojiDrawer).on("click", "span", (event) => {
      const emoji = event.target.textContent;

      this.input.value =
        this.input.value.substring(0, this.inputPosition) +
        " " +
        emoji +
        " " +
        this.input.value.substring(this.inputPosition);
      this.input.focus();

      this.toggleEmojiDrawer();
    });
  }

  protected toggleEmojiDrawer() {
    if (this.emojiDrawer.classList.contains("d-none")) {
      this.emojiDrawer.classList.remove("d-none");
    } else {
      this.emojiDrawer.classList.add("d-none");
    }
  }

  protected removeRelated() {
    this.related.innerHTML = "";
    this.isRelatedOpen = false;
  }

  protected relatedMoveUp() {
    $("#chat-related a.active").removeClass("active").prev().addClass("active");
  }

  protected relatedMoveDown() {
    $("#chat-related a.active").removeClass("active").next().addClass("active");
  }

  protected displayBindings(related: BindingElement[]) {
    if (related.length === 0) {
      this.removeRelated();

      return;
    }

    const html = Template.render("chat/binding.html.njk", {
      bindings: related,
    });

    this.related.innerHTML = html;
    this.isRelatedOpen = true;
  }

  public escape(message: string) {
    return message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  public clear() {
    this.getDefaultContainer().innerHTML = "";
    this.resetChat();
  }

  public displayTypings(users: any[]) {
    users = users.filter((user: any) => {
      return user.user_id != this.getUserState().id;
    });

    const typingElt: HTMLElement =
      this.dock.container.querySelector(".is-typing");

    if (!typingElt) {
      return;
    }

    if (!users.length) {
      const img: HTMLElement = typingElt.querySelector("img");
      const who: HTMLElement = typingElt.querySelector(".who-is-typing");

      if (img) {
        img.classList.add("d-none");
      }

      if (typingElt) {
        who.innerHTML = "";
      }
      return;
    }

    let html = "";

    if (users.length == 1) {
      html += this.__("%{username} is typing…", {
        username: "<strong>" + this.escape(users[0].username) + "</strong>",
      });
    } else {
      const usernames: string[] = [];

      users.forEach((user: any) => {
        usernames.push("<strong>" + this.escape(user.username) + "</strong>");
      });

      html +=
        '<i class="fas fa-typewriter"></i> ' +
        this.__("%{usernames} are typing…", {
          usernames: usernames.join(", "),
        });
    }

    typingElt.querySelector("img").classList.remove("d-none");
    typingElt.querySelector(".who-is-typing").innerHTML = html;
  }

  public displayXCard(reason: string = null) {
    const popin: Popin = this.getPopinManager().create({
      id: "x-card-" + this.getRandomString(6),
      title: this.__("X-Card"),
      canDock: false,
      canMinimize: false,
      canClose: false,
      width: 360,
      height: 480,
      centered: true,
      html: Template.render("chat/x-card.html.njk", {
        reason: reason,
      }),
      icon: "fas fa-exclamation-circle",
    });

    popin.on("init", () => {
      popin
        .getElement()
        .querySelector(".close")
        .addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();
          popin.close(true);
        });
    });

    popin.open();
  }

  public loadHistory(messages: any[], toId: number = null) {
    this.notificationEnabled = false;

    messages.forEach((message: any) => {
      const msg: ChatMessage = {
        from: message.from_name,
        toId: toId,
        fromId: message.from_id,
        me: message.is_me,
        message: message.message,
        bindings: message.bindings || [],
        character: message.character || {},
        history: true,
        at: message.sent_at ? new Date(message.sent_at * 1000) : null,
      };

      return this.add(msg);
    });

    setTimeout(() => {
      this.notificationEnabled = true;
    }, 2000);
  }

  public openPrivateChat(user: User) {
    this.tabs.open(user);
  }

  protected getPreviousFrom(id: number = null) {
    if (id === null) {
      return this.previousFrom;
    }

    return this.previousFroms[id];
  }

  protected getPreviousDate(id: number = null): Date {
    if (id === null) {
      return this.previousDate ?? new Date(0);
    }

    return this.previousDates[id] ?? new Date(0);
  }

  protected setPreviousFrom(from: string, id: number = null) {
    if (id === null) {
      this.previousFrom = from;
      return;
    }

    this.previousFroms[id] = from;
  }

  protected setPreviousDate(date: Date, id: number = null) {
    if (id === null) {
      this.previousDate = date;
    }

    this.previousDates[id] = date;
  }

  public resetChat(id: number = null) {
    this.setPreviousFrom("", id);
    this.setPreviousDate(new Date(0), id);
  }

  protected getSameCount(id: number = null) {
    if (id === null) {
      return this.sameCount;
    }

    return this.sameCounts[id];
  }

  protected setSameCount(value: number, id: number = null) {
    if (id === null) {
      this.sameCount = value;
      return;
    }

    this.sameCounts[id] = value;
  }

  protected createDateNode(date: Date, format: ChatDateFormat) {
    const dateNode = document.createElement("div");
    dateNode.classList.add("date");
    dateNode.innerText = ChatView.DateFormatTimeFormatter[format].format(date);
    dateNode.title = ChatView.DateFormatTimeFormatter.dateAndTime.format(date);

    return dateNode;
  }

  protected delayIsPassed(
    firstDate: Date,
    lastDate: Date,
    delayMs: number
  ): boolean {
    const time1: number = firstDate.getTime();
    const time2: number = lastDate.getTime();

    return Math.abs(time2 - time1) > delayMs;
  }

  protected dayChanged(firstDate: Date, lastDate: Date) {
    const date1: string =
      "" + firstDate.getFullYear() + firstDate.getMonth() + firstDate.getDate();
    const date2: string =
      "" + lastDate.getFullYear() + lastDate.getMonth() + lastDate.getDate();

    return date1 !== date2;
  }

  public add(msg: ChatMessage) {
    let toId = msg.toId;

    if (toId != null && toId === this.getUserState().id) {
      toId = msg.fromId;
    }

    let message = msg.message;
    message = this.escape(message);
    message = this.binding.parse(message, msg.bindings, msg.character);

    const msgNode = document.createElement("div");
    msgNode.classList.add("message");

    const content = document.createElement("span");

    /* eslint-disable no-useless-escape */
    if (/^[\p{Emoji_Presentation}\s\-]*$/u.test(message)) {
      content.classList.add("emoji-only");
    }

    content.innerHTML = message;

    const avatar = document.createElement("aside");
    avatar.classList.add("message-avatar");

    let avatarUrl = "static/default-avatar.png";

    if (msg.character) {
      if (msg.character.id) {
        msgNode.dataset.characterId = msg.character.id.toString(10);
      }

      if (msg.character.color) {
        msgNode.classList.add("theme-" + msg.character.color);
      }

      if (msg.character.token) {
        avatarUrl = msg.character.token;
      }
    }

    avatar.style.backgroundImage =
      "url('" + window["configuration"]["cdnReadUrl"] + "/" + avatarUrl + "')";

    msgNode.append(avatar);

    msgNode.appendChild(content);

    if (msg.fromId !== this.getUserState().id) {
      msgNode.classList.add("not-mine");
    }

    if (msg.me) {
      msgNode.classList.add("message-me");
    }

    let showFrom = true;
    let from = msg.from;

    if (from instanceof User) {
      from = from.chatname;
    }

    if ((<any>Object).values(ChatSystemUser).includes(from)) {
      msgNode.className += " from-" + from;
      showFrom = true;
    }

    if (msg.me) {
      showFrom = false;

      const userNode = document.createElement("strong");
      userNode.classList.add("username");
      userNode.innerText = from;
      content.prepend(userNode);
    }

    if (from === this.getPreviousFrom(toId) && this.getSameCount(toId) < 5) {
      showFrom = false;
      this.setSameCount(this.getSameCount(toId) + 1, toId);
    } else {
      this.setSameCount(0, toId);
    }

    if (showFrom) {
      const userNode = document.createElement("strong");
      userNode.classList.add("username");
      userNode.innerText = from;

      content.prepend(userNode);
      msgNode.classList.add("with-username");
    } else {
      avatar.classList.add("placeholder");
    }

    let dateNode: HTMLElement = null;

    if (msg.at) {
      const delay: number = showFrom
        ? ChatView.DelayToDisplayTimeDiffPerson
        : ChatView.DelayToDisplayTimeSamePerson;

      if (this.dayChanged(msg.at, this.getPreviousDate(toId))) {
        dateNode = this.createDateNode(msg.at, ChatDateFormat.dateAndTime);
      } else if (
        this.delayIsPassed(msg.at, this.getPreviousDate(toId), delay)
      ) {
        dateNode = this.createDateNode(msg.at, ChatDateFormat.onlyTime);
      }

      this.setPreviousDate(msg.at, toId);
    }

    if (msg.page) {
      const pageLink: HTMLAnchorElement = document.createElement("a");
      pageLink.href = "#";
      pageLink.innerHTML = '<i class="far fa-book-open"></i> Open';
      pageLink.classList.add("shared-page-link");

      pageLink.addEventListener("click", (e) => {
        e.preventDefault();

        this.getEncyclopediaView().display(msg.page);
      });

      msgNode.appendChild(pageLink);
    }

    this.setPreviousFrom(from, toId);

    const addMessage = (container) => {
      dateNode && container.append(dateNode);
      container.append(msgNode);
      this.scrollToLastMessage();

      EventDispatcher.emit(Events.CHAT_ADDED);
    };

    let container;

    if (toId == null) {
      container = this.getDefaultContainer();
      addMessage(container);

      if (!msg.history && msg.fromId !== this.getUserState().id) {
        this.tabs.notify();
      }
    } else {
      let tab: ChatTab = this.tabs.getTab(toId);

      if (!msg.history && msg.fromId !== this.getUserState().id) {
        this.tabs.notify(tab);
      }

      if (tab) {
        container = tab.container;
        addMessage(container);
      } else {
        this.getUserRepository()
          .load(toId)
          .then((user: User) => {
            tab = this.tabs.open(user);

            addMessage(tab.container);
          });
      }
    }

    if (!this.getWindowState().active() || this.dock.minimized) {
      this.unreadCount++;
      this.updateTitle();
    }
  }

  protected updateTitle() {
    if (this.unreadCount > 0 && this.notificationEnabled) {
      document.title =
        this.defaultTitle + " (" + this.unreadCount.toString(10) + ")";
      this.dock.title = "Chat (" + this.unreadCount.toString(10) + ")";
      //this.notificationSound.play();
    } else {
      document.title = this.defaultTitle;
      this.dock.title = "Chat";
    }
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getWindowState(): WindowState {
    return container.get<WindowState>(States.Window);
  }

  protected getUserRepository(): UserRepository {
    return container.get<UserRepository>(Repository.UserRepository);
  }

  protected getEncyclopediaView(): JournalView {
    return container.get<JournalView>(Views.Encyclopedia);
  }

  protected getCharacterState(): CharacterState {
    return container.get<CharacterState>(States.Character);
  }

  protected getDiceRollerView(): DiceRollerView {
    return container.get<DiceRollerView>(Views.DiceRoller);
  }

  protected getTree(): Tree {
    return container.get<Tree>(Services.SystemTree);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }
}
