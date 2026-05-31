import { Emitter } from "./Emitter";
import { injectable } from "inversify";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events, RollEvent } from "../Event/Events";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { container } from "../DependencyInjection/Container";
import { Repository } from "../DependencyInjection/Repository";
import { DiceView } from "../View/DiceView";
import { Views } from "../DependencyInjection/Views";
import { CharacterState } from "../State/CharacterState";
import { States } from "../DependencyInjection/State";
import { Binding } from "../../shared/System/Binding";
import { Services } from "../DependencyInjection/Services";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { Table } from "../../shared/System/Table/Table";
import { CraftRepository } from "../Repository/CraftRepository";
import { RollCallback, RollState } from "../State/RollState";
import { SceneState } from "../State/SceneState";
import { SceneData } from "../../shared/Scene/SceneData";
import { QuickBarIcon } from "../../shared/QuickBarData";
import { DiceIcon } from "../../shared/DiceData";

@injectable()
export class ChatEmitter extends Emitter {
  protected commands: Map<string, Function> = new Map<string, Function>();

  public init() {
    EventDispatcher.on(Events.CHAT_SAY, (e) => this.send(e));
    EventDispatcher.on(Events.TABLE_RANDOM, (e) => this.tableRandom(e));

    this.commands.set("roll", this.roll);
    this.commands.set("r", this.roll);
    this.commands.set("gr", this.gmroll);
    this.commands.set("gmroll", this.gmroll);
    this.commands.set("gor", this.gmonlyroll);
    this.commands.set("gmonlyroll", this.gmonlyroll);
    this.commands.set("me", this.me);
    this.commands.set("gm", this.gm);
    this.commands.set("dice", this.dice);
    this.commands.set("xcard", this.xCard);
    this.commands.set("x-card", this.xCard);
    this.commands.set("dlscene", this.downloadScene);

    EventDispatcher.on("roll-builder", async (e) => {
      let cid: number = null;
      let craftId: number = null;
      const builder = e.builder;
      let expression = builder.expression();
      const sheet = e.sheet;
      let realSheet: CharacterSheet = null;

      if (typeof expression == "object") {
        expression = expression.toString();
      }

      if (sheet.type) {
        if (sheet.type === "character") {
          cid = sheet.id;
        } else if (sheet.type === "craft") {
          craftId = sheet.id;
        }
      } else if (sheet["getSheetType"] !== null) {
        if (sheet.getSheetType() == "character") {
          cid = sheet.getSheetId();
        } else {
          craftId = sheet.getSheetId();
        }
      }

      if (cid) {
        const sheet: CharacterSheet = await this.getCharacterRepository().get(
          cid
        );

        if (sheet) {
          realSheet = sheet;
        }
      }

      if (craftId) {
        cid = null;

        const craft = this.getCraftRepository().findCachedDirect(craftId);

        if (craft) {
          realSheet = craft.sheet;
        }
      }

      if (realSheet) {
        expression = realSheet.referencer.renderRoll(expression);
      }

      let callback: RollCallback = null;

      if (builder.onRoll()) {
        callback = {
          sheet: realSheet,
          callback: builder.onRoll(),
        };
      }

      if (expression) {
        this.doRoll(
          expression,
          cid,
          craftId,
          builder.title(),
          builder.actions(),
          builder.visibility(),
          builder.icon(),
          callback
        );
      }
    });

    EventDispatcher.on("roll", async (e: RollEvent) => {
      let cid = e.cid !== undefined ? e.cid : null;
      let craftId = null;
      let expression = e.expression;
      let realSheet: CharacterSheet = null;
      const icon: DiceIcon = e.icon;

      if (e.sheet) {
        const sheet = e.sheet;

        if (sheet.type) {
          if (sheet.type === "character") {
            cid = sheet.id;
          } else if (sheet.type === "craft") {
            craftId = sheet.id;
          }
        } else {
          const otherSheet: any = sheet;

          if (otherSheet["getSheetType"] !== null) {
            if (otherSheet.getSheetType() == "character") {
              cid = otherSheet.getSheetId();
            } else {
              craftId = otherSheet.getSheetId();
            }
          }
        }
      }

      if (cid) {
        const sheet: CharacterSheet = await this.getCharacterRepository().get(
          cid
        );

        if (sheet) {
          realSheet = sheet;
        }
      }

      if (craftId) {
        cid = null;

        const craft = this.getCraftRepository().findCachedDirect(craftId);

        if (craft) {
          realSheet = craft.sheet;
        }
      }

      if (realSheet) {
        expression = realSheet.referencer.renderRoll(expression);

        if (!icon) {
          e.icon = realSheet.getTemporaryRollIcon();
        }
      }

      if (expression !== undefined) {
        this.doRoll(
          expression,
          cid,
          craftId,
          e.title,
          e.actions,
          e.visibility ? e.visibility : "visible",
          e.icon
        );
      }
    });

    EventDispatcher.on("send-binding", async (e) => {
      const cid = e.sheet._getInternalId();
      const name: string = e.name;

      const binding = this.getBinding().find(name);

      if (!binding) {
        return;
      }

      const sheet: CharacterSheet = await this.getCharacterRepository().get(
        cid
      );

      if (!sheet) {
        return;
      }

      const character: any = sheet.character;

      const transformed = {
        name: binding.name,
        view: binding.view.id,
        data: binding.data(character.data),
      };

      EventDispatcher.emit(Events.CHAT_SAY, {
        text: "[" + binding.name + "]",
        bindings: [transformed],
      });
    });
  }

