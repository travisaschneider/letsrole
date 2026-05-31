import { injectable } from "inversify";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";

@injectable()
export class CharacterState {
  protected _sheet: CharacterSheet;

  public get sheet(): CharacterSheet {
    return this._sheet;
  }

  public set sheet(sheet: CharacterSheet) {
    this._sheet = sheet;

    EventDispatcher.emit(Events.CHARACTER_SHEET_LOADED, {
      sheet: this.sheet,
    });
  }

  public isEnabled(): boolean {
    return this.sheet !== undefined;
  }

  public get color(): string {
    let color: string;

    if (this.isEnabled()) {
      color = this.sheet.getData("color");
    }

    if (!color) {
      color = "green";
    }

    return color;
  }
}
