import { Component } from "./Component";
import { ViewType } from "./ViewType";
import { ContainerAwareComponent } from "./ContainerAwareComponent";
import { CodeExecutor } from "../CodeExecutor";

export enum ViewSize {
  Large = "Large",
  Medium = "Medium",
  Small = "Small",
}

export interface FlattenComponents {
  [id: string]: Component;
}

export class View extends ContainerAwareComponent {
  public static readonly widgetName: string = "View";
  public static readonly attributeTemplate: string = "attribute-view.html.njk";
  public static readonly dragndroppable: boolean = false;

  public craft = false;
  public tokenizable = false;
  public droppable = false;
  public avatarId: string;
  public size: ViewSize;
  public width = 650;
  public height = 400;
  public type: ViewType;

  protected _context: any = {};

  public render(): string {
    return `<div class="widget view ${this.e(this.widgetClasses)}" ${
      this.renderAttributes
    }>
            ${this.renderChildren()}
            </div>`;
  }

  public get context(): any {
    return this._context;
  }

  public set context(context: any) {
    this._context = context;
  }

  public flatten(
    flat: FlattenComponents = null,
    parent: Component = null
  ): FlattenComponents {
    if (!flat) {
      flat = {};
    }

    if (parent === null) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      parent = this;
    }

    flat[parent.id] = parent;

    parent.children.forEach((child: Component) => {
      this.flatten(flat, child);
    });

    return flat;
  }

  protected getContext(): any {
    return this.context;
  }

  public serialize(): any {
    const serialized = {
      size: this.size,
      type: this.type,
      craft: this.craft,
      avatarId: this.avatarId,
      tokenizable: this.tokenizable,
      droppable: this.droppable,
      width: this.width,
      height: this.height,
    };

    return { ...serialized, ...super.serialize() };
  }

  public getExtraReferences(): any {
    if (!this.sheet) {
      return {};
    }

    const executor: CodeExecutor =
      this.container.get<CodeExecutor>("SystemCodeExecutor");

    const references = executor.getReferences(this.sheet);

    return references;
  }

  get types() {
    return ViewType;
  }

  get typesArray(): string[] {
    return [ViewType.Sub, ViewType.Main];
  }

  get sizes() {
    return ViewSize;
  }
}
