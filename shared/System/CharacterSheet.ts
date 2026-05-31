import { Tree } from "./Tree";
import { CodeExecutor } from "./CodeExecutor";
import { SharedAdapter } from "./SharedAdapter";
import { Component } from "./Component/Component";
import { RemoteEvent } from "./CodeExecutor/Event/RemoteEvent";
import { ComputedEvent } from "./CodeExecutor/Event/ComputedEvent";
import { ObjectPath } from "../Util/ObjectPath";
import { View } from "./Component/View";
import { CharacterSheetContext } from "./CodeExecutor/CharacterSheetContext";
import { DiceIcon, DiceVisibility, RawDiceResult } from "../DiceData";
import { DiceResult } from "../DiceResult";
import { Konsole } from "../Konsole";
import { RepeaterElement } from "./Component/RepeaterElement";
import { CraftItem } from "../Scene/SceneData";
import { Referencer } from "./Referencer";
import { Repeater } from "./Component/Repeater";

export interface SheetItem {
  path: string;
  id: string;
  element: HTMLElement;
  component: Component;
  value: any;
  index?: number;
  parent?: SheetItem;
}

export interface SheetEvents {
  [path: string]: {
    [event: string]: EventListenerObject[];
  };
}

export class CharacterSheet {
  public isScriptInit = false;
  public isBindingInit = false;
  public character: any;
  public computed: any;
  public events: SheetEvents = {};

  public idle = true;

  public readonly type: string = "character";

  protected initialized = false;
  protected ready = false;
  protected readyCallbacks: Function[] = [];
  protected tree: Tree;
  protected view: View;
  protected persistEventName = "character-persist";
  protected multiPersistEventName = "character-multi-persist";
  protected containerId: string;
  protected context: any;
  protected sheetElement: HTMLElement;
  protected rollIcon: DiceIcon;

  protected _token: CraftItem;
  protected _elementsCache: Map<string, HTMLElement> = new Map<
    string,
    HTMLElement
  >();
  protected _referencer: Referencer;

  public constructor(
    character: any,
    tree: Tree,
    viewId: string,
    containerId: string = null
  ) {
    if (character.data === null || character.data === undefined) {
      character.data = {};
    }

    this.character = character;
    this.tree = tree;

    if (viewId) {
      this.view = tree.createView(viewId, this);
    }

    this.computed = {};
    this.containerId = containerId;
    this._referencer = new Referencer(this);
  }

  public getUserId(): number {
    return this.character.userId;
  }

  public get referencer(): Referencer {
    return this._referencer;
  }

  public get token(): CraftItem {
    return this._token;
  }

  public set token(token: CraftItem) {
    this._token = token;

    if (!token.data) {
      token.data = {};
    }
  }

  public onReady(callback: Function) {
    if (this.ready) {
      callback();
      return;
    }

    this.readyCallbacks.push(callback);
  }

  public markAsReady() {
    this.ready = true;
    this.initialized = true;

    this.readyCallbacks.forEach((callback: Function) => {
      callback();
    });
  }

  public getSheetContext(): any {
    if (this.context) {
      return this.context;
    }

    this.context = new CharacterSheetContext(this.view, this);

    return this.context;
  }

  public render() {
    return this.view.render();
  }

  get readOnly(): boolean {
    return this.view.readOnly;
  }

  public getView(): View {
    return this.view;
  }

  public setView(viewId: string) {
    this.view = this.tree.createView(viewId, this);
  }

  get id(): number {
    return this.character.id;
  }

  get name(): string {
    return this.character.name;
  }

  public getContainerId(): string {
    if (this.containerId) {
      return this.containerId;
    }

    return "sheet-" + this.id;
  }

  protected getSheetElement(): HTMLElement {
    if (!this.sheetElement) {
      this.sheetElement = document.getElementById(this.getContainerId());
    }

    return this.sheetElement;
  }

  public removeData(property: string) {
    if (this.token) {
      if (ObjectPath.has(this.token.data, property)) {
        ObjectPath.remove(this.token.data, property);
      } else {
        ObjectPath.remove(this.character.data, property);
      }
    } else {
      ObjectPath.remove(this.character.data, property);
    }
  }

