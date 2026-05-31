/// <reference path="../module.d.ts" />
import { parse } from "./grammar";
import { DiceBox } from "../View/Dice/DiceBox";
import { DiceResult } from "../../shared/DiceResult";
import { DiceVisibility, SingleDiceResult } from "../../shared/DiceData";
import { DiceCount, DiceRollerBuilder } from "../View/Dice/DiceRollerBuilder";
import {
  DiceDimension,
  DiceRoller,
  DiceRollerComparison,
  DiceRollerSide,
  DiceRollerVisibility,
  DiceRollFunction,
} from "../../shared/DiceRoller";

class MobileDiceRoller {
  protected static readonly MaxDice: number = 15;
  protected static readonly ClearTimeout: number = 120000;
  protected static readonly MaxValue: number = 999;
  protected static readonly MinValue: number = -999;

  protected formulaElement: HTMLInputElement;
  protected resultElement: HTMLElement;
  protected dice: DiceBox;
  protected canvas: HTMLCanvasElement;
  protected diceLoaded = false;
  protected clearTimeout: any;
  protected currentDice = 35;
  protected cid: number;
  protected tableId: string;

  public constructor() {
    this.formulaElement = document.getElementById(
      "formula"
    ) as HTMLInputElement;
    this.resultElement = document.getElementById("result");
    this.canvas = document.getElementById("dice") as HTMLCanvasElement;

    this.dice = new DiceBox(this.canvas, {
      w: window.innerWidth / 2,
      h: window.innerHeight / 2,
    });

    window["applyDiceSkin"] = this.applyDiceSkin.bind(this);

    /*document.getElementById("formula-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const formula: string = this.formulaElement.value.trim();

      if (formula !== "") {
        this.execute(formula);
      }
    });*/

    document
      .getElementById("dice-result")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.hide();
      });

    document
      .getElementById("dice")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.hide();
      });

    document
      .querySelector(".skin-btn")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.openSkinPicker();
      });

    document.querySelectorAll(".change-model").forEach((model: HTMLElement) => {
      model.addEventListener("click", (e) => {
        e.preventDefault();

        const id: number = parseInt(model.dataset.id, 10);
        const path: string = model.dataset.path;

        this.dice.loadDiceModel(
          id,
          "/assets/dice/" + path,
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
            this.diceLoaded = true;
            this.currentDice = id;
          }
        );
      });
    });

    let diceId = 35;
    let dicePath = "default.gltf";

    const params = new URL(document.location.toString()).searchParams;

    if (params.has("diceid") && params.has("dicepath")) {
      const path: string = params.get("dicepath");

      if (!path.includes("..") && !path.includes("/")) {
        dicePath = path;
        diceId = parseInt(params.get("diceid"), 10);
        this.currentDice = diceId;
      }
    }

    if (params.has("cid")) {
      this.cid = parseInt(params.get("cid"), 10);
    }

    if (params.has("tableId")) {
      this.tableId = params.get("tableId");
    }

    this.dice.loadDiceModel(
      diceId,
      "/assets/dice/" + dicePath,
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
        this.diceLoaded = true;
      }
    );

    this.init();
  }

  protected init() {
    let builder: DiceRollerBuilder = new DiceRollerBuilder();
    let source: DiceRoller = {
      visibility: DiceRollerVisibility.Visible,
      base: [],
    };
    let func: DiceRollFunction = null;
    let side: DiceRollerSide = DiceRollerSide.Base;

    const renderInput: HTMLInputElement =
      document.querySelector(".roll-render");

    const rollBtn: HTMLAnchorElement = document.querySelector(".roll");

    rollBtn.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();

      const formula: string = builder.renderFormula(source);
      this.execute(formula);
    });

    const apply = () => {
      builder.save(source);
      updateDiceCount();
      render();
    };

    const render = () => {
      renderInput.value = builder.renderFormula(source);
    };

    const updateValueInputClass = () => {
      valueInput.classList.remove("tiny", "small", "normal", "big");
      const val: number = parseInt(valueInput.value, 10);

      if (val >= -9 && val <= 9) {
        return valueInput.classList.add("big");
      }

      if (val < -9 && val > -100) {
        return valueInput.classList.add("small");
      }

      if (val <= -100) {
        return valueInput.classList.add("tiny");
      }

      if (val > 10) {
        return valueInput.classList.add("small");
      }
    };

    const clearValueInput = () => {
      valueInput.value = "0";
      updateValueInputClass();
    };

    const clearFunc = () => {
      func = null;

      document
        .querySelectorAll('a[data-action="func"]')
        .forEach((node: HTMLAnchorElement) => {
          node.classList.remove("active");
        });
    };

    const updateDiceCount = () => {
      const counts: DiceCount = builder.extractDiceCount(source, side);
      const cnt: HTMLElement = document.querySelector(".dice-grid");
      cnt
        .querySelectorAll(`[data-action="dice"] .count`)
        .forEach((counter: HTMLElement) => {
          counter.classList.remove("active");
          counter.textContent = "";
        });

      for (const dimension in counts) {
        const count: number = counts[dimension];

        if (count > 0) {
          const elt: HTMLElement = cnt.querySelector(
            `[data-action="dice"][data-value="${dimension}"] .count`
          );

          if (elt) {
            elt.textContent = count.toString(10);
            elt.classList.add("active");
          }
        }
      }
    };

    const updateValue = () => {
      updateValueInputClass();

      let val: number = parseInt(valueInput.value, 10);

      if (val < MobileDiceRoller.MinValue) {
        val = MobileDiceRoller.MinValue;
        valueInput.value = val.toString(10);
      }

      if (val > MobileDiceRoller.MaxValue) {
        val = MobileDiceRoller.MaxValue;
        valueInput.value = val.toString(10);
      }

      builder.addValue(source, side, val);
      apply();
    };

    const nodes: NodeListOf<HTMLAnchorElement> = document.querySelectorAll(
      ".node [data-action]"
    );

    const valueInput: HTMLInputElement =
      document.querySelector(".value-node input");

    valueInput.addEventListener("keyup", () => updateValue());
    valueInput.addEventListener("change", () => updateValue());

    nodes.forEach((node: HTMLAnchorElement) => {
      node.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        const action: NodeAction = node.dataset.action as NodeAction;

        switch (action) {
          case NodeAction.Dice: {
            const dimension: DiceDimension = parseInt(
              node.dataset.value,
              10
            ) as DiceDimension;

            builder.addDice(source, side, dimension, func);

            clearFunc();
            apply();
            break;
          }

          case NodeAction.Func: {
            const choosenFunc: DiceRollFunction = node.dataset
              .func as DiceRollFunction;

            if (choosenFunc === func) {
              clearFunc();
            } else {
              node.classList.add("active");
              func = choosenFunc;
            }

            break;
          }

          case NodeAction.Undo: {
            const previous: DiceRoller = builder.undo();

            if (previous === null) {
              source = {
                visibility: DiceRollerVisibility.Visible,
                base: [],
              };
            } else {
              source = previous;
            }

            apply();

            break;
          }

          case NodeAction.Clear: {
            source = {
              visibility: DiceRollerVisibility.Visible,
              base: [],
            };

            clearFunc();
            clearValueInput();

            side = DiceRollerSide.Base;
            builder = new DiceRollerBuilder();

            apply();

            break;
          }

          case NodeAction.Compare: {
            if (!source.comparison) {
              side = DiceRollerSide.Right;
              source[side] = [];
            }

            source.comparison = node.dataset.value as DiceRollerComparison;

            clearFunc();
            clearValueInput();
            apply();

            break;
          }

          case NodeAction.Value: {
            let val: number = parseInt(valueInput.value, 10);

            if (!Number.isInteger(val)) {
              val = 0;
            }

            const type: MoreLess = node.dataset.type as MoreLess;

            if (type === MoreLess.Less) {
              val--;
            } else {
              val++;
            }

            valueInput.value = val.toString(10);
            updateValue();

            break;
          }
        }
      });
    });

    apply();
  }

  protected execute(formula: string) {
    if (this.cid) {
      this.executeRemotely(formula);
    } else {
      this.executeLocally(formula);
    }
  }

  protected executeRemotely(formula: string) {
    const rollId: string = this.generateRandomString(16);

    const rollData = {
      rollId: rollId,
      tableId: this.tableId,
      expression: formula,
      cid: this.cid,
    };

    fetch(window["configuration"].rollUrl, {
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
        const result = response.roll.dice;
        this.throwDice(result, formula);
        this.displayResult(result);
      })
      .catch((e) => {
        console.error(e);
      });
  }

  protected generateRandomString(length: number) {
    return Math.random().toString(36).replace("0.", "").slice(-length);
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

  protected executeLocally(formula: string) {
    try {
      document.getElementById("dice-result").classList.add("fadeout");

      const result = parse(formula, {
        context: {
          rolled: 0,
          log: console.log,
          rng: (min: number, max: number) => {
            return this.getRandomIntInclusive(min, max);
          },
        },
      });

      this.throwDice(result, formula);
      this.displayResult(result);
    } catch (e) {
      console.error(e);
    }
  }

  protected getRandomIntInclusive(min: number, max: number): number {
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    const randomNumber = randomBuffer[0] / (0xffffffff + 1);

    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(randomNumber * (max - min + 1)) + min;
  }

  public displayResult(result: any) {
    setTimeout(() => {
      let text = "";

      if (result.type === "comparison") {
        text += result.success + " ";
        if (result.success > 1) {
          text += window.translations["successes"];
        } else {
          text += window.translations["success"];
        }
      } else {
        text += result.total;
      }

      const total: HTMLSpanElement = document.createElement("span");
      total.innerText = window.translations["Total"];
      total.classList.add("total-title");

      const res: HTMLSpanElement = document.createElement("span");
      res.innerText = text;

      document.getElementById("dice-result-total").innerHTML = "";
      document.getElementById("dice-result-total").append(total, res);
      document.getElementById("dice-result").classList.remove("fadeout");
    }, 1000);
  }

  public throwDice(result: any, formula: string) {
    const dices: string[] = [];
    const values: number[] = [];

    const diceResult: DiceResult = new DiceResult(
      result,
      formula,
      "default",
      DiceVisibility.Normal
    );

    diceResult.all.forEach(function (dice: SingleDiceResult) {
      const dice3d: number[] = [4, 6, 8, 10, 12, 20, 100];

      if (dice3d.indexOf(dice.dimension) < 0) {
        // not a normal dice
        return;
      }

      if (dice.dimension === 100) {
        dices.push("d100");
        dices.push("d10");

        if (dice.value === 100) {
          values.push(0);
          values.push(0);
        } else {
          values.push(Math.floor(dice.value / 10) * 10);
          values.push(dice.value % 10);
        }
      } else if (dice.dimension === 10) {
        dices.push("d" + dice.dimension.toString(10));

        if (dice.value == 10) {
          values.push(0);
        } else {
          values.push(dice.value);
        }
      } else {
        dices.push("d" + dice.dimension.toString(10));
        values.push(dice.value);
      }
    });

    this.throw(
      dices,
      values,
      () => {
        return;
      },
      this.currentDice
    );
  }

  public throw(
    dices: string[],
    result: number[],
    onRolled?: Function,
    skinId?: number
  ) {
    if (!dices.length || !this.diceLoaded) {
      return;
    }

    if (dices.length > MobileDiceRoller.MaxDice) {
      dices = dices.slice(0, MobileDiceRoller.MaxDice);
      result = result.slice(0, MobileDiceRoller.MaxDice);
    }

    this.show();

    const modelDices = [];
    const skinIdStr: string = skinId.toString(10);

    for (const i in dices) {
      modelDices.push("l_" + skinIdStr + "_" + dices[i]);
    }

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

    this.clearTimeout = setTimeout(() => {
      this.hide();
    }, MobileDiceRoller.ClearTimeout);
  }

  protected hide() {
    document.getElementById("dice").classList.add("fadeout");
    document.getElementById("dice-result").classList.add("fadeout");
    document.body.classList.remove("rolling");
  }

  protected show() {
    clearTimeout(this.clearTimeout);
    document.getElementById("dice").classList.remove("fadeout");
    document.body.classList.add("rolling");
  }

  protected async openSkinPicker() {
    const url = `/api/dice/skins/roller`;
    const headers = {
      AuthKey: window["configuration"].authKey,
    };

    const response: Response = await fetch(url, {
      headers: headers,
    });

    const html: string = await response.text();

    const picker: HTMLElement = document.querySelector(".dice-skin-picker");
    picker.innerHTML = html;
    picker.classList.add("active");

    const close = () => {
      picker.classList.remove("active");
    };

    picker
      .querySelector(".close-btn")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        close();
      });

    picker.querySelectorAll(".item-dice").forEach((item: HTMLElement) => {
      item.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        const id = parseInt(item.dataset.diceId, 10);
        const path = item.dataset.path;
        const owned: boolean = item.dataset.owned == "1";
        const revenuecat_product_id: string = item.dataset.catid;

        item.querySelector(".item-add-to-cart").textContent = "Loading...";

        if (owned) {
          this.applyDiceSkin(id, path);
          return close();
        } else {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              action: "buy-dice",
              revenuecat_product_id: revenuecat_product_id,
              id: id,
              path: path,
            })
          );

          setTimeout(close, 1000);
        }
      });
    });
  }

  protected applyDiceSkin(id: number, path: string) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          action: "change-dice",
          id: id,
          path: path,
        })
      );
    }

    this.dice.loadDiceModel(
      id,
      "/assets/dice/" + path,
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
        this.diceLoaded = true;
        this.currentDice = id;
      }
    );
  }

  protected escapeHTML(unsafeText: string) {
    const div = document.createElement("div");
    div.innerText = unsafeText;

    return div.innerHTML;
  }

  public static init() {
    return new MobileDiceRoller();
  }
}

enum NodeAction {
  Dice = "dice",
  Undo = "undo",
  Func = "func",
  Clear = "clear",
  Compare = "compare",
  Value = "value",
  Copy = "copy",
}

enum MoreLess {
  More = "more",
  Less = "less",
}

interface Skin {
  id: number;
  name: string;
  thumb_path: string;
  path: string;
}

type DiceSkin = Skin;

MobileDiceRoller.init();
