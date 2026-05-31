import { Expr } from "./Expr";

export abstract class MathExpr extends Expr {
  protected abstract readonly symbol: string;

  public toString(): string {
    const strings: string[] = this.elements.map((element) => {
      if (Number.isFinite(element) && element < 0) {
        return "(" + element.toString() + ")";
      }

      return element.toString();
    });

    return "(" + strings.join(" " + this.symbol + " ") + ")";
  }
}
