import { CharacterSheet } from "./CharacterSheet";

export class BookCraftSheet extends CharacterSheet {
  protected persistEventName = "book-craft-persist";
  protected multiPersistEventName = "book-craft-multi-persist";

  public readonly type: string = "book-craft";

  public getContainerId(): string {
    if (this.containerId) {
      return this.containerId;
    }

    return "book-craft-" + this.id;
  }
}
