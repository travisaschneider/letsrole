export abstract class Expr {
  public abstract toString(): string;

  protected elements: any[] = [];

  public constructor(...args) {
    args.forEach((arg: any) => {
      this.add(arg);
    });
  }

  public add(element: any): Expr {
    this.elements.push(element);

    return this;
  }

  public removeAt(index: number): Expr {
    this.elements.splice(index, 1);

    return this;
  }
}
