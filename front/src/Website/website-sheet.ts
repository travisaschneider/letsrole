/// <reference path="../module.d.ts" />

import "reflect-metadata";
import { SharedAdapter } from "../../shared/System/SharedAdapter";
import { EventDispatcher } from "../Event/EventDispatcher";
import { v4 as Uuid } from "uuid";
import { Tree } from "../../shared/System/Tree";
import { Tables } from "../../shared/System/Tables";
import { CodeExecutor } from "../../shared/System/CodeExecutor";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { eval as safeEval } from "js-engine";
import { Translator } from "../../shared/System/Translator";
import { DiceIcon } from "../../shared/DiceData";
import { container } from "./WebsiteSheet/Container";
import { Services } from "./WebsiteSheet/Services";
import { DiceUtil, DieSkin } from "../View/Dice/DiceUtil";
import { DiceBox } from "../View/Dice/DiceBox";
import { Events } from "../Event/Events";
import { PromptSheet } from "../../shared/System/PromptSheet";
import { View as SheetView } from "../../shared/System/Component/View";
import { Konsole } from "../../shared/Konsole";
import { DiceResult } from "../../shared/DiceResult";
import { Environment } from "nunjucks";
import { CharacterSkinLoader } from "../View/Character/CharacterSkinLoader";
import { RollCallback, RollState } from "../State/RollState";
import {
  DiceExpressionHelper,
  DiceFunctionHelper,
} from "../View/Dice/DiceExpressionHelper";
import { MobileSheetMenu } from "./WebsiteSheet/MobileSheetMenu";
import $ from "jquery";

export class WebsiteSheet {
  protected static readonly MaxDice: number = 20;
  protected static readonly ClearDuration: number = 4800;
  public static readonly DefaultDiceId: number = 35;
  public static readonly DefaultDicePath: string = "default.gltf";

  public sheet: CharacterSheet;
  public translator: Translator;

  protected cid: number;
  protected updateUrl: string;
  protected rollUrl: string;
  protected multiUpdateUrl: string;
  protected changes: any = {};
  protected throwDisabled = false;
  protected isSkinLoaded = true;
  protected skinPath: string = null;
  protected clearDiceTimeout;
  protected dice: DiceBox;
  protected canvas: HTMLCanvasElement;
  protected ready = false;
  public diceId = WebsiteSheet.DefaultDiceId;
  protected loadedDice: number[] = [];
  public currentDice: DieSkin = null;

  protected templateEngine: Environment;
  protected rollMode: RollMode = RollMode.Virtual;

  protected isMobile = false;
  protected menu: MobileSheetMenu;

  protected static readonly PersistInterval: number = 15000;

  protected static readonly BlankCharacter: any = {
    id: 0,
    data: {},
    name: "",
  };

