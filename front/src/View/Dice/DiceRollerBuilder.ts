import {
  DiceDimension,
  DiceRoller,
  DiceRollerItemDice,
  DiceRollerItemNumber,
  DiceRollerItems,
  DiceRollerItemType,
  DiceRollerOperator,
  DiceRollerSide,
  DiceRollerVisibility,
  DiceRollFunction,
} from "../../../shared/DiceRoller";

export class DiceRollerBuilder {
  protected static readonly HistorySize: number = 64;

  protected history: Array<DiceRoller> = [];

  public extractDiceCount(source: DiceRoller, side: DiceRollerSide): DiceCount {
    const count: DiceCount = {};

    if (!source[side]) {
      return count;
    }

    source[side].forEach((dice: DiceRollerItemDice) => {
      if (dice.type === DiceRollerItemType.Dice) {
        count[dice.dimension] = dice.count;
      }
    });

    return count;
  }

  public save(source: DiceRoller) {
    this.history.push(JSON.parse(JSON.stringify(source)));
    this.history = this.history.slice(-DiceRollerBuilder.HistorySize);
  }

  public undo(): DiceRoller {
    if (!this.history.length) {
      return null;
    }

    this.history.pop();

    if (!this.history.length) {
      return null;
    }

    return this.history.pop();
  }

  public addValue(
    source: DiceRoller,
    side: DiceRollerSide,
    value: number
  ): DiceRoller {
    let entries: DiceRollerItems = source[side];

    if (!entries) {
      entries = [];
    }

    let replaced = false;

    for (const entry of entries) {
      if (entry.type === DiceRollerItemType.Number) {
        replaced = true;
        entry.value = Math.abs(value);
        entry.operator =
          value >= 0 ? DiceRollerOperator.Plus : DiceRollerOperator.Minus;
      }
    }

    if (!replaced) {
      entries.push({
        type: DiceRollerItemType.Number,
        value: Math.abs(value),
        operator:
          value >= 0 ? DiceRollerOperator.Plus : DiceRollerOperator.Minus,
      });
    }

    return source;
  }

  public addDice(
    source: DiceRoller,
    side: DiceRollerSide,
    dimension: DiceDimension,
    func?: DiceRollFunction
  ): DiceRoller {
    let entries: DiceRollerItems = source[side];

    if (!entries) {
      entries = [];
    }

    let append = false;

    for (const entry of entries) {
      if (entry.type === DiceRollerItemType.Dice) {
        const dim: DiceDimension = entry.dimension;

        if (dim === dimension) {
          entry.count++;
          append = true;

          if (func) {
            entry.func = func;
          }

          break;
        }
      }
    }

    if (!append) {
      const dice: DiceRollerItemDice = {
        dimension: dimension,
        count: 1,
        type: DiceRollerItemType.Dice,
      };

      if (func) {
        dice.func = func;
      }

      entries.push(dice);
    }

    return source;
  }

  public renderFormula(source: DiceRoller): string {
    const result: string[] = [];

    const render = (): string => {
      return result.join(" ");
    };

    const renderItem = (
      item: DiceRollerItemDice | DiceRollerItemNumber
    ): string => {
      if (item.type === DiceRollerItemType.Dice) {
        const d: string = item.count + "d" + item.dimension;

        if (item.func) {
          return `${item.func}(${d})`;
        }

        return d;
      } else {
        return item.value.toString(10);
      }
    };

    const renderSide = (side: DiceRollerSide) => {
      source[side].forEach(
        (item: DiceRollerItemDice | DiceRollerItemNumber, index: number) => {
          let res: string = renderItem(item);

          if (index === 0 && item.operator !== DiceRollerOperator.Minus) {
            // no operator
          } else {
            let operator = "+";
            let space = " ";

            if (item.operator === DiceRollerOperator.Minus) {
              operator = "-";
            }

            if (index === 0) {
              space = "";
            }

            res = `${operator}${space}${res}`;
          }

          result.push(res);
        }
      );

      if (side === DiceRollerSide.Right && source[side].length === 0) {
        result.push("0");
      }
    };

    renderSide(DiceRollerSide.Base);

    if (source.comparison) {
      result.push(source.comparison);
      renderSide(DiceRollerSide.Right);
    }

    return render();
  }

  public render(source: DiceRoller): string {
    const result: string[] = [];

    const render = (): string => {
      return result.join(" ");
    };

    switch (source.visibility) {
      case DiceRollerVisibility.Visible:
        result.push("/r");
        break;
      case DiceRollerVisibility.Gm:
        result.push("/gr");
        break;
      case DiceRollerVisibility.GmOnly:
        result.push("/gor");
        break;
    }

    if (!source.base.length) {
      return render();
    }

    result.push(this.renderFormula(source));

    return render();
  }
}

export interface DiceCount {
  [dimension: number]: number;
}
