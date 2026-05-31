import { injectable, interfaces } from "inversify";
import { Component } from "./Component/Component";
import { View } from "./Component/View";
import { Tree } from "./Tree";
import { SharedAdapter } from "./SharedAdapter";

export interface BindingElement {
  name: string;
  component: Component;
  view: View;
  data: Function;
}

export interface Bindings {
  [name: string]: BindingElement;
}

@injectable()
export class Binding {
  protected static readonly MaxRelated: number = 8;
  protected bindings: Bindings = {};

  public find(name: string): BindingElement {
    return this.bindings[name];
  }

  public add(
    name: string,
    componentId: string,
    viewId: string,
    dataCallback: Function
  ) {
    const view: View = this.getTree().createView(viewId, null) as View;

    this.bindings[name] = {
      name: name,
      component: view.find(componentId),
      view: view,
      data: dataCallback,
    };
  }

  public remove(name: string) {
    delete this.bindings[name];
  }

  public clearByComponent(id: string) {
    for (const name in this.bindings) {
      if (!this.bindings[name].component) {
        continue;
      }

      if (this.bindings[name].component.id === id) {
        delete this.bindings[name];
      }
    }
  }

  public parse(message: string, bindings: any[], character: any = {}) {
    if (bindings == undefined) {
      return message;
    }

    bindings.forEach((binding: any) => {
      const bindingName: string = this.escape(binding.name);

      message = message
        .split("[" + bindingName + "]")
        .join(this.generateLink(binding, character));
    });

    return message;
  }

  protected escape(message: string) {
    return message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  protected generateLink(binding: any, character: any = {}): string {
    const jsonData: string = JSON.stringify(binding.data);
    const jsonCharacter: string = JSON.stringify(character);

    const link = document.createElement("a");
    link.href = "#";
    link.classList.add("binding");
    link.innerText = "[" + binding.name + "]";
    link.dataset.view = binding.view;
    link.dataset.data = jsonData;
    link.dataset.character = jsonCharacter;

    return link.outerHTML;
  }

  public getRelated(word: string) {
    const search = word.toLowerCase();
    const results: BindingElement[] = [];
    let i = 0;

    for (const name in this.bindings) {
      if (name.toLowerCase().startsWith(search)) {
        results.push(this.bindings[name]);

        if (i++ >= Binding.MaxRelated) {
          break;
        }
      }
    }

    return results;
  }

  protected getTree(): Tree {
    return SharedAdapter.container.get("SystemTree");
  }
}
