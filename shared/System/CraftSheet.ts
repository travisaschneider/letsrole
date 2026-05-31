import { CharacterSheet } from "./CharacterSheet";

export class CraftSheet extends CharacterSheet {
  protected persistEventName = "craft-persist";
  protected multiPersistEventName = "craft-multi-persist";

  public readonly type: string = "craft";

  public getContainerId(): string {
    if (this.containerId) {
      return this.containerId;
    }

    if (this.token) {
      return "craft-" + this.id + "-" + this.token.key;
    }

    return "craft-" + this.id;
  }

  protected initDragDrop(e: DragEvent, element: HTMLElement) {
    e.dataTransfer.setData("type", "sheet-element");
    e.dataTransfer.setData("path", element.dataset.widgetId);
    e.dataTransfer.setData("craftId", this.id.toString(10));
  }
}
