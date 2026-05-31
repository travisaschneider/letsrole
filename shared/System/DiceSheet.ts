import { CharacterSheet } from "./CharacterSheet";

export class DiceSheet extends CharacterSheet {
  protected persistEventName = "dice-persist";

  public getContainerId(): string {
    return this.containerId;
  }
}
