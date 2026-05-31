/// <reference path="../module.d.ts" />
import { parse } from "./grammar";
import { DiceBox } from "../View/Dice/DiceBox";
import { DiceResult } from "../../shared/DiceResult";
import { DiceVisibility, SingleDiceResult } from "../../shared/DiceData";

class DiceTester {
  protected static readonly MaxDice: number = 15;
  protected static readonly ClearTimeout: number = 4800;

  protected formulaElement: HTMLInputElement;
  protected resultElement: HTMLElement;
  protected dice: DiceBox;
  protected canvas: HTMLCanvasElement;
  protected diceLoaded = false;
  protected clearTimeout: any;
  protected diceId = 35;

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

    document.getElementById("formula-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const formula: string = this.formulaElement.value.trim();

      if (formula !== "") {
        this.execute(formula);
      }
    });

    document.querySelectorAll("code").forEach((code: HTMLElement) => {
      code.addEventListener("click", (e) => {
        const formula: string = code.innerText;
        this.formulaElement.value = formula;
        this.formulaElement.scrollIntoView();
        this.execute(formula);
      });
    });

    this.dice.loadDiceModel(
      35,
      "/assets/dice/default.gltf",
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

    const source = new EventSource("/sse-endpoint");

    source.addEventListener("message", (message) => {
      const content = JSON.parse(message.data);
      this.formulaElement.value = content.formula;

      this.dice.loadDiceModel(
        content.dice.id,
        "/assets/dice/" + content.dice.path,
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
          this.diceId = content.dice.id;
          this.execute(content.formula);
        }
      );
    });
  }

  protected execute(formula: string) {
    try {
      const result = parse(formula, {
        context: {
          rolled: 0,
          log: console.log,
          rng: (min, max) => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
          },
        },
      });

      const meta: any[] = [];
      const tags: string[] = this.extractTags(result);

      if (result.type === "comparison") {
        meta.push({
          name: "Successes",
          value: result.success,
        });

        meta.push({
          name: "Failures",
          value: result.failure,
        });
      } else {
        meta.push({
          name: "Total",
          value: result.total,
        });
      }

      meta.push({
        name: "Type",
        value: result.type,
      });

      meta.push({
        name: "Tags",
        value: tags.length ? this.escapeHTML(tags.join(", ")) : "none",
      });

      let html = "";

      const dices = this.extractDices(result);
      const discardeds = this.extractDiscarded(result);

      const displayDice = (dice) => {
        let className = "dice";

        if (dice[1] === 1) {
          className += " fumble";
        } else if (dice[1] >= dice[0]) {
          className += " crit";
        }

        html +=
          '<span class="' +
          className +
          '"><i class="fas fa-dice-d' +
          dice[0] +
          '"></i> ' +
          dice[1] +
          "</span>";
      };

      if (dices.length) {
        html += '<div class="dice-list">';
        dices.forEach(displayDice);
        html += "</div>";
      }

      if (discardeds.length) {
        html += '<div class="dice-discarded-list">';
        discardeds.forEach(displayDice);
        html += "</div>";
      }

      meta.forEach((meta: any) => {
        html += `<div><strong>${meta.name}</strong> : ${meta.value}</div>`;
      });

      html +=
        '<div><a href="#" id="tree-btn">View the full parsing tree</a><div class="tree d-none">' +
        this.generateTree(result) +
        "</div></div>";

      this.resultElement.innerHTML = html;

      document.getElementById("tree-btn").addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelector(".tree").classList.remove("d-none");
      });

      this.throwDice(result, formula);
    } catch (e) {
      this.resultElement.innerHTML = `<p class="text-danger"><strong>An error occured : </strong><br>${e.message}</p>`;
      throw e;
    }
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
      this.diceId
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

    if (dices.length > DiceTester.MaxDice) {
      dices = dices.slice(0, DiceTester.MaxDice);
      result = result.slice(0, DiceTester.MaxDice);
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
    }, DiceTester.ClearTimeout);
  }

  protected hide() {
    $(this.canvas).addClass("fadeout");
  }

  protected show() {
    clearTimeout(this.clearTimeout);
    $(this.canvas).removeClass("fadeout");
  }

  protected generateTree(result: any): string {
    let tree = "";

    tree += "<ul>";

    tree += `<li>`;
    tree += `<strong>${result.type}</strong> : `;

    if (result.type === "number") {
      tree += result.total;
    } else if (result.type === "dice") {
      tree += result.size + "d" + result.dimension;
    } else if (result.type === "comparison") {
      tree += result.success + " successes, " + result.failure + " failures";
    }

    if (result.tags && result.tags.length) {
      tree += ", tags : [" + this.escapeHTML(result.tags.join(", ")) + "]";
    }

    if (result.children && result.children.length) {
      result.children.forEach((child: any) => {
        tree += this.generateTree(child);
      });
    }

    tree += `</li>`;
    tree += "</ul>";

    return tree;
  }

  protected extractDices(result: any) {
    const dices: any[] = [];

    if (result.type === "dice") {
      result.values.forEach((value) => {
        dices.push([result.dimension, value]);
      });
    }

    if (result.children) {
      result.children.forEach((child) => {
        const sub = this.extractDices(child);

        sub.forEach((dice) => {
          dices.push(dice);
        });
      });
    }

    return dices;
  }

  protected extractDiscarded(result: any) {
    const dices: any[] = [];

    if (result.type === "dice") {
      result.discarded.forEach((value) => {
        dices.push([result.dimension, value]);
      });
    }

    if (result.children) {
      result.children.forEach((child) => {
        const sub = this.extractDiscarded(child);

        sub.forEach((dice) => {
          dices.push(dice);
        });
      });
    }

    return dices;
  }

  protected extractTags(result: any): string[] {
    const tags: string[] = [];

    if (Array.isArray(result.tags)) {
      result.tags.forEach((value) => {
        tags.push(value);
      });
    }

    if (Array.isArray(result.children) && result.children.length) {
      result.children.forEach((child) => {
        const sub = this.extractTags(child);

        sub.forEach((tag) => {
          tags.push(tag);
        });
      });
    }

    return tags;
  }

  protected escapeHTML(unsafeText: string) {
    const div = document.createElement("div");
    div.innerText = unsafeText;

    return div.innerHTML;
  }

  public static init() {
    return new DiceTester();
  }
}

DiceTester.init();