  protected xCard(expression: string) {
    if (!expression) {
      expression = "";
    }

    expression = expression.trim();

    if (expression == "") {
      expression = null;
    }

    this.getClient().send("chat", "xcard", {
      reason: expression,
    });
  }

  protected dice(model: string) {
    const $t = window["$t"];

    $t.dice.load_dice_model(
      "/img/3d/" + model,
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
        return true;
      }
    );
  }

  protected tableRandom(e) {
    const table: Table = e.table;
    const callback: Function = e.callback;

    this.getClient().get(
      "dice",
      "random",
      {
        dimension: e.dimension,
        count: e.count,
      },
      (response) => {
        const idx: number[] = response.indexes;
        const lines: any[] = [];

        for (const i in idx) {
          const x: number = idx[i];
          const line = table.getAtIndex(x);
          lines.push(line);
        }

        if (e.count <= 1) {
          callback(lines[0]);
        } else {
          callback(lines);
        }
      }
    );
  }

  protected doRoll(
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

    const rollId: string = this.generateRandomString(16);

    if (callback != null) {
      this.getRollState().addCallback(rollId, callback);
    }

    this.getClient().get(
      "dice",
      "roll",
      {
        rollId: rollId,
        expression: expression,
        cid: characterId == null ? null : characterId,
        craftId: craftId,
        title: title,
        visibility: visibility,
        icon: icon,
      },
      (response) => {
        response.actions = actions;

        this.getDiceView().fromRequest(response);
      }
    );
  }

  public async roll(
    expression: string,
    visibility = "visible",
    title: string = null
  ) {
    const sheet: CharacterSheet = await this.getCurrentCharacter();
    let characterId: number = null;
    let icon: DiceIcon = null;

    if (sheet) {
      const character: any = sheet.character;

      if (character) {
        characterId = character.id;
        expression = sheet.referencer.renderRoll(expression);
      }

      icon = sheet.getTemporaryRollIcon();
    }

    if (Array.isArray(title)) {
      title = title.join(" ");
    }

    this.doRoll(
      expression,
      characterId,
      null,
      title,
      null,
      visibility ? visibility : "visible"
    );
  }

  protected gmroll(expression: string) {
    this.roll(expression, "gm");
  }

  protected gmonlyroll(expression: string) {
    this.roll(expression, "gmonly");
  }

  protected me(message: string, toId: number = null, bindings: any[] = []) {
    this.getClient().send("chat", "all", {
      message: message,
      bindings: Array.isArray(bindings) ? bindings : [],
      toId: toId,
      me: true,
    });
  }

  protected gm(message: string, bindings: any[] = []) {
    this.getClient().send("chat", "gm", {
      message: message,
      bindings: Array.isArray(bindings) ? bindings : [],
      me: false,
    });
  }

  protected say(message: string, toId: number = null, bindings: any[] = []) {
    this.getClient().send("chat", "all", {
      message: message,
      bindings: Array.isArray(bindings) ? bindings : [],
      toId: toId,
    });
  }

  protected send(event: any) {
    const text = event.text;

    let bindings = [];

    if (event.bindings !== undefined && Array.isArray(event.bindings)) {
      bindings = event.bindings;
    }

    let command: Function = null;
    let message: string = null;

    this.commands.forEach((fct: Function, key: string) => {
      if (command) {
        return;
      }

      key = "/" + key;

      if (text.startsWith(key)) {
        message = text.substring(key.length).trim();
        command = fct;
      }
    });

    if (command) {
      command.call(this, message, event.toId, bindings);
      return;
    }

    // default behavior
    this.say(text, event.toId, bindings);
  }

  protected downloadScene() {
    const slugify = (text) =>
      text
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-");

    const title: string = this.getSceneState().scene.name;
    const data: SceneData = this.getSceneState().scene.data;

    const json: string = JSON.stringify(
      data,
      (key: string, value) => {
        if (key === "node") {
          return null;
        }

        return value;
      },
      2
    );

    const dataString: string =
      "data:text/json;charset=utf-8," + encodeURIComponent(json);

    const a: HTMLAnchorElement = document.createElement("a");
    a.href = dataString;
    a.download = slugify(title ?? "untitled") + ".json";

    document.body.append(a);
    a.click();
    a.remove();
  }

  protected getCurrentCharacter(): Promise<CharacterSheet> {
    const state: CharacterState = this.getCharacterState();

    if (state.isEnabled()) {
      return Promise.resolve(state.sheet);
    }

    return null;
  }

  protected generateRandomString(length: number) {
    return Math.random().toString(36).replace("0.", "").slice(-length);
  }

  protected getCraftRepository(): CraftRepository {
    return container.get<CraftRepository>(Repository.Craft);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }

  protected getCharacterRepository(): CharacterRepository {
    return container.get<CharacterRepository>(Repository.CharacterRepository);
  }

  protected getCharacterState(): CharacterState {
    return container.get<CharacterState>(States.Character);
  }

  protected getDiceView(): DiceView {
    return container.get<DiceView>(Views.Dice);
  }

  protected getBinding(): Binding {
    return container.get<Binding>(Services.SystemBinding);
  }

  protected getRollState(): RollState {
    return container.get<RollState>(States.Roll);
  }
}
