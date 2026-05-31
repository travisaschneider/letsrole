import { Component } from "./Component";
import { TooltipPlacement } from "./TooltipPlacement";

export class TextInput extends Component {
  public static readonly icon: string = "fas fa-font";
  public static readonly widgetName: string = "TextInput";
  public static readonly attributeTemplate = "attribute-text-input.html.njk";

  protected _defaultValue: string;
  protected _computedProperty = "defaultValue";

  public placeholder: string;
  public computed = false;

  public render(): string {
    let placeholder = "";
    let tooltip = "";
    let readonly = "";

    if (this.placeholder) {
      placeholder = `placeholder="${this.translate(this.placeholder)}"`;
    }

    if (this.tooltip) {
      tooltip = `title="${this.translate(
        this.tooltipLabel
      )}" data-placement="${this.e(this.tooltipPlacement)}"`;
    }

    if (this.readOnly) {
      readonly = "readonly disabled";
    }

    return `<input type="text"
           class="widget text-input form-control ${this.e(this.widgetClasses)}"
           value="${this.translate(this.defaultValue)}"
           ${this.renderAttributes}
           ${placeholder} ${tooltip} ${readonly}
            >`;
  }

  public isComputed(): boolean {
    return this.computed;
  }

  public get defaultValue(): string {
    return this._defaultValue;
  }

  public set defaultValue(defaultValue: string) {
    this._defaultValue = defaultValue;
  }

  public extractMessages(): string[] {
    return [this.defaultValue, this.placeholder, ...super.extractMessages()];
  }

  public serialize(): any {
    const serialized = super.serialize();

    const data: any = {
      placeholder: this.placeholder,
      defaultValue: this.defaultValue,
      computed: this.computed,
    };

    if (this.tooltip) {
      data.tooltip = this.tooltip;
    }

    if (this.tooltipLabel) {
      data.tooltipLabel = this.tooltipLabel;
    }

    if (this.tooltipPlacement !== TooltipPlacement.Top) {
      data.tooltipPlacement = this.tooltipPlacement;
    }

    return { ...data, ...serialized };
  }

  public getClasses(): string[] {
    const classes = super.getClasses();

    if (!this.computed) {
      classes.push("persist");
    }

    if (this.tooltip === true) {
      classes.push("with-tooltip");
    }

    return classes;
  }
}
