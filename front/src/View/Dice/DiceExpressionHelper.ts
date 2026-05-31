import { injectable } from "inversify";

@injectable()
export class DiceExpressionHelper {
  protected helpers: DiceFunctionHelper[] = [
    {
      detect: "\\[",
      name: "Tag",
      description: "An indicator of the type of roll, which you can ignore",
    },
    {
      detect: "round",
      name: "round",
      description: "Round to the closest integer",
    },
    {
      detect: "ceil",
      name: "ceil",
      description: "Round up to the closest integer",
    },
    {
      detect: "floor",
      name: "floor",
      description: "Round down to the closest integer",
    },
    {
      detect: "keeph",
      name: "keeph",
      description: "Keep only the highest value(s)",
    },
    {
      detect: "keepl",
      name: "keepl",
      description: "Keep only the lowest value(s)",
    },
    {
      detect: "adv",
      name: "adv",
      description: "Advantage : keep only the highest value",
    },
    {
      detect: "disadv",
      name: "disadv",
      description: "Disadvantage : keep only the lowest value",
    },
    {
      detect: "remh",
      name: "remh",
      description: "Discard the highest value(s)",
    },
    {
      detect: "reml",
      name: "reml",
      description: "Discard the lowest value(s)",
    },
    {
      detect: "min",
      name: "min",
      description: "Keep only the lowest value listed",
    },
    {
      detect: "max",
      name: "max",
      description: "Keep only the highest value listed",
    },
    {
      detect: "expladd",
      name: "expladd",
      description:
        "Explosive dice (add the exploded value to the current dice)",
    },
    {
      detect: "expln",
      name: "expln",
      description:
        "Explosive dice (add the exploded value to the current dice)",
    },
    {
      detect: "expl",
      name: "expl",
      description: "Explosive dice (add new dice)",
    },
    {
      detect: "mul",
      name: "mul",
      description: "Multiply only the dice size by the second argument",
    },
    {
      detect: "reroll",
      name: "reroll",
      description: "Roll again for specified values",
    },
  ];

  public extract(expression: string): DiceFunctionHelper[] {
    const fcts: DiceFunctionHelper[] = [];

    this.helpers.forEach((helper: DiceFunctionHelper) => {
      const expr = `\\b${helper.detect}\\b`;
      const regex = new RegExp(expr, "gm");

      if (expression.match(regex)) {
        fcts.push(helper);
      }
    });

    return fcts;
  }
}

export interface DiceFunctionHelper {
  detect: string;
  name: string;
  description: string;
}
