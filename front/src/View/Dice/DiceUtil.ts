import { DiceResult } from "../../../shared/DiceResult";
import { SingleDiceResult } from "../../../shared/DiceData";

export interface DiceInfos {
  diceResult: DiceResult;
  dices: string[];
  values: number[];
}

export interface DieSkin {
  id: number;
  name: string;
  path: string;
}

export class DiceUtil {
  public static fromRequest(request: any): DiceInfos {
    const dices: string[] = [];
    const values: number[] = [];

    const diceResult: DiceResult = new DiceResult(
      request.dice,
      request.formula,
      request.name,
      request.visibility
    );

    request.result = diceResult;

    const addDice = (dice: SingleDiceResult) => {
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
    };

    diceResult.all.forEach(function (dice: SingleDiceResult) {
      const dice3d: number[] = [4, 6, 8, 10, 12, 20, 100];

      if (dice3d.indexOf(dice.dimension) < 0) {
        // not a normal dice
        return;
      }

      if (dice.value > dice.dimension) {
        // explosive dice : display 2+ dice for 1 result
        const count = Math.floor(dice.value / dice.dimension);
        const extra = dice.value % dice.dimension;

        for (let i = 0; i < count; i++) {
          const newDice: SingleDiceResult = {
            dimension: dice.dimension,
            value: dice.dimension,
            discarded: dice.discarded,
          };

          addDice(newDice);
        }

        const extraDice: SingleDiceResult = {
          dimension: dice.dimension,
          value: extra,
          discarded: dice.discarded,
        };

        addDice(extraDice);
      } else {
        addDice(dice);
      }
    });

    return {
      diceResult: diceResult,
      dices: dices,
      values: values,
    };
  }

  public static getCriticalType(
    criticals: any,
    dimension: number,
    value: number
  ): string | null {
    if (!criticals) {
      return;
    }

    const d: string = dimension.toString(10);

    if (!criticals[d]) {
      return null;
    }

    const dice = criticals[d];

    for (const type in dice) {
      for (const val of dice[type]) {
        if (parseFloat(val) == value) {
          return type;
        }
      }
    }

    return null;
  }
}
