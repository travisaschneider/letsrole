import { View } from "./View";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { ChatView } from "./ChatView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { MenuView } from "./MenuView";
import { PopinManager } from "./Popin/PopinManager";
import { Services } from "../DependencyInjection/Services";
import { DockableView, ViewOpenMode } from "./DockableView";
import { Template } from "./Template";
import { DiceTagEventDispatcher } from "../Event/DiceTagEventDispatcher";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { DiceResult } from "../../shared/DiceResult";
import { CodeExecutor } from "../../shared/System/CodeExecutor";
import { Konsole } from "../../shared/Konsole";
import { UserState } from "../State/UserState";
import { States } from "../DependencyInjection/State";
import { RollState } from "../State/RollState";
import { DiceBox } from "./Dice/DiceBox";
import { DiceUtil, DieSkin } from "./Dice/DiceUtil";
import $ = require("jquery");

enum LoadedSkinStatus {
  Loading,
  Ready,
  Error,
}

interface LoadedSkin {
  status: LoadedSkinStatus;
  die: DieSkin;
}

interface LoadedSkins {
  [id: number]: LoadedSkin;
}

@injectable()
export class DiceView extends View {
  protected static readonly MAX_DICE: number = 18;
  protected static readonly CLEAR_TIMEOUT: number = 4800;
  protected static readonly MaxLogLength: number = 50;
  protected static readonly DefaultDiceSkinId: number = 35;

  protected skins: LoadedSkins = {};

  protected dice: DiceBox;
  protected ready = false;

  protected idNum = 1;
  protected canvas: HTMLCanvasElement;
  protected clearTimeout: any;

  protected list: HTMLElement;
  protected container: HTMLElement;
  protected view: DockableView;
  protected taskBarItem: TaskBarItem;

  protected disabled = false;
  protected previous: any = null;

  public constructor() {
    super();
    this.canvas = document.getElementById("dice") as HTMLCanvasElement;
    this.list = document.createElement("div");
  }