  public constructor() {
    window["$"] = window["jQuery"] = $;
    window["app_mode"] = "site";

    if (!window["letsrole"]) {
      window["letsrole"] = {};
    }

    window["letsrole"]["loadDice"] = this.loadDice.bind(this);
    window["letsrole"]["loadSheetSkin"] = this.loadSkin.bind(this);
    window["letsrole"]["setRollMode"] = this.setRollMode.bind(this);

    SharedAdapter.container = container;
    SharedAdapter.eventDispatcher = EventDispatcher;
    SharedAdapter.uuid = Uuid;
    SharedAdapter.safeEval = safeEval;

    this.translator = container.get<Translator>(Services.SystemTranslator);

    if (window["locale"]) {
      this.translator.current = window["locale"];

      if (window["translation"]) {
        this.translator.setTranslation(
          this.translator.current,
          window["translation"]
        );
      }
    }

    const data: any = window["system"];
    const executor = container.get<CodeExecutor>(Services.CodeExecutor);

    if (data.tree !== undefined) {
      const tree = container.get<Tree>(Services.SystemTree);
      tree.setSource(data.tree);
    }

    if (data.tables !== undefined) {
      const tables = container.get<Tables>(Services.SystemTables);
      tables.unserialize(data.tables);
    }

    executor.setScript(data?.script);

    SharedAdapter.codeExecutor = executor;
    SharedAdapter.translator = this.translator;

    SharedAdapter.eventDispatcher.on("open-avatar-site-popin", (e) => {
      this.openAvatar(e.url, e.cid, e.property);
    });

    window["website-sheet"] = this;

    this.canvas = document.getElementById("dice") as HTMLCanvasElement;

    if (document.body.classList.contains("is-mobile")) {
      this.isMobile = true;
    }

    if (this.isMobile) {
      document.addEventListener("mobile", (message: MessageEvent) => {
        const request = message.data;

        switch (request.action) {
          case "avatar":
            this.uploadAvatar(request.image, request.mime);
            break;
        }
      });

      this.initEvents();
      this.initDice();
      this.initOfflineRolls();
    }

    EventDispatcher.on(Events.CHARACTER_PROMPT, (e) => {
      this.openPrompt(e.title, e.view, e.callback, e.source, e.init);
    });

    this.templateEngine = new Environment([], {
      autoescape: true,
    });

    this.templateEngine.addGlobal("__", this.__.bind(this));
    this.templateEngine.addGlobal(
      "cdnUrl",
      this.getConfiguration("cdnReadUrl")
    );

    $(() => {
      if (this.isMobile) {
        this.menu = new MobileSheetMenu(this);
      }

      this.load();
    });
  }

  protected __(str: string): string {
    return str;
  }

  protected uploadAvatar(base64Image: string, mime: string): void {
    const imageUrl: string = "data:image/jpeg;base64," + base64Image;

    const image: HTMLImageElement = document.querySelector(
      "[data-widget-id='avatar'] img"
    );

    image.src = imageUrl;

    fetch(imageUrl)
      .then((res) => res.blob())
      .then((blob: Blob) => {
        const formData = new FormData();
        formData.append("media[]", blob, "avatar.jpg");
        const url = window["configuration"]["cdnUrl"] + "/upload";

        fetch(url, {
          method: "POST",
          body: formData,
          headers: {
            AuthKey: this.getAuthKey(),
          },
        })
          .then((res) => res.json())
          .then((response) => {
            const params = new URLSearchParams({
              cid: this.cid.toString(10),
              property: "avatar",
              avatarUrl: response[0].path,
              avatarFrameId: null,
            });

            fetch("/api/character/avatar", {
              method: "POST",
              body: params,
              headers: {
                AuthKey: this.getAuthKey(),
              },
            }).then((res) => {
              //alert(JSON.stringify(res));
            });
          })
          .catch((e) => {
            //alert("error" + JSON.stringify(e));
            alert("An error occurred");
          });
      });
  }

  protected initDice() {
    try {
      this.dice = new DiceBox(this.canvas, {
        w: window.innerWidth / 2,
        h: window.innerHeight / 2,
      });
    } catch (e) {
      this.throwDisabled = true;
      console.error("Unable to initialize WEBGL : disabling 3D dices");
    }

    const dice: DieSkin = {
      id: WebsiteSheet.DefaultDiceId,
      name: "Default",
      path: WebsiteSheet.DefaultDicePath,
    };

    const character: any = window["character"];

    if (character?.dice?.id) {
      dice.id = character.dice.id;
      dice.path = character.dice.path;
    }

    this.loadDice(dice, () => {
      this.diceId = dice.id;
    });
  }

  public setRollMode(mode: RollMode) {
    this.rollMode = mode;
  }

