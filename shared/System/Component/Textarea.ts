import { Component } from "./Component";

export class Textarea extends Component {
  public static readonly icon: string = "fas fa-paragraph";
  public static readonly widgetName: string = "Textarea";
  public static readonly attributeTemplate = "attribute-textarea.html.njk";

  protected _computedProperty = "defaultValue";
  protected _defaultValue: string;
  public placeholder: string;
  public computed = false;

  public get defaultValue(): string {
    return this._defaultValue;
  }

  public set defaultValue(defaultValue: string) {
    this._defaultValue = defaultValue;
  }

  public render(): string {
    let readonly = "";
    let placeholder = "";

    if (this.readOnly) {
      readonly = "readonly disabled";
    }

    if (this.placeholder) {
      placeholder = `placeholder="${this.translate(placeholder)}"`;
    }

    return `<textarea class="widget textarea form-control ${this.e(
      this.widgetClasses
    )}" ${this.renderAttributes} ${placeholder} ${readonly}>${this.translate(
      this.defaultValue
    )}</textarea>`;
  }

  public extractMessages(): string[] {
    return [this.defaultValue, this.placeholder, ...super.extractMessages()];
  }

  public serialize(): any {
    const serialized = super.serialize();

    const data = {
      placeholder: this.placeholder,
      defaultValue: this.defaultValue,
      computed: this.computed,
    };

    return { ...data, ...serialized };
  }

  public getClasses(): string[] {
    const classes = super.getClasses();

    if (!this.computed) {
      classes.push("persist");
    }

    return classes;
  }
}
