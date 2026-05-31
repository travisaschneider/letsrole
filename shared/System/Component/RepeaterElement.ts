import { View } from "./View";
import { Tree } from "../Tree";
import { ContainerAwareComponent } from "./ContainerAwareComponent";

export class RepeaterElement extends ContainerAwareComponent {
  public readViewId: string;
  public writeViewId: string;
  public inContext = true;

  protected _currentView: View;

  public initialize(element: HTMLElement) {
    super.initialize(element);

    const editBtn: HTMLElement =
      this.element.querySelector(".btn-repeater-edit");
    const doneBtn: HTMLElement = this.element.querySelector(".done-btn");
    const deleteBtn: HTMLElement = this.element.querySelector(".delete-btn");

    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.preventDefault();

        if (this._currentView) {
          this._currentView.remove();
        }

        this.transformForEdit();
      });
    }

    if (doneBtn) {
      doneBtn.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          this.removeAllChildren();
          this.sheet.initElement(this.element);
          this.element.classList.remove("editing");
          this.element.dispatchEvent(
            new Event("update", {
              bubbles: true,
            })
          );
        },
        { once: true }
      );
    }

    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.sheet.deleteRepeaterEntry(this);
      });
    }
  }

  public render(): string {
    let edit = "";

    if (!this.readOnly) {
      edit = `<div class="read-options">
                <div class="flex-shrink-1 text-nowrap">
                <a href="#" class="btn-repeater-edit" data-for="${this.e(
                  this.idWithContext
                )}" data-row-id="${this.e(
        this.id
      )}"><i class="fas fa-pen"></i></a>
                </div>
                </div>`;
    }

    return `<div class="widget read-element repeater-element mb-2" data-widget-id="${this.e(
      this.idWithContext
    )}" data-row-id="${this.e(this.id)}" data-widget-type="RepeaterElement">
            <div class="d-flex flex-row justify-content-between align-self-center">
            <div class="flex-grow-1 mr-2 render-container">
            </div>
            ${edit}
            </div>

            <div class="write-options">
            <div class="d-flex mt-1">
            <a href="#" class="btn text-muted btn-sm delete-btn" title="${this.translate(
              "Delete"
            )}"><i class="fas fa-trash-alt"></i></a>
            <a href="#" class="btn btn-secondary btn-sm done-btn ml-auto">${this.translate(
              "Done"
            )}</a>
            </div>
            </div>
            </div>`;
  }

  public reverseTransform(value: any): any {
    this.removeAllChildren();

    const view: View = this.createReadView();
    view.context = value;
    view.parent = this;

    this._currentView = view;

    this.addChild(view);

    this.element.querySelector(".render-container").innerHTML = view.render();
    this.element.querySelector(".read-options").classList.remove("d-none");
    this.element.querySelector(".write-options").classList.add("d-none");

    this.sheet.initView(this.element);
  }

  public transformForEdit() {
    this.removeAllChildren();

    const view = this.createWriteView();
    view.parent = this;

    this._currentView = view;

    this.addChild(view);

    const container: HTMLElement =
      this.element.querySelector(".render-container");
    container.innerHTML = view.render();

    this.element.querySelector(".read-options").classList.add("d-none");
    this.element.querySelector(".write-options").classList.remove("d-none");
    this.element.classList.add("editing");

    this.sheet.initView(this.element);

    container
      .querySelectorAll(".widget.choice")
      .forEach((choice: HTMLSelectElement) => {
        choice.dispatchEvent(new Event("change"));
      });
  }

  public createWriteView(): View {
    return this.getTree().createView(this.writeViewId, this.sheet);
  }

  public createReadView(): View {
    return this.getTree().createView(this.readViewId, this.sheet);
  }

  protected getTree() {
    return this.container.get<Tree>("SystemTree");
  }
}
