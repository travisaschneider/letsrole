import { Konsole } from "../../Konsole";
import { Binding, BindingElement } from "../Binding";
import { SharedAdapter } from "../SharedAdapter";

export const BindingApi = {
  send: (sheet, name) => {
    if (!isBindingEnabled()) {
      return null;
    }

    if (!sheet) {
      Konsole.error("Missing sheet in bindings");
      return;
    }

    if (!name) {
      Konsole.error("Missing binding's name");
      return;
    }

    let bindings: Binding;

    try {
      bindings = SharedAdapter.container.get("SystemBinding");
    } catch (e) {
      Konsole.log("Disabling bindings");
      return;
    }

    const binding: BindingElement = bindings.find(name);

    if (!binding) {
      Konsole.error(`Unable to find binding "${name}"`);
      return;
    }

    try {
      const parsed: any = {
        name: binding.name,
        view: binding.view.id,
        data: binding.data(sheet),
      };

      const text: string = "[" + name + "]";

      SharedAdapter.eventDispatcher.emit("chat-say", {
        text: text,
        bindings: [parsed],
      });
    } catch (e) {
      Konsole.error("Error during a binding", e);
    }
  },
  add: (
    name: string,
    componentId: string,
    viewId: string,
    dataCallback: Function
  ) => {
    if (!isBindingEnabled()) {
      return null;
    }

    try {
      const bindings: Binding = SharedAdapter.container.get("SystemBinding");
      bindings.add(name, componentId, viewId, dataCallback);
    } catch (e) {
      Konsole.error(`Error when adding the binding ${name}`, e);
    }
  },
  remove: (name: string) => {
    if (!isBindingEnabled()) {
      return null;
    }

    try {
      const bindings: Binding = SharedAdapter.container.get("SystemBinding");
      bindings.remove(name);
    } catch (e) {
      Konsole.error(`Error when removing the binding ${name}`, e);
    }
  },
  clear: (component: string) => {
    if (!isBindingEnabled()) {
      return null;
    }

    try {
      const bindings: Binding = SharedAdapter.container.get("SystemBinding");
      bindings.clearByComponent(component);
    } catch (e) {
      Konsole.error(`Error when clearing bindings`, e);
    }
  },
};

const isBindingEnabled = () => {
  try {
    SharedAdapter.container.get("SystemBinding");
    return true;
  } catch (e) {
    return false;
  }
};
