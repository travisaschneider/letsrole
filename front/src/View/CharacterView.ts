import { View } from "./View";
import { injectable } from "inversify";
import $ = require("jquery");
import { Tree } from "../../shared/System/Tree";
import { View as SheetView } from "../../shared/System/Component/View";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { Repository } from "../DependencyInjection/Repository";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { PopinManager } from "./Popin/PopinManager";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { CodeExecutor } from "../../shared/System/CodeExecutor";
import { Popin } from "./Popin/Popin";
import { UserRepository } from "../Repository/UserRepository";
import { User } from "../Entity/User";
import { ChatView } from "./ChatView";
import { Views } from "../DependencyInjection/Views";
import { UserState } from "../State/UserState";
import { States } from "../DependencyInjection/State";
import { PromptSheet } from "../../shared/System/PromptSheet";
import { CharacterSkinLoader } from "./Character/CharacterSkinLoader";
import { Konsole } from "../../shared/Konsole";
import { Template } from "./Template";
import { PartialCharacter } from "../Entity/PartialCharacter";

@injectable()
export class CharacterView extends View {
  protected skins: any[] = [];

  public init() {
    EventDispatcher.on("open-avatar-popin", (e) => {
      this.openAvatarPopin(e.url, e.cid, e.property);
    });

    $("#character-list").on("click", ".chat-btn", (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();

      const btn: HTMLAnchorElement = e.currentTarget as HTMLAnchorElement;
      const id: number = parseInt(
        (btn.closest(".character") as HTMLElement).dataset.id,
        10
      );

      this.getCharacterRepository()
        .get(id)
        .then((sheet: CharacterSheet) => {
          this.getUserRepository()
            .load(sheet.getUserId())
            .then((user: User) => {
              this.getChatView().openPrivateChat(user);
            });
        });
    });

    $("#character-list").on("click", "h6", (e) => {
      const $container = $(e.currentTarget).parents(".character-simple");
      $container.toggleClass("character-closed");
      this.updateColumnSize();
    });

    $("#character-list").on("click", ".avatar-container", (e) => {
      const $target = $(e.currentTarget);
      const id = <number>$target.data("id");

      const already: Popin = this.getPopinManager().get(
        "sheet-" + id.toString(10)
      );

      if (already && already.isSleeping === false) {
        // close the character if it is displayed
        already.sleep();
        return;
      }

      EventDispatcher.emit(Events.CHARACTER_OPEN_SHEET, {
        id: id,
        background: false,
      });
    });

    EventDispatcher.on(Events.CHARACTER_OPEN_SHEET, (e) => {
      this.getCharacterRepository()
        .get(e.id)
        .then((sheet: CharacterSheet) => {
          if (!this.getCharacterRepository().canAccess(sheet)) {
            return;
          }

          this.display(sheet, e.background);
        });
    });

    EventDispatcher.on(Events.CHARACTER_RELOAD_SHEET, (e) => {
      const popin: Popin = this.getOpenedSheetPopin(e.id);

      if (!popin) {
        return;
      }

      popin.close(true);

      EventDispatcher.emit(Events.CHARACTER_OPEN_SHEET, {
        id: e.id,
        background: popin.isSleeping,
      });
    });

    EventDispatcher.on(Events.CHARACTER_PROMPT, (e) => {
      this.openPrompt(e.title, e.view, e.callback, e.source, e.init);
    });

    EventDispatcher.on(Events.CHARACTER_COLOR_CHANGED, (e) => {
      this.onColorChange(e.cid, e.color);
    });

    EventDispatcher.on(Events.CHARACTER_SKIN, (e) => {
      this.onSkinChange(e.cid, e.skin);
    });

    EventDispatcher.on(Events.WINDOW_RESIZE, (e) => {
      this.updateColumnSize();
    });
  }

  public openPrompt(
    title: string,
    viewId: string,
    callback: any,
    source: CharacterSheet = null,
    init: any = null
  ) {
    const character: any = {
      data: {},
    };

    const sheet = new PromptSheet(
      character,
      this.getTree(),
      viewId,
      "prompt-" + viewId
    );
    const view: SheetView = this.getTree().createView(viewId, sheet);
    let theme = "";
    let skin = "";

    if (source) {
      if (source.hasData("color")) {
        theme = "theme-" + source.getData("color");
      }

      if (source.character.skin) {
        skin = "skin-" + source.character.skin;
        this.getSkinLoader().load(source.character.skin);
      }
    }

    const popin: Popin = this.getPopinManager().create({
      id: "prompt-" + viewId,
      html: sheet.render(),
      title: title,
      template: "popin/prompt-container.html.njk",
      className: "sheet " + theme + " " + skin,
      centered: true,
      width: parseFloat(view.width.toString()) + 40,
      height: parseFloat(view.height.toString()) + 20,
    });

    popin.on("init", () => {
      sheet.init();

      if (init) {
        try {
          init.call(null, sheet.getSheetContext());
        } catch (e) {
          Konsole.error("Error during prompt initialization");
        }
      }

      popin
        .getElement()
        .querySelector("#prompt-actions .btn-continue")
        .addEventListener("click", () => {
          callback(sheet.getAllData());
          popin.close();
        });
    });

    popin.open();
  }

