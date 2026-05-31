/// <reference path="../module.d.ts" />
import { parse } from "./grammar";
import { DiceBox } from "../View/Dice/DiceBox";
import { DiceResult } from "../../shared/DiceResult";
import { DiceVisibility, SingleDiceResult } from "../../shared/DiceData";
import { DiceTagEventDispatcher } from "../Event/DiceTagEventDispatcher";

class LiveDiceDemo {
  protected static readonly MaxDice: number = 15;
  protected static readonly ClearTimeout: number = 7000;

  protected dice: DiceBox;
  protected canvas: HTMLCanvasElement;
  protected diceLoaded = false;
  protected clearTimeout: any;

  public constructor() {
    this.canvas = document.getElementById("dice") as HTMLCanvasElement;

    this.dice = new DiceBox(this.canvas, {
      w: window.innerWidth / 2,
      h: window.innerHeight / 2,
    });
  }

  public roll(url) {
    this.loadDice(url).then(() => {
      this.execute("2d20 + 3d6 + 1d8 + 1d100 + 1d12 + 1d4");
    });
  }

  protected loadDice(url: string): Promise<boolean> {
    return new Promise<boolean>((resolve: Function, reject: Function) => {
      this.dice.loadDiceModel(
        1,
        url,
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

          return resolve(true);
        }
      );
    });
  }

  protected execute(formula: string) {
    const result = parse(formula, {
      context: {
        rolled: 0,
        log: console.log,
        rng: (min, max) => {
          return Math.floor(Math.random() * (max - min + 1)) + min;
        },
      },
    });

    this.throwDice(result, formula);
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
      1
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

    if (dices.length > LiveDiceDemo.MaxDice) {
      dices = dices.slice(0, LiveDiceDemo.MaxDice);
      result = result.slice(0, LiveDiceDemo.MaxDice);
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
    }, LiveDiceDemo.ClearTimeout);
  }

  protected hide() {
    $(this.canvas).addClass("fadeout");
  }

  protected show() {
    clearTimeout(this.clearTimeout);
    $(this.canvas).removeClass("fadeout");
  }

  protected escapeHTML(unsafeText: string) {
    const div = document.createElement("div");
    div.innerText = unsafeText;

    return div.innerHTML;
  }

  public static init() {
    return new LiveDiceDemo();
  }
}

window.LiveDemo = LiveDiceDemo.init();