  public setData(property: string, value: any) {
    if (this.token) {
      ObjectPath.set(this.token.data, property, value);
    } else {
      ObjectPath.set(this.character.data, property, value);
    }
  }

  public getData(property: string) {
    if (this.token) {
      return ObjectPath.get([this.token.data, this.character.data], property);
    }

    return ObjectPath.get(this.character.data, property);
  }

  public hasData(property: string) {
    if (this.token) {
      return ObjectPath.has([this.token.data, this.character.data], property);
    }

    return ObjectPath.has(this.character.data, property);
  }

  public getAllData() {
    if (this.token) {
      return this.merge({}, this.character.data, this.token.data);
    }

    return this.character.data;
  }

  // Updated from the WebsocketClient
  public update(property: string, value: any, del = false) {
    if (del) {
      this.removeData(property);
    } else {
      this.setData(property, value);
    }

    this.updateValue(property);
  }

  public getSheetItem(path: string): SheetItem {
    return {
      path: path,
      id: path,
      value: this.getData(path),
      element: this.getElement(path),
      component: this.view.find(path),
    };
  }

  public getElement(path: string): HTMLElement {
    const rootElement: HTMLElement = this.getSheetElement();

    if (!rootElement) {
      return null;
    }

    return rootElement.querySelector('.widget[data-widget-id="' + path + '"]');
  }

  public multiPersist(data: any) {
    if (typeof data !== "object") {
      Konsole.error("data send to setData() should be an object");
      return;
    }

    for (const key in data) {
      this.setData(key, data[key]);
    }

    const dispatcher = SharedAdapter.eventDispatcher;

    if (dispatcher !== null) {
      const eventContent: any = {
        cid: this.id,
        data: data,
      };

      if (this.token) {
        eventContent.tokenKey = this.token.key;
      }

      dispatcher.emit(this.multiPersistEventName, eventContent);
    }
  }

  public persist(path: string, value: any) {
    if (this.getData(path) === value) {
      return;
    }

    this.setData(path, value);

    const dispatcher = SharedAdapter.eventDispatcher;

    if (dispatcher !== null) {
      const eventContent: any = {
        cid: this.id,
        p: path,
        val: value,
      };

      if (this.token) {
        eventContent.tokenKey = this.token.key;
      }

      dispatcher.emit(this.persistEventName, eventContent);
    }
  }

  protected initDragDrop(e: DragEvent, element: HTMLElement) {
    e.dataTransfer.setData("type", "sheet-element");
    e.dataTransfer.setData("path", element.dataset.widgetId);
    e.dataTransfer.setData("characterId", this.id.toString(10));
  }

  public initView(element: HTMLElement) {
    const all = element.querySelectorAll(".widget");

    all.forEach((element: HTMLElement) => {
      this.initElement(element);
    });

    const quickBars = element.querySelectorAll(".widget.can-quick-bar");

    quickBars.forEach((quickBar: HTMLElement) => {
      quickBar.addEventListener("dragstart", (e: DragEvent) => {
        this.initDragDrop(e, quickBar);
      });
    });

    const computeds = element.querySelectorAll(".widget.is-computed");

    computeds.forEach((computed: HTMLElement) => {
      this.renderComputed(computed);
    });

    const referenced = element.querySelectorAll(".widget.has-reference");

    referenced.forEach((ref: HTMLElement) => {
      this.renderReferences(ref);
    });

    this.populateComputed(element);
    this.initTooltips(element);
  }

