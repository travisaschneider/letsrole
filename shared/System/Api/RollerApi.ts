import { DiceBuilderApi } from "./DiceBuilderApi";
import { SharedAdapter } from "../SharedAdapter";

export function RollerApi(args) {
  let expression: string | DiceBuilderApi;
  let title: string;
  let visibility = "visible";
  const actions: any = {};
  let callback: Function = null;
  const sheet = args[0];

  if (!sheet) {
    throw "Please provide a sheet instance in the roll builder constructor.";
  }

  this.roll = () => {
    SharedAdapter.eventDispatcher.emit("roll-builder", {
      sheet: sheet,
      builder: this,
    });
  };

  this.expression = (expr: string = null) => {
    if (expr === null) {
      return expression;
    }

    expression = expr;

    return this;
  };

  this.title = (ti: string = null) => {
    if (ti === null) {
      return title;
    }

    title = ti;

    return this;
  };

  this.visibility = (vis: string = null) => {
    if (vis === null) {
      return visibility;
    }

    if (vis !== "visible" && vis !== "gm" && vis !== "gmonly") {
      vis = "visible";
    }

    visibility = vis;

    return this;
  };

  this.icon = () => {
    return null;
  };

  this.actions = () => {
    return actions;
  };

  this.addAction = (title: string, cb: Function) => {
    actions[title] = cb;

    return this;
  };

  this.removeAction = (title: string) => {
    if (actions.hasOwnProperty(title)) {
      delete actions[title];
    }

    return this;
  };

  this.onRoll = (cb: Function = null) => {
    if (cb === null) {
      return callback;
    }

    callback = cb;

    return this;
  };
}
