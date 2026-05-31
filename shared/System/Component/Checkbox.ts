import { Component } from "./Component";

export class Checkbox extends Component {
  public static readonly icon: string = "fas fa-check-square";
  public static readonly widgetName: string = "Checkbox";
  public static readonly attributeTemplate = "attribute-checkbox.html.njk";

  public label = "";

  protected _randomId;

  public render(): string {
    const randomId: string = this.generateRandomId();

    let html = `
            <div class="custom-control checkbox-inline custom-checkbox ${this.e(
              this.widgetClasses
            )}">
            <input type="checkbox" class="widget checkbox custom-control-input persist" ${
              this.renderAttributes
            } id="checkbox-${randomId}"`;

    if (this.readOnly) {
      html += "readonly disabled";
    }

    html += `>
            <label class="custom-control-label" for="checkbox-${randomId}">${this.translate(
      this.label
    )}</label>
            </div>`;

    return html;
  }

  public generateRandomId(): string {
    this._randomId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    return this._randomId;
  }

  public extractMessages(): string[] {
    return [this.label, ...super.extractMessages()];
  }

  public serialize(): any {
    const serialized = super.serialize();

    const data = {
      label: this.label,
    };

    return { ...data, ...serialized };
  }

  public get randomId(): string {
    return this._randomId;
  }

  public getClasses(): string[] {
    const classes = super.getClasses();
    classes.push("persist");

    return classes;
  }

  public transform(): any {
    return (this.element as HTMLInputElement).checked;
  }

  public reverseTransform(value: any): any {
    if (value) {
      (this.element as HTMLInputElement).checked = true;
      return true;
    }

    (this.element as HTMLInputElement).checked = false;

    return false;
  }

  public hide() {
    const parent = this._element.closest(".custom-checkbox");
    parent.classList.add("d-none");
    this._hidden = true;
  }

  public show() {
    const parent = this._element.closest(".custom-checkbox");
    parent.classList.remove("d-none");
    this._hidden = false;
  }
}
