import { CharacterSheet } from "./CharacterSheet";
import { injectable } from "inversify";
import { SharedAdapter } from "./SharedAdapter";
import { View } from "./Component/View";
import { Repeater } from "./Component/Repeater";
import { CharacterSheetContext } from "./CodeExecutor/CharacterSheetContext";
import { DiceApi } from "./Api/DiceApi";
import { DiceBuilderApi } from "./Api/DiceBuilderApi";
import { CriticalHitType, DiceResult } from "../DiceResult";
import { Tree } from "./Tree";
import { DiceSheet } from "./DiceSheet";
import { CraftSheet } from "./CraftSheet";
import { Konsole } from "../Konsole";
import { BindingApi } from "./Api/BindingApi";
import { Translator } from "./Translator";
import { TablesContext } from "./CodeExecutor/TablesContext";
import { Tables } from "./Tables";
import { RollerApi } from "./Api/RollerApi";

@injectable()
export class CodeExecutor {
  protected js: string;
  protected binding: string;

  protected script: any;
  protected context: any;

  public setScript(js: string) {
    if (js == null) {
      js = "";
    }

    js = js.trim();

    if (js == "") {
      js = "// Empty script";
    }

    this.js = js;

    this.context = {
      log: function (vars) {
        Konsole.log(vars);
      },
      _: (message) => {
        try {
          return this.getTranslator().translate(message);
        } catch (e) {
          return message;
        }
      },
      wait: function (time, callback) {
        setTimeout(() => {
          callback();
        }, time);
      },
      Dice: DiceApi,
      DiceBuilder: DiceBuilderApi,
      JSON: {
        stringify: JSON.stringify,
        parse: JSON.parse,
      },
      RollBuilder: RollerApi,
      Bindings: BindingApi,
      Prompt: (title: string, view: string, callback: any) => {
        console.log("Deprecated : use sheet.prompt() insted of Prompt()");

        try {
          SharedAdapter.eventDispatcher.emit("character-prompt", {
            title: title,
            view: view,
            callback: callback,
            source: null,
          });
        } catch (e) {
          Konsole.error("An error happened during prompt");
        }
      },
      Tables: new TablesContext(this.getTables()),
      Math: Math,
      parseInt: (value: any) => {
        // eslint-disable-next-line use-isnan
        if (value === undefined || value === null || value == Number.NaN) {
          return 0;
        }

        if (typeof value === "number") {
          return Math.round(value);
        }

        return parseInt(value, 10);
      },
      init: null,
      initRoll: null,
      getCriticalHits: null,
      drop: null,
      dropDice: null,
      getReferences: null,
      getBarAttributes: null,
      each: (item: any, callback: Function) => {
        for (const i in item) {
          const res = callback(item[i], i);

          if (res === false) {
            break;
          }
        }
      },
    };

    try {
      console.log("=== Using JS Engine v1.3.3 ===");
      this.script = SharedAdapter.safeEval(this.js, this.context);
    } catch (e) {
      Konsole.error("An error occurred in the scripting", e);
    }
  }

  public hasCustomRoll(): boolean {
    return this.context.initRoll !== null;
  }

  public roll(result: DiceResult, container: HTMLElement) {
    if (!this.context.initRoll) {
      return;
    }

    const callback = (viewId: string, update: any) => {
      try {
        if (!this.getTree().hasViewSource(viewId)) {
          Konsole.log(`View ${viewId} not found for rendering dice roll`);
          return;
        }

        const sheet = new DiceSheet({}, this.getTree(), viewId, container.id);
        container.innerHTML = sheet.render();

        sheet.init();

        update(sheet.getSheetContext());
      } catch (e) {
        Konsole.error("An error happened during roll");
      }
    };

    try {
      this.context.initRoll(result, callback);
    } catch (e) {
      Konsole.error("An error happened during roll");
    }
  }

  public getCriticalHits(result: DiceResult) {
    if (!this.context.getCriticalHits) {
      return null;
    }

    try {
      const hits: any = this.context.getCriticalHits(result);

      if (typeof hits != "object") {
        return null;
      }

      for (const diceDimension in hits) {
        if (!/^-?\d+$/.test(diceDimension)) {
          delete hits[diceDimension];
          continue;
        }

        for (const type in hits[diceDimension]) {
          if (
            !Object.values(CriticalHitType).includes(type as CriticalHitType)
          ) {
            delete hits[diceDimension][type];
            continue;
          }

          const dice = hits[diceDimension][type];

          if (!Array.isArray(dice)) {
            delete hits[diceDimension][type];
            continue;
          }

          for (const i in hits[diceDimension][type]) {
            hits[diceDimension][type][i] = parseFloat(
              hits[diceDimension][type][i]
            );
          }
        }
      }

      return hits;
    } catch (e) {
      console.error(e);
      Konsole.error("An error occurred when getting critical and fumble hits");
    }
  }

  public getBarAttributes(sheet: CharacterSheet) {
    if (!this.context.getBarAttributes) {
      return {};
    }

    try {
      const attributes: any = this.context.getBarAttributes(
        sheet.getSheetContext()
      );

      if (typeof attributes != "object") {
        return {};
      }

      return attributes;
    } catch (e) {
      console.error(e);
      Konsole.error("An error occurred when getting bar attributes");
    }
  }

  public getReferences(sheet: CharacterSheet) {
    if (!this.context.getReferences) {
      return {};
    }

    try {
      return this.context.getReferences(sheet.getSheetContext());
    } catch (e) {
      Konsole.error("An error occurred when getting references");
    }
  }

  public dropDice(result: DiceResult, sheet: CharacterSheet) {
    if (!this.context.dropDice) {
      return;
    }

    try {
      this.context.dropDice(result, sheet.getSheetContext());
    } catch (e) {
      Konsole.error("An error happened during dice dropping");
    }
  }

  public drop(viewId: string, data: any, sheet: CharacterSheet) {
    if (this.context.drop == null) {
      return;
    }

    try {
      const source: CraftSheet = new CraftSheet(data, this.getTree(), viewId);

      const result = this.context.drop(
        source.getSheetContext(),
        sheet.getSheetContext()
      );

      if (result != null && typeof result === "string") {
        const content = sheet.getSheetItem(result);

        if (!content) {
          return;
        }

        if (!(content.component instanceof Repeater)) {
          return;
        }

        sheet.addToRepeater(content.path, data);
      }
    } catch (e) {
      Konsole.error("An error happened during craft drop");
    }
  }

  protected getTree(): Tree {
    return SharedAdapter.container.get("SystemTree");
  }

  protected getTables(): Tables {
    return SharedAdapter.container.get("SystemTables");
  }

  protected getTranslator(): Translator {
    return SharedAdapter.container.get("SystemTranslator");
  }

  public init(view: View, sheet: CharacterSheet) {
    try {
      if (this.context.init) {
        const c = new CharacterSheetContext(view, sheet);
        this.context.init(c);
      }
    } catch (e) {
      Konsole.error("An error occured during scripting init function", e);
    }
  }
}
