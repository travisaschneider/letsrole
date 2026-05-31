import { Tree } from "../Tree";
import { View } from "./View";
import { ContainerAwareComponent } from "./ContainerAwareComponent";
import { RepeaterElement } from "./RepeaterElement";

export class Repeater extends ContainerAwareComponent {
  public static readonly icon: string = "fas fa-redo-alt";
  public static readonly widgetName: string = "Repeater";
  public static readonly attributeTemplate = "attribute-repeater.html.njk";

  public static cacheEnabled = false;

  protected _viewId: string = null;
  protected _readViewId: string = null;
  protected _view: View = null;
  protected _readView: View = null;

  public inContext = true;

  public initialize(element: HTMLElement) {
    this.children = [];
    super.initialize(element);

    const onAddNew = (e) => {
      e.preventDefault();
      this.addNew();
    };

    const addBtn: HTMLElement = element.querySelector(".btn-repeater-add");

    if (addBtn) {
      addBtn.removeEventListener("click", onAddNew);
      addBtn.addEventListener("click", onAddNew);
    }
  }

  public render(): string {
    let edit = "";

    if (!this.readOnly) {
      edit = `<p class="mt-2"><a href="#" class="btn btn-sm btn-secondary btn-repeater-add" data-for="${this.e(
        this.id
      )}">${this.translate("Add...")}</a></p>`;
    }

    return `<div class="widget repeater ${this.e(this.widgetClasses)}" ${
      this.renderAttributes
    }>
            <div class="repeater-container" id="repeater-container-${this.e(
              this.id
            )}">
            </div>
            ${edit}
            </div>`;
  }

  public reverseTransform(value: any): any {
    this.removeAllChildren();

    if (typeof value !== "object") {
      value = {};
    }

    const childMap: Map<string, RepeaterElement> = new Map<
      string,
      RepeaterElement
    >();

    for (const id in value) {
      const child: RepeaterElement = new RepeaterElement(this.container);
      child.id = id;
      child.readViewId = this.readViewId;
      child.writeViewId = this.viewId;
      child.sheet = this.sheet;

      this.addChild(child);

      childMap.set(id, child);
    }

    const container: HTMLElement = this.element.querySelector(
      ".repeater-container"
    );
    container.innerHTML = this.renderChildren();

    this.sheet.initView(this.element);
  }

  public addNew() {
    const container: HTMLElement = this._element.querySelector(
      ".repeater-container"
    );
    const newElement: RepeaterElement = new RepeaterElement(this.container);
    newElement.id = this.generateRandomString(10);
    newElement.readViewId = this.readViewId;
    newElement.writeViewId = this.viewId;
    newElement.sheet = this.sheet;

    this.addChild(newElement);

    container.insertAdjacentHTML("beforeend", newElement.render());

    const elt: HTMLElement = container.querySelector(
      '.repeater-element[data-row-id="' + newElement.id + '"]'
    );
    newElement.initialize(elt);
    newElement.transformForEdit();
  }

  public generateRandomString(length: number) {
    return Math.random().toString(36).replace("0.", "").slice(-length);
  }

  public serialize(): any {
    const serialized = super.serialize();

    const data = {
      viewId: this.viewId,
      readViewId: this.readViewId,
      children: [],
    };

    return { ...data, ...serialized };
  }

  public set viewId(id: string | null) {
    if (!id) {
      return;
    }

    this._viewId = id;
    this._view = <View>this.getTree().createView(id, this.sheet);
  }

  public get viewId(): string | null {
    return this._viewId;
  }

  public set readViewId(id: string | null) {
    if (!id) {
      return;
    }

    this._readViewId = id;
    this._readView = <View>this.getTree().createView(id, this.sheet);
  }

  public get readViewId(): string | null {
    return this._readViewId;
  }

  public get view(): View {
    if (!this._view && this._viewId) {
      this._view = <View>this.getTree().createView(this._viewId, this.sheet);
    }

    return this._view;
  }

  public get readView(): View {
    if (!this._readView && this._readViewId) {
      this._readView = <View>(
        this.getTree().createView(this._readViewId, this.sheet)
      );
    }

    return this._readView;
  }

  public get viewList(): any {
    return this.getTree().viewSourceAsArray();
  }

  protected getTree() {
    return this.container.get<Tree>("SystemTree");
  }
}