  public init() {
    EventDispatcher.on(Events.USER_ME_LOADED, () => {
      this.initialize();
    });

    this.container = document.getElementById("dice-result-container");

    this.taskBarItem = new TaskBarItem(
      this.__("Dice log"),
      "far fa-list-ul",
      TaskBarCategory.Main
    );

    this.view = new DockableView({
      id: "dice-log",
      title: this.__("Dice log"),
      html: Template.render("dice/log-container.html.njk"),
      taskBarItem: this.taskBarItem,
      mode: ViewOpenMode.DockRight,
      icon: "far fa-list-ul",
      header: Template.render("dice/log-header.html.njk"),
    });

    this.getUi().register(this.view);

    this.view.container.querySelector("#dice-log-list").appendChild(this.list);

    this.getTaskBarView().add(this.taskBarItem);

    EventDispatcher.on(Events.USER_ME_LOADED, (e) => {
      if (!this.getUserState().isGm()) {
        return;
      }

      const clearBtn = this.view.header.querySelector("#clear-dice-btn");
      clearBtn.classList.remove("d-none");

      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();

        if (confirm("Clear the dice log ?")) {
          this.getClient().send("dice", "clear");
        }
      });
    });

    EventDispatcher.on(Events.CHARACTER_COLOR_CHANGED, (e) => {
      this.onColorChange(e.cid, e.color);
    });

    EventDispatcher.on(Events.WINDOW_RESIZE, (e) => {
      if (this.disabled || !this.ready) {
        return;
      }

      this.canvas.style.width = window.innerWidth + "px";
      this.canvas.style.height = window.innerHeight + "px";
      this.dice?.reinit(this.canvas, {
        w: window.innerWidth / 2,
        h: window.innerHeight / 2,
      });
    });
  }

  public clear() {
    this.list.innerHTML = "";
  }

  protected initialize() {
    if (this.getUserState().isBuilder()) {
      this.disabled = true;
      return;
    }

    try {
      this.dice = new DiceBox(this.canvas, {
        w: window.innerWidth / 2,
        h: window.innerHeight / 2,
      });
    } catch (e) {
      this.disabled = true;
      console.error("Unable to initialize WEBGL : disabling 3D dices");
    }

    const defaultDice: DieSkin = window["configuration"].defaultDice;

    this.load(defaultDice);
  }

  public onColorChange(cid: number, color: string) {
    this.view.container
      .querySelectorAll(
        '.dice-log[data-character-id="' + cid.toString(10) + '"]'
      )
      .forEach((log: HTMLElement) => {
        const colorElt: HTMLElement = log.querySelector(".dice-color");

        if (!colorElt) {
          return;
        }

        this.removeClassByPrefix(colorElt, "bg-theme");
        colorElt.classList.add("bg-theme-" + color);
      });
  }

  public fromRequest(request: BaseMessage) {
    const { diceResult, dices, values } = DiceUtil.fromRequest(request);

    const throwDice = () => {
      this.throw(
        dices,
        values,
        () => {
          this.displayResult(request);
          this.log(request);
          this.getRollState().applyCallback(request.rollId, request.result);

          diceResult.allTags.forEach((tag: string) => {
            DiceTagEventDispatcher.emit(tag, request);
          });
        },
        request.diceSkinId
      );
    };

    if (
      request.diceSkinId &&
      request.diceSkinPath &&
      !this.isSkinLoaded(request.diceSkinId)
    ) {
      return this.load(
        {
          id: request.diceSkinId,
          name: "Request loaded dice",
          path: request.diceSkinPath,
        },
        () => {
          throwDice();
        }
      );
    }

    return throwDice();
  }

  public displayResult(request: any) {
    request.id = "dice-result-" + this.getRandomString(16);
    request.custom = this.getCodeExecutor().hasCustomRoll();

    if (request.icon) {
      request.iconPath =
        window["configuration"].cdnReadUrl + "/" + request.icon.path;
    }

    if (!request.dice_result) {
      const diceResult: DiceResult = new DiceResult(
        request.result,
        request.formula,
        request.name,
        request.visibility
      );

      request.dice_result = diceResult;
    }

    const criticals = this.getCodeExecutor().getCriticalHits(
      request.dice_result
    );

    const getCriticalType = (
      dimension: number,
      value: number
    ): string | null => {
      return DiceUtil.getCriticalType(criticals, dimension, value);
    };

    request.getCriticalType = getCriticalType;

    const html = Template.render("dice/result.html.njk", request);
    this.container.insertAdjacentHTML("afterbegin", html);

    const element: HTMLElement = this.container.querySelector("#" + request.id);
    const already: NodeListOf<HTMLElement> =
      this.container.querySelectorAll(".dice-result");
    const closeBtn: HTMLAnchorElement = element.querySelector(".close-btn");

    if (request.custom) {
      const customElement: HTMLElement = element.querySelector(".custom-roll");
      this.getCodeExecutor().roll(request.result, customElement);
    }

    if (request.actions) {
      this.renderActions(element, request, (action: HTMLElement) => {
        action.classList.add("button-secondary");
      });
    }

    const removeElt = () => {
      element.remove();

      already.forEach((previous: HTMLElement) => {
        if (previous === element) {
          return;
        }

        let subLeft = 0;

        for (const i in already) {
          if (already[i] === previous) {
            break;
          }

          subLeft =
            parseInt(already[i].style.left, 10) + already[i].offsetWidth;
        }

        previous.style.left = subLeft.toString(10) + "px";
      });
    };

    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();

        removeElt();
      });
    }

    let top = -100;

    if (already.length) {
      top = -200;
    }

    let opacity = 0;

    setTimeout(() => {
      removeElt();
    }, 10000);

    const animate = () => {
      if (!element.isConnected) {
        return;
      }

      element.style.opacity = opacity.toString(10);
      element.style.top = top.toString(10) + "px";

      already.forEach((previous: HTMLElement) => {
        if (previous === element) {
          return;
        }

        let subTop = 0;

        for (const i in already) {
          if (already[i] === previous) {
            break;
          }

          subTop =
            parseInt(already[i].style.top, 10) + already[i].offsetHeight + 10;
        }

        previous.style.top = subTop.toString(10) + "px";
      });

      if (opacity < 1 || top < 0) {
        requestAnimationFrame(animate);
      }

      top += 15;
      opacity += 0.1;

      if (top > 0) top = 0;
      if (opacity > 1) opacity = 1;
    };

    requestAnimationFrame(animate);
  }

  protected renderActions(
    container: HTMLElement,
    request: any,
    callback?: Function
  ) {
    let id = 0;

    if (container === null || container === undefined) {
      return;
    }

    for (const name in request.actions) {
      const btnHtml = Template.render("dice/action.html.njk", {
        name: name,
        id: id,
      });

      container
        .querySelector(".actions .inset")
        .insertAdjacentHTML("beforebegin", btnHtml);
      const action: HTMLElement = container.querySelector(
        '[data-id="' + id.toString(10) + '"]'
      );

      action.addEventListener("click", (e) => {
        try {
          request.actions[name](request.result);
        } catch (e) {
          Konsole.error("An error occurred during dice actions", e);
        }

        if (callback) {
          callback(action);
        }
      });

      id++;
    }
  }

  protected isSkinLoaded(skinId: number): boolean {
    if (!this.skins[skinId]) {
      return false;
    }

    if (this.skins[skinId].status !== LoadedSkinStatus.Ready) {
      return false;
    }

    return true;
  }

  public throw(
    dices: string[],
    result: number[],
    onRolled?: Function,
    skinId?: number
  ) {
    if (!dices.length || this.disabled || !this.isSkinLoaded(skinId)) {
      if (onRolled) {
        onRolled.call(this);
      }

      return;
    }

    if (dices.length > DiceView.MAX_DICE) {
      dices = dices.slice(0, DiceView.MAX_DICE);
      result = result.slice(0, DiceView.MAX_DICE);
    }

    this.show();

    const modelDices = [];
    const skinIdStr: string = skinId.toString(10);

    for (const i in dices) {
      modelDices.push("l_" + skinIdStr + "_" + dices[i]);
    }

    if (this.dice) {
      this.dice.rolling = false;
      this.dice.startThrow(
        function () {
          return { set: modelDices, constant: 0, result: result, error: false };
        },
        undefined,
        function (notation, result) {
          return;
        }
      );
    }

    if (onRolled) {
      setTimeout(() => {
        onRolled.call(this);
      }, 2500);
    }

    this.clearTimeout = setTimeout(() => {
      this.hide();
    }, DiceView.CLEAR_TIMEOUT);
  }

  public load(die: DieSkin, callback?: CallableFunction) {
    if (this.skins[die.id]) {
      // nothing to do
    } else {
      this.skins[die.id] = {
        status: LoadedSkinStatus.Loading,
        die: die,
      };

      this.dice?.loadDiceModel(
        die.id,
        "/assets/dice/" + die.path,
        [
          { type: "d4", name: "d4" },
          { type: "d6", name: "d6" },
          { type: "d8", name: "d8" },
          { type: "d10", name: "d10" },
          { type: "d12", name: "d12" },
          { type: "d20", name: "d20" },
          { type: "d100", name: "d100" },
        ],
        () => {
          this.skins[die.id].status = LoadedSkinStatus.Ready;
          this.ready = true;

          if (callback) {
            callback();
          }
        }
      );
    }
  }

  public log(request: any, waitForCleanDisplay = false) {
    const vars = {
      ...{
        name: request.name,
        rolled_at: +Date.now(),
        id: "dice-roll-" + this.getRandomString(16),
      },
      ...request,
    };

    if (vars.name && !vars.title) {
      vars.title = vars.name;
    }

    if (request.icon) {
      vars.iconPath =
        window["configuration"].cdnReadUrl + "/" + request.icon.path;
    }

    if (!vars.dice_result) {
      const diceResult: DiceResult = new DiceResult(
        request.result,
        request.formula,
        request.name,
        request.visibility
      );

      vars.dice_result = diceResult;
    }

    vars.custom = this.getCodeExecutor().hasCustomRoll();

    const criticals = this.getCodeExecutor().getCriticalHits(vars.dice_result);

    const getCriticalType = (
      dimension: number,
      value: number
    ): string | null => {
      return DiceUtil.getCriticalType(criticals, dimension, value);
    };

    vars.getCriticalType = getCriticalType;

    const html = Template.render("dice/log.html.njk", vars);

    this.list.insertAdjacentHTML("afterbegin", html);
    const logs = this.view.container.querySelectorAll(".dice-log");
    const current: HTMLElement = logs.item(0) as HTMLElement;

    const visibility: HTMLElement = current.querySelector(".visibility");

    current.querySelector("header").addEventListener("click", () => {
      if (current.classList.contains("condensed")) {
        current.classList.remove("condensed");
      } else {
        current.classList.add("condensed");
      }
    });

    if (vars.custom) {
      const customRender: HTMLElement = current.querySelector(".custom-roll");
      this.getCodeExecutor().roll(vars.dice_result, customRender);
    }

    if (visibility) {
      $(visibility).tooltip({
        trigger: "hover",
      });
    }

    current.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("dice", JSON.stringify(request.result));
      e.dataTransfer.setData("title", request.name);
      e.dataTransfer.setData("expression", request.formula);
      e.dataTransfer.setData("visibility", request.visibility);
    });

    this.renderActions(current, request);

    this.previous = vars;

    if (!waitForCleanDisplay) {
      this.cleanDisplay();
    }
  }

  public cleanDisplay() {
    const logs = this.view.container.querySelectorAll(".dice-log");

    let n = 0;
    let reversed: HTMLElement[] = [];

    logs.forEach((log: HTMLElement) => {
      reversed.push(log);

      if (n++ > 2) {
        log.classList.add("condensed");
      }
    });

    let last: HTMLElement = reversed.pop();
    reversed = reversed.reverse();

    reversed.forEach((log: HTMLElement) => {
      if (log.dataset.token == last.dataset.token) {
        last.querySelector(".dice-log-user").classList.add("d-none");
      }

      last = log;
    });

    if (logs.length > DiceView.MaxLogLength) {
      for (let i = logs.length - 1; i >= DiceView.MaxLogLength; i--) {
        logs.item(i).remove();
      }
    }
  }

  protected hide() {
    $(this.canvas).addClass("fadeout");
  }

  protected show() {
    clearTimeout(this.clearTimeout);
    $(this.canvas).removeClass("fadeout");
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getCodeExecutor(): CodeExecutor {
    return container.get<CodeExecutor>(Services.CodeExecutor);
  }

  protected getChatView(): ChatView {
    return container.get<ChatView>(Views.Chat);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getRollState(): RollState {
    return container.get<RollState>(States.Roll);
  }
}