  public init() {
    const sheet = this.getSheetElement();

    if (!sheet) {
      return;
    }

    if (sheet.dataset.initialized === "true") {
      return;
    }

    this.initView(sheet);

    const executor: CodeExecutor = SharedAdapter.codeExecutor;

    sheet.addEventListener("dragover", (e) => {
      e.preventDefault();
      const tr: DataTransfer = e.dataTransfer;

      if (
        this.view.id === "main" &&
        (tr.getData("bookcraftid") || tr.getData("keyid") || tr.getData("dice"))
      ) {
        sheet.classList.add("dropping");
        e.preventDefault();
      }
    });

    sheet.addEventListener("dragenter", (e) => {
      const tr: DataTransfer = e.dataTransfer;

      if (
        this.view.id !== "main" ||
        tr.getData("bookcraftid") ||
        !tr.getData("keyid") ||
        !tr.getData("dice")
      ) {
        return;
      }

      sheet.classList.add("dropping");
    });

    sheet.addEventListener("dragleave", (e) => {
      sheet.classList.remove("dropping");
    });

    sheet.addEventListener("drop", (e) => {
      e.preventDefault();

      const transfert = e.dataTransfer;
      sheet.classList.remove("dropping");

      if (transfert.getData("keyid")) {
        const keyid: string = transfert.getData("keyid");
        const viewId: string = transfert.getData("viewId");
        const data: any = JSON.parse(transfert.getData("data"));

        if (data.data) {
          delete data.data;
        }

        executor.drop(viewId, data, this);
        return;
      }

      if (transfert.getData("bookcraftid")) {
        const bookCraftId: string = transfert.getData("bookcraftid");
        const viewId: string = transfert.getData("viewId");
        const data: any = JSON.parse(transfert.getData("data"));

        if (data.data) {
          delete data.data;
        }

        executor.drop(viewId, data, this);
        return;
      }

      if (transfert.getData("dice")) {
        const diceData: string = transfert.getData("dice");
        const title: string = transfert.getData("title");
        const expression: string = transfert.getData("expression");
        const visibility: DiceVisibility = transfert.getData(
          "visibility"
        ) as DiceVisibility;

        const raw: RawDiceResult = JSON.parse(diceData);
        const result: DiceResult = new DiceResult(
          raw,
          expression,
          title,
          visibility
        );

        executor.dropDice(result, this);
        return;
      }
    });

    sheet.addEventListener("roll", (e: CustomEvent) => {
      const event = {
        sheet: this,
        expression: e.detail.expression,
        title: e.detail.title,
      };

      SharedAdapter.eventDispatcher.emit("roll", event);
    });

    if (executor) {
      executor.init(this.view, this);
    }

    sheet.dataset.initialized = "true";

    this.markAsReady();
  }

  public initElement(element: HTMLElement) {
    const path = element.dataset.widgetId;
    const widget: Component = this.view.find(path);
    let isUpdated = false;

    if (widget) {
      widget.sheet = this;
      widget.initialize(element);

      if (element.classList.contains("persist")) {
        this.initPersistence(widget);
      }

      if (this.hasData(path)) {
        widget.reverseTransform(this.getData(path));
        isUpdated = true;
      }
    }

    if (isUpdated) {
      element.dispatchEvent(new Event("update"));
    }
  }

  public renderComputed(element: HTMLElement) {
    const path = element.dataset.widgetId;
    const widget: Component = this.view.find(path);

    if (widget) {
      widget.transformComputedValue();
    }
  }

  public setTemporaryRollIcon(icon: DiceIcon) {
    this.rollIcon = icon;

    setTimeout(() => {
      if (this) {
        this.rollIcon = null;
      }
    }, 350);
  }

  public getTemporaryRollIcon(): DiceIcon | null {
    return this.rollIcon;
  }

  public renderReferences(element: HTMLElement) {
    const path = element.dataset.widgetId;
    const widget: Component = this.view.find(path);

    if (widget && widget.references.length) {
      widget.references.forEach((reference: string) => {
        const referenced: HTMLElement = this.getElement(reference);

        if (referenced) {
          this.renderComputed(referenced);
        }
      });
    }
  }

  protected initTooltips(sheet: HTMLElement) {
    const $ = window["$"];

    $(sheet)
      .find(".with-tooltip")
      .tooltip(this.getToolTipDefaultConfiguration());
  }

  public getToolTipDefaultConfiguration(): any {
    return {
      container: "body",
      boundary: "window",
      template:
        '<div class="tooltip sheet-tooltip" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>',
    };
  }

