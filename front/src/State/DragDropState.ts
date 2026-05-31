import { injectable } from "inversify";
import DragEvent = JQuery.DragEvent;

export class DragDropEvent extends Event {
  data: any;
  clientX: number;
  clientY: number;
}

@injectable()
export class DragDropState {
  protected event: DragEvent;

  public bind(source: HTMLElement, data: any, dest: HTMLElement) {
    const isOver = false;

    source.addEventListener(
      "dragend",
      (e) => {
        if (!isOver) {
          return;
        }

        const event: DragDropEvent = new DragDropEvent("dragdrop");
        event.data = data;
        event.clientX = e.clientX;
        event.clientY = e.clientY;

        dest.dispatchEvent(event);
      },
      {
        once: true,
      }
    );
  }
}
