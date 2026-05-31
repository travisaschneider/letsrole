import { CharacterSheet } from "../CharacterSheet";
import { ComponentError } from "./ComponentError";
import { View } from "./View";
import { ObjectPath } from "../../Util/ObjectPath";
import { ReferenceList } from "../ReferenceList";
import { SharedAdapter } from "../SharedAdapter";
import { TooltipPlacement } from "./TooltipPlacement";

export class Component {
  public static readonly widgetName: string;
  public static readonly icon: string;
  public static readonly attributeTemplate: string;
  public static readonly dragndroppable: boolean = true;

  public static cacheEnabled = true;

  protected _id: string;
  protected _topView: View;
  protected _hidden = false;
  protected _readOnly = false;
  protected _findCache: Map<string, Component> = new Map<string, Component>();
  protected _sheet: CharacterSheet;
  protected _element: HTMLElement;
  protected _computedProperty: string;

  public name: string;
  public type: string;
  public classes = "";
  public children: Component[] = [];
  public parent: Component;
  public collapsed = false;
  public references: string[] = [];
  public parentId: string = null;
  public inContext = false;
  public tooltip = false;
  public tooltipLabel: string = null;
  public tooltipPlacement: TooltipPlacement = TooltipPlacement.Top;

  public initialize(element: HTMLElement) {
    this._element = element;
  }

  public initWidgetOptions(container: HTMLElement) {
    return;
  }

  public isComputed(): boolean {
    return false;
  }

  public validateProperties(): ComponentError[] {
    const errors: ComponentError[] = [];

    if (!this.id.match(/^\w+$/gi)) {
      errors.push({
        id: "id",
        message: 'id should only contains letters and "_"',
      });
    }

    return errors;
  }

  public transformComputedValue(references: ReferenceList = null) {
    this.reverseTransform(this.renderValue(references));
  }

  public renderValue(references: ReferenceList = null): any {
    if (this.isComputed()) {
      return this.sheet.referencer.render(
          this[this._computedProperty],
          this.getContext(),
          references
      );
    }

    const value = this[this._computedProperty];

    if (Number.isNaN(value)) {
      return 0;
    }

    return value;
  }

  public getReferences(): string[] {
    if (!this.isComputed()) {
      return [];
    }

    const referenceList = new ReferenceList();

    this.sheet.referencer.render(
        this[this._computedProperty],
        {},
        referenceList
    );

    return referenceList.toArray();
  }

  public get id(): string {
    return this._id;
  }

  public set id(id: string) {
    this._id = id;
  }

  public set sheet(sheet: CharacterSheet) {
    this._sheet = sheet;
  }

  public get sheet(): CharacterSheet {
    return this._sheet;
  }

  public get element(): HTMLElement {
    return this._element;
  }

  protected get isMobile(): boolean {
    if (window && window["configuration"]) {
      if (window["configuration"]["mobile"]) {
        return !!window["configuration"]["mobile"];
      }
    }

    return false;
  }

  public serialize(): any {
    const children = [];

    this.children.forEach((child: Component) => {
      children.push(child.serialize());
    });

    return {
      id: this.id,
      name: this.name,
      type: this.type,
      classes: this.classes,
      children: children,
      className: this.className,
      collapsed: this.collapsed,
      references: this.references,
    };
  }

  public clearReferences() {
    this.references = [];
  }

  public addReference(reference: string) {
    this.references.push(reference);
  }

  public getClasses(): string[] {
    if (!this.classes) {
      this.classes = "";
    }

    const classes = this.classes.split(" ");

    if (this.isComputed()) {
      classes.push("is-computed");
    }

    if (this.references.length) {
      classes.push("has-reference");
    }

    return classes;
  }

  get template(): string {
    return (<any>this.constructor).template;
  }

  get className(): string {
    return this.widgetName;
  }

  get widgetName(): string {
    return (<any>this.constructor).widgetName;
  }

  get icon(): string {
    return (<any>this.constructor).icon;
  }

  get attributeTemplate(): string {
    return (<any>this.constructor).attributeTemplate;
  }

  get dragndroppable(): boolean {
    return (<any>this.constructor).dragndroppable;
  }

  get renderAttributes(): string {
    let attributes = "";

    attributes += 'data-widget-id="' + this.idWithContext + '" ';
    attributes += 'data-widget-type="' + this.className + '" ';

    return attributes;
  }

  get widgetClasses(): string {
    return this.getClasses().join(" ");
  }

  public renderChildren(): string {
    let html = "";

    for (const i in this.children) {
      html += this.children[i].render();
    }

    return html;
  }

  public addChildBefore(child: Component, before: Component): boolean {
    const idx = this.children.indexOf(before);

    if (idx < 0) {
      return false;
    }

    this.children.splice(idx, 0, child);
    child.parent = this;

    return true;
  }

  public addChildAfter(child: Component, after: Component): boolean {
    const idx = this.children.indexOf(after);

    if (idx < 0) {
      return false;
    }

    this.children.splice(idx + 1, 0, child);
    child.parent = this;

    return true;
  }

  public addChild(child: Component) {
    this.children.push(child);
    child.parent = this;
  }