  protected initPersistence(component: Component, callback: Function = null) {
    if (!callback) {
      callback = this.persist;
    }

    const elt: HTMLElement = component.element;
    const path: string = elt.dataset.widgetId;

    if (elt instanceof HTMLInputElement && elt.type === "number") {
      elt.addEventListener("keyup", (e: Event) => {
        if (ObjectPath.has(this.computed, path)) {
          // wait
        } else {
          const value = component.transform();
          callback.call(this, path, value);
          elt.dispatchEvent(new Event("update"));
        }
      });
    }

    elt.addEventListener("change", (e: Event) => {
      if (e instanceof RemoteEvent) {
        // value has been changed remotely
        return;
      }

      if (e instanceof ComputedEvent) {
        // value changed locally, nothing to do
        return;
      }

      let value = component.transform();
      const reversed = component.reverseTransform(value);

      if (reversed !== undefined) {
        value = reversed;
      }

      callback.call(this, path, value);

      if (component.references.length) {
        component.references.forEach((reference: string) => {
          this.updateDataValue(reference);
        });
      }

      elt.dispatchEvent(new Event("update"));
    });
  }

  public addToRepeater(path: string, data: any) {
    const rowId: string = this.generateRandomString(16);
    const dispatcher = SharedAdapter.eventDispatcher;
    const rowPath: string = path + "." + rowId;

    dispatcher.emit(this.persistEventName, {
      cid: this.id,
      p: rowPath,
      val: data,
    });

    this.setData(rowPath, data);
    this.updateValue(path); // update the whole repeater
  }

  public deleteRepeaterEntry(repeaterElement: RepeaterElement) {
    const dispatcher = SharedAdapter.eventDispatcher;
    const path: string = repeaterElement.idWithContext;

    this.removeData(path);

    if (dispatcher) {
      dispatcher.emit(this.persistEventName, {
        cid: this.id,
        p: path,
        val: null,
        del: true,
      });
    }

    repeaterElement.remove();

    const elt: HTMLElement = repeaterElement.element;

    elt.dispatchEvent(
      new Event("update", {
        bubbles: true,
      })
    );

    if (elt) {
      elt.remove();
    }
  }

  public populateComputed(sheet: HTMLElement) {
    if (!sheet) {
      return;
    }

    for (const id in this.computed) {
      this.setIsComputed(id);
    }
  }

  public setComputedValue(id, value) {
    if (this.getData(id) != value && value !== null && value !== undefined) {
      this.computed[id] = value;
      this.setIsComputed(id);
    } else {
      delete this.computed[id];
      this.setIsNotComputed(id);
    }
  }

  public generateRandomString(length: number) {
    return Math.random().toString(36).replace("0.", "").slice(-length);
  }

  protected updateDataValue(path: string) {
    const item: SheetItem = this.getSheetItem(path);
    const widget: Component = item.component;
    const element: HTMLElement = item.element;

    const data = this.getData(path);

    if (widget.isComputed()) {
      widget.transformComputedValue();
    } else {
      if (data) {
        widget.reverseTransform(data);
      }
    }

    element.dispatchEvent(new Event("update"));
  }

  protected updateValue(path: string): HTMLElement {
    let item: SheetItem = this.getSheetItem(path);
    const widget: Component = item.component;
    const element: HTMLElement = item.element;
    const value: any = item.value;

    if (value === undefined && widget instanceof RepeaterElement) {
      // deleted repeater element

      widget.remove();
      element.remove();

      const parentPath: string = this.getParentPath(path);
      const parentItem: SheetItem = this.getSheetItem(parentPath);

      if (parentItem.component instanceof Repeater) {
        parentItem.element.dispatchEvent(new Event("update"));
      }

      return;
    }

    if (!widget || !element) {
      // check if the parent widget is a RepeaterElement, in that case it's because the write view is not enabled
      // -> update the whole RepeaterElement

      // if the parent is null and grand parent is a Repeater, then it's a new element added to the repeater
      // -> update the whole repeater

      const parentPath = this.getParentPath(path);

      if (!parentPath) {
        return element;
      }

      item = this.getSheetItem(parentPath);
      const parentWidget: Component = item.component;

      if (parentWidget) {
        if (parentWidget instanceof RepeaterElement) {
          parentWidget.reverseTransform(item.value);

          const repeater: HTMLElement = parentWidget.parent.element;

          if (repeater) {
            repeater.dispatchEvent(new Event("update"));
          }
        }
      } else {
        const grandParentPath: string = this.getParentPath(parentPath);

        if (!grandParentPath) {
          return element;
        }

        item = this.getSheetItem(grandParentPath);
        const grandParentWidget: Component = item.component;

        if (grandParentWidget instanceof Repeater) {
          grandParentWidget.reverseTransform(item.value);
          item.element.dispatchEvent(new Event("update"));
        }
      }

      return;
    }

    widget.reverseTransform(value);
    element.dispatchEvent(new Event("update"));

    return element;
  }

