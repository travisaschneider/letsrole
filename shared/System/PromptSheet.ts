import { CharacterSheet } from "./CharacterSheet";

export class PromptSheet extends CharacterSheet {
  protected persistEventName = "prompt-persist";

  public readonly type: string = "prompt";

  public getContainerId(): string {
    if (this.containerId) {
      return this.containerId;
    }

    return "prompt-" + this.id;
  }
}
