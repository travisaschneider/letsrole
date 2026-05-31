import { injectable } from "inversify";

@injectable()
export class KeyboardState {
  protected shiftDown = false;
  protected altDown = false;

  public isShiftDown(): boolean {
    return this.shiftDown;
  }

  public isAltDown(): boolean {
    return this.altDown;
  }

  public constructor() {
    this.init();
  }

  protected init(): void {
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      this.shiftDown = e.shiftKey;
      this.altDown = e.altKey;
    });

    document.addEventListener("keyup", (e: KeyboardEvent) => {
      if (this.shiftDown && !e.shiftKey) {
        this.shiftDown = e.shiftKey;
      }

      if (this.altDown && !e.altKey) {
        this.altDown = e.altKey;
      }
    });
  }
}