  public onSkinChange(cid: number, skin: string) {
    const already: Popin = this.getPopinManager().get(
      "sheet-" + cid.toString(10)
    );

    if (!already) {
      return;
    }

    const elt: HTMLElement = already.getElement();

    this.removeClassByPrefix(elt, "skin-");

    if (skin != null) {
      this.getSkinLoader().load(skin);
      elt.classList.add("skin-" + skin);
    }
  }

  public onColorChange(cid: number, color: string) {
    const already: Popin = this.getPopinManager().get(
      "sheet-" + cid.toString(10)
    );
    const charList: HTMLElement = document.getElementById("character-list");

    charList
      .querySelectorAll('.character[data-id="' + cid.toString(10) + '"]')
      .forEach((avatar: HTMLElement) => {
        this.removeClassByPrefix(avatar, "theme");
        avatar.classList.add("theme-" + color);
      });

    if (!already) {
      return;
    }

    const elt: HTMLElement = already.getElement();
    this.removeClassByPrefix(elt, "theme");
    elt.classList.add("theme-" + color);
  }

  public openAvatarPopin(url: string, cid: number, property: string) {
    const params: URLSearchParams = new URLSearchParams();
    params.set("cid", cid.toString(10));
    params.set("property", property);
    params.set("table_id", window["architect"].table);
    params.set("app", "1");

    const popin = this.getPopinManager().create({
      id: "avatar-" + cid.toString(),
      title: this.__("Edit avatar"),
      html: Template.render("character/edit-avatar.html.njk", {
        src: url + "?" + params.toString(),
      }),
      minWidth: 1170,
      width: 1170,
      minHeight: 820,
      canDock: false,
    });

    const avatarChangeCallback = (e) => {
      this.onAvatarChange(e);
    };

    const avatarCloseCallback = (e) => {
      this.onAvatarClose(e);
    };

    window.document.removeEventListener("avatar-change", avatarChangeCallback);
    window.document.removeEventListener(
      "close-avatar-popin",
      avatarCloseCallback
    );
    window.document.addEventListener(
      "avatar-change",
      avatarChangeCallback,
      false
    );
    window.document.addEventListener(
      "close-avatar-popin",
      avatarCloseCallback,
      false
    );

    popin.open();
  }

  public onAvatarClose(e: CustomEvent) {
    const popinName: string = "avatar-" + e.detail.cid;
    const popin = this.getPopinManager().get(popinName);

    if (popin) {
      popin.close();
      this.getPopinManager().delete(popinName);
    }
  }

  public onAvatarChange(e: CustomEvent) {
    const popinName: string = "avatar-" + e.detail.character;
    const popin = this.getPopinManager().get(popinName);

    if (popin) {
      popin.close();
      this.getPopinManager().delete(popinName);
    }

    const charId: number = parseInt(e.detail.character, 10);

    this.getClient().send("character", "updateAvatar", {
      cid: charId,
    });
  }

  protected getOpenedSheetPopin(id: number): Popin {
    return this.getPopinManager().get("sheet-" + id.toString(10));
  }

