import { Expr } from "./Expr";

export abstract class FunctionExpr extends Expr {
  protected abstract readonly function: string;

  public toString(): string {
    const elts = this.elements.map((element: any) => {
      return element.toString();
    });

    return this.function + "(" + elts.join(", ") + ")";
  }
}
