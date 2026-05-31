import { Expr } from "./Expr";
import { Konsole } from "../../../Konsole";

export class Dice extends Expr {
  private _count: any;
  private _dimension: any;

  public constructor(...args) {
    super();

    if (args.length < 1) {
      Konsole.error(
        "Not enough argument for dice construction. Resolving to 1d6"
      );

      this.count = 1;
      this.dimension = 6;
    }

    if (args.length === 1) {
      const dice: string = args[0];

      if (dice.match(/^(\d+)$/g) || dice.match(/^d(\d+)$/g)) {
        this.dimension = parseInt(dice, 10);
        this.count = 1;
      } else if (dice.match(/^(\d+)d(\d+)$/g)) {
        const parts = dice.split("d");
        this.count = parseInt(parts[0], 10);
        this.dimension = parseInt(parts[1], 10);
      } else {
        this.count = 1;
        this.dimension = 6;

        Konsole.error(`Invalid dice expression "${dice}"`);
      }
    } else {
      this.count = args[0];
      this.dimension = args[1];
    }
  }

  get count(): any {
    return this._count;
  }

  set count(value: any) {
    if (!(value instanceof Expr)) {
      value = parseInt(value.toString(), 10);
    }

    this._count = value;
  }

  get dimension(): any {
    return this._dimension;
  }

  set dimension(value: any) {
    if (!(value instanceof Expr)) {
      value = parseInt(value.toString(), 10);
    }

    this._dimension = value;
  }

  public toString(): string {
    return this.count.toString() + "d" + this.dimension.toString();
  }
}
