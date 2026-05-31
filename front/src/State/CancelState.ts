import { injectable } from "inversify";

@injectable()
export class CancelState {
  protected static readonly MaxStackSize: number = 50;
  protected stack: Function[] = [];

  public add(fct: Function): void {
    this.stack.push(fct);

    if (this.stack.length > CancelState.MaxStackSize) {
      this.stack.shift();
    }
  }

  public clear(): void {
    this.stack = [];
  }

  public cancel(): void {
    if (this.stack.length <= 0) {
      return;
    }

    const toCancel: Function = this.stack.pop();
    toCancel();
  }
}