  public display(
    sheet: CharacterSheet,
    background?: boolean,
    cb: Function = null
  ) {
    background = !!background;

    const already: Popin = this.getOpenedSheetPopin(sheet.id);

    if (already) {
      if (!background) {
        already.wakeUp();
      }

      if (cb) {
        cb(already, sheet);
      }

      return;
    }

    let token: string;
    let theme = "";
    let skin = "";

    if (sheet.hasData("avatar")) {
      const avatar: any = sheet.getData("avatar");

      if (avatar.token) {
        token = avatar.token;
      }
    }

    if (sheet.hasData("color")) {
      theme = "theme-" + sheet.getData("color");
    }

    if (sheet.character.skin) {
      skin = "skin-" + sheet.character.skin;
      this.getSkinLoader().load(sheet.character.skin);
    }

    const popin = this.getPopinManager().create({
      id: "sheet-" + sheet.id,
      title: sheet.name,
      html: this.__("Loading..."),
      className: "sheet " + theme + " " + skin,
      type: "character",
      template: "popin/character-container.html.njk",
      resourceId: sheet.character.id,
      stayAwake: true,
      icon: token,
      taskbar: false,
      gm: this.getUserState().isGm(),
      width: parseFloat(sheet.getView().width.toString()) + 40,
      height: parseFloat(sheet.getView().height.toString()) + 20,
      skins: this.skins,
    });

    popin.on("init", () => {
      const kickBtn: HTMLAnchorElement = popin
        .getElement()
        .querySelector(".kick-btn");

      const skinContainer: HTMLElement = popin
        .getElement()
        .querySelector("#dropdownSkinContainer");

      if (sheet.character.userId != this.getUserState().id) {
        skinContainer.classList.add("d-none");
      } else {
        $(skinContainer).on("show.bs.dropdown", () => {
          skinContainer.querySelector(".skin-menu").innerHTML = Template.render(
            "character/skins.html.njk",
            {
              skins: this.skins,
            }
          );

          popin
            .getElement()
            .querySelectorAll("header .skin-btn")
            .forEach((skinButton: HTMLAnchorElement) => {
              skinButton.addEventListener("click", (e) => {
                e.preventDefault();
                const skin: number = parseInt(skinButton.dataset.skin, 10);

                this.getClient().send("character", "skin", {
                  cid: sheet.id,
                  skin: skin,
                });
              });
            });
        });
      }

      if (kickBtn) {
        kickBtn.addEventListener("click", (e) => {
          e.preventDefault();

          if (
            confirm(
              this.__(
                "Are you sure you want to kick this character out of the table?"
              )
            )
          ) {
            this.getClient().send("character", "kick", {
              cid: sheet.id,
            });

            popin.close();
          }
        });
      }
    });

    popin.open();

    if (background) {
      popin.sleep();
    }

    popin.getElement().querySelector("main").innerHTML = sheet.render();

    sheet.init();

    if (cb) {
      cb(popin, sheet);
    }
  }

  public loadSkins(skins: any[]) {
    this.skins = skins;
  }

  public clear() {
    document.getElementById("character-list").innerHTML = "";
    document.getElementById("app").classList.remove("character-column-open");
    this.updateColumnSize();
  }

  public addToList(character: PartialCharacter) {
    const user = this.getUserRepository().find(character.userId);

    const html = Template.render("character/simple.html.njk", {
      character: character,
      cdnUrl: window["configuration"]["cdnReadUrl"],
      isMe: character.userId == this.getUserState().id,
      user: user,
    });

    const list = document.getElementById("character-list");

    list
      .querySelectorAll(".character-" + character.id.toString(10))
      .forEach((element: HTMLElement) => {
        element.remove();
      });

    list.insertAdjacentHTML("beforeend", html);

    const item: HTMLElement = list.querySelector(
      ".character-" + character.id.toString(10)
    );

    const dragImage = new Image();
    dragImage.src = window["configuration"].cdnReadUrl + "/" + character.token;

    item.addEventListener("dragstart", (e: DragEvent) => {
      e.dataTransfer.setData("type", "token");
      e.dataTransfer.setData("id", character.id.toString(10));

      if (character.token) {
        e.dataTransfer.setDragImage(dragImage, 100, 100);
      }
    });

    document.getElementById("app").classList.add("character-column-open");
    this.updateColumnSize();

    $(list)
      .find("h6")
      .tooltip({
        container: document.getElementById("app"),
        placement: "right",
        boundary: "window",
      });
  }

  public removeFromList(id: number) {
    this.getCharacterRepository()
      .get(id)
      .then((sheet: CharacterSheet) => {
        sheet.idle = true;
        this.addToList(sheet.character);
      });
  }

  public updateAvatar(id: number, avatar: any) {
    const $container = $("#character-list .character-" + id.toString());

    if (!$container.length) {
      return;
    }

    $container
      .find(".avatar")
      .css(
        "background-image",
        "url(" +
          window["configuration"]["cdnReadUrl"] +
          "/" +
          avatar.avatar +
          ")"
      );

    if (avatar.frame) {
      const $frame = $container.find(".avatar-frame");
      $frame.html('<img src="/assets/frame/' + avatar.frame.avatar + '">');
    }
  }

  public updateColumnSize() {
    const list: HTMLElement = document.getElementById("character-list");
    const app: HTMLElement = document.getElementById("app");
    const col: HTMLElement = document.getElementById("character-col");

    const available = app.clientHeight;

    if (available * 0.8 < list.clientHeight) {
      col.style.pointerEvents = "auto";
    } else {
      col.style.pointerEvents = "none";
    }
  }

  public leave(character) {
    return;
  }

  protected getTree(): Tree {
    return container.get<Tree>(Services.SystemTree);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getChatView(): ChatView {
    return container.get<ChatView>(Views.Chat);
  }

  protected getCharacterRepository(): CharacterRepository {
    return container.get<CharacterRepository>(Repository.CharacterRepository);
  }

  protected getUserRepository(): UserRepository {
    return container.get<UserRepository>(Repository.UserRepository);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getCodeExecutor(): CodeExecutor {
    return container.get<CodeExecutor>(Services.CodeExecutor);
  }

  protected getSkinLoader(): CharacterSkinLoader {
    return container.get<CharacterSkinLoader>(Services.CharacterSkinLoader);
  }
}
