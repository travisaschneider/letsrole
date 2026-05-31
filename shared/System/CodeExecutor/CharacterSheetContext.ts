import { View } from "../Component/View";
import { Component } from "../Component/Component";
import { ComponentContext } from "./ComponentContext";
import { CharacterSheet } from "../CharacterSheet";
import { Konsole } from "../../Konsole";
import { SharedAdapter } from "../SharedAdapter";

export function CharacterSheetContext(view: View, sheet: CharacterSheet) {
  this.id = () => {
    return view.id;
  };

  this.name = () => {
    return view.name;
  };

  this.properName = () => {
    return sheet.name;
  };

  this.getVariable = (id: string) => {
    return sheet.referencer.renderItem("$" + id);
  };

  this.getSheetId = () => {
    return sheet.id;
  };

  this.getSheetType = () => {
    return sheet.type;
  };

  this.getData = () => {
    return sheet.getAllData();
  };

  this.prompt = (
    title: string,
    view: string,
    callback: any,
    initCallback: any = null
  ) => {
    try {
      SharedAdapter.eventDispatcher.emit("character-prompt", {
        title: title,
        view: view,
        callback: callback,
        source: sheet,
        init: initCallback,
      });
    } catch (e) {
      Konsole.error("An error happened during prompt");
    }
  };

  this.setData = (data: any) => {
    try {
      const keys = Object.keys(data);

      if (keys.length > 20) {
        Konsole.error("You cannot set more than 20 values with setData()");
        return;
      }

      sheet.multiPersist(data);

      for (const key in data) {
        sheet.update(key, data[key]);
      }
    } catch (e) {
      Konsole.error("Unable to setData()");
    }
  };

  this.get = (path: string) => {
    const component: Component = view.find(path);

    if (!component) {
      Konsole.error(`Component ${path} not found`);
      return null;
    }

    return new ComponentContext(view, sheet, path);
  };
}