  public get idWithContext(): string {
    let parent: Component = this.parent;
    let paths: string[] = [];

    while (parent) {
      if (parent.inContext) {
        paths.push(parent.id);
      }

      parent = parent.parent;
    }

    paths = paths.reverse();

    paths.push(this.id);

    return paths.join(".");
  }

  public remove(): boolean {
    if (this.parent !== null && this.parent !== undefined) {
      return this.parent.removeChild(this);
    }

    return false;
  }

  public removeChild(child: Component): boolean {
    const idx = this.children.indexOf(child);

    if (idx > -1) {
      this.children.splice(idx, 1);
      child.parent = null;

      return true;
    }

    return false;
  }

  public removeAllChildren() {
    this.children.forEach((child: Component) => {
      child.remove();
    });

    this.children = [];
  }

  public clearCache() {
    this._findCache.clear();
  }

  public find(id: string): Component | null {
    if (id === null || id === undefined) {
      return null;
    }

    if (id === this.id) {
      return this;
    }

    if (id.indexOf(".") >= 0) {
      const ids: string[] = ObjectPath.parse(id);

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let current: Component = this;

      for (const i in ids) {
        current = current.find(ids[i]);

        if (current === null) {
          return null;
        }
      }

      return current;
    }

    if (Component.cacheEnabled && this._findCache.has(id)) {
      return this._findCache.get(id);
    }

    for (const i in this.children) {
      const child = this.children[i];

      if (child.id === id) {
        return child;
      }

      const inside = child.find(id);

      if (inside !== null) {
        if (Component.cacheEnabled) {
          this._findCache.set(id, inside);
        }

        return inside;
      }
    }

    return null;
  }

  public findParent(id: string): Component | null {
    let parent: Component = this.parent;

    while (parent) {
      if (parent.id === id) {
        return parent;
      }

      parent = parent.parent;
    }

    return null;
  }

  public render(): string {
    return "unknown component";
  }

  public refreshRender() {
    this._element.outerHTML = this.render();
  }

  public transformForDisplay(value: any): any {
    if (!value) {
      return "";
    }

    return value.toString();
  }

  public getTopView(): Component {
    let parent: Component = this.parent;

    while (parent) {
      if (parent.className === "View") {
        return parent;
      }

      parent = parent.parent;
    }

    return null;
  }

  public transform(): any {
    return (<HTMLInputElement>this.element).value;
  }

  public extractMessages(): string[] {
    const result: string[] = [];

    if (this.tooltip) {
      result.push(this.tooltipLabel);
    }

    return result;
  }

  public reverseTransform(value: any): any {
    const newValue = this.transformForDisplay(value);
    const element: HTMLElement = this._element;

    if (
        (element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement) &&
        element.value != newValue
    ) {
      element.value = newValue;
    }

    return newValue;
  }

  protected getContext(): any {
    const view: View = this.getTopView() as View;

    if (view) {
      return view.context;
    }

    return {};
  }

  protected getCodeReferences(): any {
    return (this.getTopView() as View).getExtraReferences();
  }

  protected addCodeReferences(data: any): any {
    return {
      ...data,
      ...this.getCodeReferences(),
    };
  }

  set readOnly(readOnly: boolean) {
    this._readOnly = readOnly;

    this.children.forEach((child: Component) => {
      child.readOnly = readOnly;
    });
  }

  get readOnly(): boolean {
    return this._readOnly;
  }

  public hide() {
    this._element.classList.add("d-none");
    this._hidden = true;
  }

  public show() {
    this._element.classList.remove("d-none");
    this._hidden = false;
  }

  public isHidden(): boolean {
    return this._hidden;
  }

  public isVisible(): boolean {
    return !this._hidden;
  }

  public setToolTip(
      text: string,
      placement: TooltipPlacement = TooltipPlacement.Top
  ) {
    if (typeof text !== "string") {
      text = null;
    }

    if (
        placement !== TooltipPlacement.Top &&
        placement !== TooltipPlacement.Bottom &&
        placement !== TooltipPlacement.Left &&
        placement !== TooltipPlacement.Right
    ) {
      placement = TooltipPlacement.Top;
    }

    if (text.trim() == "") {
      text = null;
    }

    this.tooltipPlacement = placement;

    if (text === null) {
      this.tooltip = false;
      this.tooltipLabel = null;
    } else {
      this.tooltip = true;
      this.tooltipLabel = text;
    }

    const label: string = this.translate(this.tooltipLabel, false);

    this.element.title = label;
    this.element.dataset.originalTitle = label;
    this.element.dataset.placement = this.tooltipPlacement;

    const config: any = this.sheet.getToolTipDefaultConfiguration();
    config.placement = this.tooltipPlacement;

    const $: any = window["$"];
    const $elt: any = $(this.element);

    $elt.tooltip("dispose");
    $elt.tooltip(config);
  }

  public e(str: any): string {
    if (str === "" || str === null || str === undefined) {
      return "";
    }

    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
  }

  public translateNoEscape(str: string): string {
    return SharedAdapter.translator.translate(str);
  }

  public translate(str: string, escape = true): string {
    return this.e(SharedAdapter.translator.translate(str));
  }
}
