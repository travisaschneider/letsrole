import { CharacterSheet } from "../CharacterSheet";
import { SharedAdapter } from "../SharedAdapter";
import { DiceBuilderApi } from "./DiceBuilderApi";
import { RollerApi } from "./RollerApi";
import { CharacterSheetContext } from "../CodeExecutor/CharacterSheetContext";
import { Konsole } from "../../Konsole";

export const DiceApi = {
  roll: (
    sheet: CharacterSheet,
    expression: any,
    title?: string,
    visibility?: string,
    actions?: any
  ) => {
    const event = {
      sheet: sheet,
      expression: expression.toString(),
      title: title,
      actions: actions,
      visibility: visibility,
    };

    SharedAdapter.eventDispatcher.emit("roll", event);
  },
  create: (base: string) => {
    return new DiceBuilderApi(base);
  },
  build: (sheet: any) => {
    if (!(sheet instanceof CharacterSheetContext)) {
      Konsole.error("Dice.build expect a sheet as first argument");
      return;
    }

    return new RollerApi(sheet);
  },
};