  public loadDice(dice: DieSkin, callback?: CallableFunction) {
    this.currentDice = dice;

    if (this.throwDisabled) {
      this.ready = true;
      return;
    }

    if (this.loadedDice.includes(dice.id)) {
      if (callback) {
        callback();
      }

      return;
    }

    this.dice?.loadDiceModel(
      dice.id,
      "/assets/dice/" + dice.path,
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
        this.ready = true;
        this.loadedDice.push(dice.id);

        if (callback) {
          callback();
        }
      }
    );
  }

  protected initEvents() {
    EventDispatcher.on("roll", async (e: any) => {
      const cid = e.cid !== undefined ? e.cid : this.sheet.id;
      let expression = e.expression;
      const icon: DiceIcon = e.icon;

      expression = this.sheet.referencer.renderRoll(expression);

      if (!icon) {
        e.icon = this.sheet.getTemporaryRollIcon();
      }

      if (expression !== undefined) {
        this.roll(
          expression,
          cid,
          null,
          e.title,
          e.actions,
          e.visibility ? e.visibility : "visible",
          e.icon
        );
      }
    });

    EventDispatcher.on("roll-builder", async (e) => {
      const cid = e.cid !== undefined ? e.cid : this.sheet.id;
      const builder = e.builder;
      let expression = builder.expression();

      if (typeof expression == "object") {
        expression = expression.toString();
      }

      expression = this.sheet.referencer.renderRoll(expression);

      let callback: RollCallback = null;

      if (builder.onRoll()) {
        callback = {
          sheet: this.sheet,
          callback: builder.onRoll(),
        };
      }

      if (expression) {
        this.roll(
          expression,
          cid,
          null,
          builder.title(),
          builder.actions(),
          builder.visibility(),
          builder.icon(),
          callback
        );
      }
    });
  }

  protected initOfflineRolls() {
    const wrapper: HTMLElement = document.querySelector(
      ".offline-roll-wrapper"
    );

    wrapper.addEventListener("click", (event: MouseEvent) => {
      wrapper.classList.remove("active");
      wrapper.innerHTML = "";
    });
  }

  protected offlineRoll(expression: string, title?: string) {
    const wrapper: HTMLElement = document.querySelector(
      ".offline-roll-wrapper"
    );

    if (!wrapper) {
      return;
    }

    const helpers: DiceFunctionHelper[] =
      this.getDiceExpressionHelper().extract(expression);

    const html: string = this.render("dice/offline-roll.html.njk", {
      expression: expression,
      title: title,
      helpers: helpers,
      skin: this.skinPath,
    });

    wrapper.insertAdjacentHTML("afterbegin", html);
    wrapper.classList.add("active");
    const box: HTMLElement = wrapper.querySelector("#offline-roll");

    setTimeout(() => {
      box.addEventListener("click", (event: MouseEvent) => {
        wrapper.classList.remove("active");
        wrapper.innerHTML = "";
      });
    }, 200);
  }

  public render(view: string, context: any = {}): string {
    return this.templateEngine.render(view, context);
  }

  protected roll(
    expression: string,
    characterId?: number,
    craftId?: number,
    title?: string,
    actions?: any,
    visibility = "visible",
    icon: DiceIcon = null,
    callback: RollCallback = null
  ) {
    if (visibility !== "gm" && visibility !== "gmonly") {
      visibility = "visible";
    }

    if (this.rollMode === RollMode.Offline) {
      return this.offlineRoll(expression, title);
    }

    const rollId: string = this.generateRandomString(16);

    if (callback != null) {
      this.getRollState().addCallback(rollId, callback);
    }

    const rollData = {
      rollId: rollId,
      tableId: this.isMobile ? this.menu.connectedTable : null,
      expression: expression,
      cid: characterId == null ? null : characterId,
      craftId: craftId,
      title: title,
      visibility: visibility,
      icon: icon,
    };

    fetch(this.rollUrl, {
      method: "POST",
      body: this.objectToURLParams(rollData),
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((response) => {
        return response.json();
      })
      .then((response: any) => {
        const roll = response.roll;
        roll.actions = actions;

        const { diceResult, dices, values } = DiceUtil.fromRequest(roll);

        setTimeout(() => {
          this.displayResult(roll);
        }, 1200);

        this.throw(
          dices,
          values,
          () => {
            this.getRollState().applyCallback(roll.rollId, response.result);
          },
          this.diceId
        );
      });
  }

  public throw(
    dices: string[],
    result: number[],
    onRolled?: Function,
    skinId?: number
  ) {
    if (!dices.length || this.throwDisabled || !this.isSkinLoaded) {
      if (onRolled) {
        onRolled.call(this);
      }

      return;
    }

    if (dices.length > WebsiteSheet.MaxDice) {
      dices = dices.slice(0, WebsiteSheet.MaxDice);
      result = result.slice(0, WebsiteSheet.MaxDice);
    }

    this.showDice();

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

    this.clearDiceTimeout = setTimeout(() => {
      this.hideDice();
    }, WebsiteSheet.ClearDuration);
  }

  protected hideDice() {
    this.canvas.classList.add("fadeout");
  }

  protected showDice() {
    clearTimeout(this.clearDiceTimeout);
    this.canvas.classList.remove("fadeout");
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
      }
    }

    const promptContainer: HTMLElement = document.getElementById("prompt");

    const classes = "sheet " + theme + " " + skin;
    const width = parseFloat(view.width.toString()) + 70;
    const height = parseFloat(view.height.toString()) + 20;

    const header = `<header class="d-flex flex-row align-items-center">
        <h3 class="mr-auto">${this.escapeHtml(title)}</h3>
        <a href="#" class="close"><i class="fas fa-times"></i></a>
    </header>`;

    const next = `<div class="mt-3 text-right" id="prompt-actions"><a href="#" class="btn btn-secondary btn-continue">Continue <i class="fas fa-arrow-right"></i></a></div>`;
    const html = `<div class="${classes}" style="width:${width}px" id="${sheet.getContainerId()}">${header}<main>${sheet.render()} ${next}</main></div>`;

    promptContainer.innerHTML = html;
    promptContainer.classList.add("active");

    sheet.init();

    if (init) {
      try {
        init.call(null, sheet.getSheetContext());
      } catch (e) {
        Konsole.error("Error during prompt initialization");
      }
    }

    const closePrompt = () => {
      promptContainer.classList.remove("active");
      promptContainer.innerHTML = "";
    };

    promptContainer
      .querySelector(".close")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        closePrompt();
      });

    promptContainer
      .querySelector("#prompt-actions .btn-continue")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        callback(sheet.getAllData());
        closePrompt();
      });
  }

  protected escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  protected openAvatar(url: string, cid: number, property: string) {
    $.get(
      url,
      {
        cid: cid,
        property: property,
      },
      (response) => {
        const overlay: HTMLElement = document.getElementById("avatar-overlay");
        overlay.classList.remove("d-none");
        overlay.innerHTML = response;

        overlay
          .querySelector("#cancel-btn")
          .addEventListener("click", (e: MouseEvent) => {
            overlay.innerHTML = "";
            overlay.classList.add("d-none");
          });

        const TokenEditor = window["tokenEditor"];
        const editor = new TokenEditor();
        editor.init();

        const editorContainer: HTMLElement =
          overlay.querySelector(".avatar-editor");

        if (editorContainer.dataset.defaultAvatar) {
          editor.setDefaultAvatar(editorContainer.dataset.defaultAvatar);
        }

        if (editorContainer.dataset.avatarFrameId) {
          editor.setDefaultAvatarFrame(
            editorContainer.dataset.avatarFrameId,
            editorContainer.dataset.avatarFramePath
          );
        }

        if (editorContainer.dataset.defaultToken) {
          editor.setDefaultToken(editorContainer.dataset.defaultToken);
        }

        if (editorContainer.dataset.tokenFrameId) {
          editor.setDefaultTokenFrame(
            editorContainer.dataset.tokenFrameId,
            editorContainer.dataset.tokenFramePath
          );
        }
      }
    );
  }

  public displayResult(request: any) {
    const exector: CodeExecutor = container.get<CodeExecutor>(
      Services.CodeExecutor
    );
    const resultContainer: HTMLElement = document.getElementById("dice-result");

    request.id = "dice-result-" + this.generateRandomString(16);
    request.custom = exector.hasCustomRoll();

    if (request.icon) {
      request.iconPath =
        this.getConfiguration("cdnReadUrl") + "/" + request.icon.path;
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

    const criticals = exector.getCriticalHits(request.dice_result);

    const getCriticalType = (
      dimension: number,
      value: number
    ): string | null => {
      return DiceUtil.getCriticalType(criticals, dimension, value);
    };

    request.getCriticalType = getCriticalType;

    const html = this.render("dice/result.html.njk", request);
    resultContainer.innerHTML = html;

    const element: HTMLElement = resultContainer.querySelector(
      "#" + request.id
    );
    const already: NodeListOf<HTMLElement> =
      resultContainer.querySelectorAll(".dice-result");
    const closeBtn: HTMLAnchorElement = element.querySelector(".close-btn");

    if (request.custom) {
      const customElement: HTMLElement = element.querySelector(".custom-roll");
      exector.roll(request.result, customElement);
    }

    if (request.actions) {
      this.renderActions(element, request, (action: HTMLElement) => {
        action.classList.add("button-secondary");
      });
    }

    const removeElt = () => {
      element.remove();
    };

    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();

        removeElt();
      });
    }

    setTimeout(() => {
      element.classList.add("active");
    }, 200);

    setTimeout(() => {
      removeElt();
    }, 7500);
  }

  public renderActions(
    container: HTMLElement,
    request: any,
    callback?: Function
  ) {
    let id = 0;

    if (container === null || container === undefined) {
      return;
    }

    for (const name in request.actions) {
      const btnHtml = this.render("dice/action.html.njk", {
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

  protected load() {
    if (window["sheet_demo"]) {
      return this.initSheet(WebsiteSheet.BlankCharacter);
    }

    const container: HTMLElement = document.getElementById("sheet-container");

    this.updateUrl = container.dataset.update;
    this.rollUrl = container.dataset.roll;
    this.multiUpdateUrl = container.dataset.multiUpdate;

    this.initSheet(window["character"]);

    if (this.menu) {
      this.menu.sid = window["character"].system_id;
    }
  }

  protected initSheet(character: any) {
    this.cid = character.id;

    this.initPersist();

    if (window["translation"] && window["locale"]) {
      this.translator.setTranslation(window["locale"], window["translation"]);
      this.translator.current = window["locale"];

      if (this.menu) {
        this.menu.setCurrentLocale(window["locale"]);
      }
    }

    this.renderSheet(character);
  }

  protected renderSheet(character: any = {}) {
    const sheet = new CharacterSheet(
      character,
      this.getTree(),
      this.getTree().mainSourceId
    );
    const view = sheet.getView();

    if (this.getConfiguration("readOnly")) {
      view.readOnly = true;
    }

    const block: HTMLElement = document.createElement("div");
    block.id = "sheet-" + character.id;
    block.innerHTML = view.render();

    if (view.width) {
      block.style.width = view.width.toString(10) + "px";
    }

    document.getElementById("sheet-container").innerHTML = "";
    document.getElementById("sheet-container").append(block);

    sheet.init();

    if (character.skin) {
      this.loadSkin(character.skin);
    }

    if (character.data.color) {
      this.onColorChange(character.data.color);
    }

    this.sheet = sheet;

    if (window["onSheetReady"]) {
      window["onSheetReady"]();
    }
  }

  public setTranslation(locale: string, translation: any) {
    this.translator.setTranslation(locale, translation);
    this.translator.current = locale;
    window["locale"] = locale;

    if (this.sheet) {
      this.renderSheet(this.sheet.character);
    } else {
      this.renderSheet(WebsiteSheet.BlankCharacter);
    }
  }

  public loadSkin(skin: string) {
    this.getSkinLoader().load(skin);

    const container: HTMLElement = document.getElementById("sheet-container");
    this.removeClassByPrefix(container, "skin-");
    container.classList.add("skin-" + skin);

    this.skinPath = skin;
  }

  protected onColorChange(color: string) {
    const container: HTMLElement = document.getElementById("sheet-container");
    this.removeClassByPrefix(container, "theme");
    container.classList.add("theme-" + color);
  }

  protected removeClassByPrefix(el: HTMLElement, prefix: string) {
    el.classList.forEach((className) => {
      if (className.startsWith(prefix)) {
        el.classList.remove(className);
      }
    });

    return el;
  }

  public rename(name: string) {
    this.sheet.character.name = name;
  }

  protected initPersist() {
    EventDispatcher.on("character-persist", (e) => {
      if (e.p === "color") {
        this.onColorChange(e.val);
      }

      if (e.del) {
        const toDeleteData: any = {
          del: e.del,
          p: e.p,
          val: JSON.stringify(e.val),
          cid: this.cid,
        };

        const headers = {
          "X-Requested-With": "XMLHttpRequest",
        };

        if (this.getAuthKey()) {
          headers["AuthKey"] = this.getAuthKey();
        }

        fetch(this.updateUrl, {
          method: "POST",
          body: this.objectToURLParams(toDeleteData),
          headers: headers,
        })
          .then((response) => {
            return response.json();
          })
          .then((res: any) => {
            console.info("Successfully saved sheet data");
          });
      } else {
        this.changes[e.p] = e.val;
      }
    });

    EventDispatcher.on("character-multi-persist", (e) => {
      for (const p in e.data) {
        this.changes[p] = e.data[p];
      }
    });

    setInterval(() => {
      this.persist();
    }, WebsiteSheet.PersistInterval);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.persist(true);
      }
    });
  }

  protected persist(asBeacon = false) {
    if (Object.keys(this.changes).length == 0) {
      return;
    }

    const params: any = {
      cid: this.cid,
      data: JSON.stringify(this.changes),
    };

    const headers = {
      "X-Requested-With": "XMLHttpRequest",
    };

    if (this.getAuthKey()) {
      params["AuthKey"] = this.getAuthKey();
      headers["AuthKey"] = this.getAuthKey();
    }

    if (asBeacon) {
      const result = navigator.sendBeacon(
        this.multiUpdateUrl,
        this.objectToURLParams(params)
      );

      if (result) {
        console.info("Successfully saved sheet data");
      } else {
        console.error("Unable to save sheet data");
      }
    } else {
      fetch(this.multiUpdateUrl, {
        method: "POST",
        body: this.objectToURLParams(params),
        headers: headers,
      })
        .then((response) => {
          return response.json();
        })
        .then((res: any) => {
          console.info("Successfully saved sheet data");
        });
    }

    this.changes = {};
  }

  protected objectToURLParams = (params?: any): URLSearchParams => {
    if (params) {
      const clone: any = Object.assign({}, params);

      for (const i in clone) {
        if (clone[i] === null || clone[i] === undefined) {
          delete clone[i];
        }

        if (typeof clone[i] === "boolean") {
          clone[i] = clone[i] ? "true" : "false";
        }
      }

      return new URLSearchParams(clone);
    }

    return null;
  };

  public getAuthKey(): string | null {
    if (this.getConfiguration<boolean>("mobile")) {
      if (this.getConfiguration<string>("authKey")) {
        return this.getConfiguration<string>("authKey");
      }
    }

    return null;
  }

  public getConfiguration<T>(key: string): T | null {
    if (window["configuration"]?.[key]) {
      return window["configuration"]?.[key];
    }

    return null;
  }

  public generateRandomString(length: number) {
    return Math.random().toString(36).replace("0.", "").slice(-length);
  }

  protected getTree(): Tree {
    return container.get<Tree>("SystemTree");
  }

  protected getSkinLoader(): CharacterSkinLoader {
    return container.get<CharacterSkinLoader>(Services.CharacterSkinLoader);
  }

  protected getRollState(): RollState {
    return container.get<RollState>(Services.RollState);
  }

  protected getDiceExpressionHelper(): DiceExpressionHelper {
    return container.get<DiceExpressionHelper>(Services.DiceExpressionHelper);
  }
}

export enum RollMode {
  Virtual = "virtual",
  Offline = "offline",
}

const app = new WebsiteSheet();
