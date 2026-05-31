import { Expr } from "./Expr";

export class Tag extends Expr {
  public toString(): string {
    const base: any = this.elements.shift();

    return base.toString() + "[" + this.elements.join(",") + "]";
  }
}
