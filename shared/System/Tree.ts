import { Component } from "./Component/Component";
import { injectable } from "inversify";
import { CreateComponent } from "./Component/ComponentList";
import { FlattenComponents, View } from "./Component/View";
import { ViewType } from "./Component/ViewType";
import { CharacterSheet } from "./CharacterSheet";

@injectable()
export class Tree {
  public source: any[] = [];
  public viewSources: Map<string, any> = new Map<string, any>();
  public mainSourceId: string;

  public viewSourceAsArray(): any[] {
    const arr: any[] = [];

    this.viewSources.forEach((source: any) => {
      arr.push(source);
    });

    return arr;
  }

  public hasViewSource(id: string): boolean {
    return this.viewSources.has(id);
  }

  public setSource(source: any[]): Tree {
    this.source = source;
    this.viewSources.clear();
    this.mainSourceId = null;

    for (const i in this.source) {
      this.addViewSource(this.source[i]);
    }

    return this;
  }

  public addViewSource(viewSource: any) {
    this.viewSources.set(viewSource.id, viewSource);

    if (viewSource.type === ViewType.Main && viewSource.id === "main") {
      this.mainSourceId = viewSource.id;
    }
  }

  public createView(id: string, sheet: CharacterSheet): View {
    if (this.viewSources.has(id)) {
      const source: any = this.viewSources.get(id);

      return <View>this.createComponent(source, sheet);
    }

    return null;
  }

  public createMaster(sheet: CharacterSheet): View {
    return this.createView(this.mainSourceId, sheet);
  }

  public persistView(view: View) {
    const source: any = view.serialize();

    this.viewSources.set(view.id, source);

    for (const i in this.source) {
      if (this.source[i].id === view.id) {
        this.source[i] = source;
      }
    }
  }

  public getCrafts(): any[] {
    const crafts: any[] = [];

    for (const i in this.source) {
      if (this.source[i].craft) {
        crafts.push(this.source[i]);
      }
    }

    return crafts;
  }

  public addView(view: View) {
    this.source.push(view.serialize());
  }

  public removeSource(id: string) {
    this.viewSources.delete(id);

    let n = 0;

    for (const i in this.source) {
      if (this.source[i].id === id) {
        this.source.splice(n, 1);
        break;
      }

      n++;
    }
  }

  protected clone(obj: any) {
    let copy;

    if (null == obj || "object" != typeof obj) return obj;

    if (obj instanceof Date) {
      copy = new Date();
      copy.setTime(obj.getTime());

      return copy;
    }

    if (obj instanceof Array) {
      copy = [];

      for (let i = 0, len = obj.length; i < len; i++) {
        copy[i] = this.clone(obj[i]);
      }

      return copy;
    }

    if (obj instanceof Object) {
      copy = {};

      for (const attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = this.clone(obj[attr]);
      }

      return copy;
    }
  }

  public createComponent(source: any, sheet: CharacterSheet): Component {
    if (source == null) {
      source = {};
    }

    const item: Component = CreateComponent(source.className);
    item.sheet = sheet;
    const toTransfer = {};

    for (const key in source) {
      if (key === "children" || key === "className") {
        continue;
      }

      toTransfer[key] = source[key];
    }

    Object.assign(item, toTransfer);

    if (source.children) {
      for (const i in source.children) {
        const child: Component = this.createComponent(
          source.children[i],
          sheet
        );
        item.addChild(child);
      }
    }

    return item;
  }

  public duplicateComponent(component: Component): Component {
    const data = component.serialize();

    const duplicated: Component = this.createComponent(data, component.sheet);
    this.regenerateIds(duplicated);

    return duplicated;
  }

  public generateComponentId(): string {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz";
    const charactersLength = characters.length;

    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }

  protected regenerateIds(component: Component): Component {
    component.id = this.generateComponentId();

    component.children.forEach((child: Component) => {
      this.regenerateIds(child);
    });

    return component;
  }
}
