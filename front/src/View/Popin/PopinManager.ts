import { Popin, PopinOptions } from "./Popin";
import { injectable } from "inversify";
import $ = require("jquery");
import { MenuView } from "../MenuView";
import { container } from "../../DependencyInjection/Container";
import { Views } from "../../DependencyInjection/Views";

@injectable()
export class PopinManager {
  protected registry: Map<string, Popin> = new Map<string, Popin>();
  protected zIndex = 1;

  public constructor() {
    $(() => this.init());
  }

  protected init() {
    const container = document.getElementById("popin-container");

    container.addEventListener("popin-focus", (e: CustomEvent) => {
      const id = e.detail;
      this.focus(id);
    });

    container.addEventListener("popin-delete", (e: CustomEvent) => {
      const id = e.detail;
      this.delete(id);
    });
  }

  public delete(id: string) {
    this.registry.delete(id);
  }

  public focus(id: string) {
    this.zIndex++;
    this.registry.get(id).zIndex = this.zIndex;
  }

  public get(id: string): Popin {
    if (!this.registry.has(id)) {
      return null;
    }

    return this.registry.get(id);
  }

  public create(options: PopinOptions): Popin {
    if (typeof options === "string") {
      options = {
        id: options,
      };
    }

    if (options.id === undefined) {
      throw new Error("Trying to create a popin without id");
    }

    const id: string = options.id;
    delete options.id;

    this.zIndex++;

    if (this.registry.has(id)) {
      const popin = this.registry.get(id);
      popin.zIndex = this.zIndex;

      return popin;
    }

    options.zIndex = this.zIndex;

    const popin: Popin = new Popin(id);

    Object.assign(popin, options);

    this.registry.set(id, popin);

    if (options.taskbar && options.taskbar === true) {
      this.getTaskBarView().attachPopin(popin);
    }

    return popin;
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }
}
