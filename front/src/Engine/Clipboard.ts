import { injectable } from "inversify";
import { SceneElement } from "./SceneElement";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { Stage } from "./Stage";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";

enum ClipboardMode {
  Copy = "copy",
  Cut = "cut",
}

interface MousePosition {
  x: number;
  y: number;
}

@injectable()
export class Clipboard {
  protected element: SceneElement;
  protected mode: ClipboardMode;
  protected position: MousePosition;

  public constructor() {
    document
      .getElementById("map")
      .addEventListener("mousemove", (e: MouseEvent) => {
        this.position = {
          x: e.clientX,
          y: e.clientY,
        };
      });
  }

  public copy(element: SceneElement) {
    this.element = element;
    this.mode = ClipboardMode.Copy;
  }

  public cut(element: SceneElement) {
    this.element = element;
    this.mode = ClipboardMode.Cut;
  }

  public paste() {
    if (!this.element) {
      return;
    }

    let position = this.position;

    if (!position) {
      position = this.element.getAbsolutePosition();
    } else {
      position = this.getStage().toLocalPosition(position.x, position.y);
    }

    EventDispatcher.emit(Events.SCENE_ITEM_PASTE, {
      item: this.element,
      position: position,
    });

    if (this.mode === ClipboardMode.Cut) {
      EventDispatcher.emit(Events.SCENE_ITEM_DELETE, {
        item: this.element,
      });
    }
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }
}
