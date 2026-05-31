import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";

export class GlobalLoader {
  protected static count = 0;

  public static init(): void {
    EventDispatcher.on(Events.LOADING_START, () => this.onLoadingStart());
    EventDispatcher.on(Events.LOADING_END, () => this.onLoadingEnd());
  }

  public static reset(): void {
    this.count = 0;
    this.update();
  }

  protected static onLoadingStart() {
    this.count++;
    this.update();
  }

  protected static onLoadingEnd() {
    this.count--;

    if (this.count < 0) {
      this.count = 0;
    }

    this.update();
  }

  protected static update() {
    if (this.count > 0) {
      document.getElementById("loading").style.display = "block";
    } else {
      document.getElementById("loading").style.display = "none";
    }
  }
}