  protected getParentPath(path: string): string {
    const parts: string[] = path.split(".");
    parts.pop();

    const parentPath: string = parts.join(".");

    if (parentPath === path) {
      return null;
    }

    return parentPath;
  }

  public getValue(path: string) {
    const val = this.getData(path);

    if (val === undefined) {
      const item: SheetItem = this.getSheetItem(path);
      const widget: Component = item.component;
      const element: HTMLElement = item.element;

      if (!widget || !element) {
        return null;
      }

      return widget.transform();
    }

    return val;
  }

  protected setIsNotComputed(path: string): HTMLElement {
    const item: SheetItem = this.getSheetItem(path);
    const element: HTMLInputElement = item.element as HTMLInputElement;

    if (!element) {
      return;
    }

    delete element.dataset.isComputed;
    element.value = this.getData(path);
    element.classList.remove("computed");

    element.dispatchEvent(new ComputedEvent("update"));

    return element;
  }

  public getRawValue(path: string) {
    if (this.hasData(path)) {
      return this.getData(path);
    } else {
      const item: SheetItem = this.getSheetItem(path);
      const widget: Component = item.component;

      if (widget["defaultValue"] != undefined) {
        return widget["defaultValue"];
      }

      return null;
    }
  }

  protected setIsComputed(path: string): HTMLElement {
    const item: SheetItem = this.getSheetItem(path);
    const element: HTMLInputElement = item.element as HTMLInputElement;
    const component: Component = item.component;

    if (!element) {
      return;
    }

    element.value = ObjectPath.get(this.computed, path);

    if (!element.dataset.computedInit) {
      element.dataset.isComputed = "true";
      element.classList.add("computed");

      let isFocus = false;

      element.addEventListener("focus", (e) => {
        if (!element.dataset.isComputed) {
          return;
        }

        isFocus = true;

        element.value = this.getRawValue(path);
        element.classList.remove("computed");
      });

      element.addEventListener("change", (e) => {
        if (e instanceof RemoteEvent) {
          element.dispatchEvent(new Event("blur"));
        }
      });

      element.addEventListener("blur", (e) => {
        if (!element.dataset.isComputed) {
          return;
        }

        isFocus = false;
        element.value = ObjectPath.get(this.computed, path);
        element.classList.add("computed");

        element.dispatchEvent(new Event("update"));
      });

      element.addEventListener("mouseenter", (e) => {
        if (!element.dataset.isComputed) {
          return;
        }

        if (isFocus) {
          return;
        }

        element.value = this.getRawValue(path);
        element.classList.remove("computed");
      });

      element.addEventListener("mouseleave", (e) => {
        if (!element.dataset.isComputed) {
          return;
        }

        if (isFocus) {
          return;
        }

        element.value = ObjectPath.get(this.computed, path);
        element.classList.add("computed");
      });

      element.dataset.computedInit = "true";
    }

    element.dispatchEvent(new ComputedEvent("update"));

    return element;
  }

  protected isObject(item: any): boolean {
    return item && typeof item === "object" && !Array.isArray(item);
  }

  protected merge(target, ...sources: any): any {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.merge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.merge(target, ...sources);
  }
}
