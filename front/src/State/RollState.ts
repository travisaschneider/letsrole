import { injectable } from "inversify";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { Konsole } from "../../shared/Konsole";
import { DiceResult } from "../../shared/DiceResult";

export interface RollCallback {
  callback: Function;
  sheet: CharacterSheet;
}

@injectable()
export class RollState {
  protected callbacks: Map<string, RollCallback> = new Map<
    string,
    RollCallback
  >();

  public addCallback(id: string, callback: RollCallback) {
    this.callbacks.set(id, callback);
  }

  public applyCallback(id: string, result: DiceResult) {
    if (this.callbacks.has(id)) {
      const fct: Function = this.callbacks.get(id).callback;

      try {
        fct.call(null, result);
      } catch (e) {
        Konsole.error("Error while applying roll builder callback.");
      }

      this.callbacks.delete(id);
    }
  }
}
