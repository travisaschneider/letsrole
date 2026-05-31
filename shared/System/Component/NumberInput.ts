import { Component } from "./Component";
import { Alignment } from "./Alignment";
import { WidgetAttributeError } from "../Error/WidgetAttributeError";
import { TooltipPlacement } from "./TooltipPlacement";
import { Konsole } from "../../Konsole";

export class NumberInput extends Component {
  public static readonly icon: string = "fas fa-calculator";
  public static readonly widgetName: string = "NumberInput";
  public static readonly attributeTemplate = "attribute-number-input.html.njk";

  protected _min: number = null;
  protected _max: number = null;
  protected _defaultValue: string = null;
  protected _align: Alignment = null;
  protected _computed = false;
  protected _computedValue: string = null;
  protected _computedProperty = "defaultValue";

  public render(): string {
    let min = "";
    let max = "";
    let readonly = "";
    let tooltip = "";

    if (this.min) {
      min = `min="${this.e(this.min)}"`;
    }

    if (this.max) {
      max = `max="${this.e(this.max)}"`;
    }

    if (this.readOnly) {
      readonly = "readonly disabled";
    }

    if (this.tooltip) {
      tooltip = `title="${this.translate(
        this.tooltipLabel
      )}" data-placement="${this.e(this.tooltipPlacement)}"`;
    }

    return `<input type="number" ${min} ${max} ${readonly} ${tooltip} value="${this.e(
      this.defaultValue
    )}"
           class="widget number form-control ${this.e(this.widgetClasses)}" ${
      this.renderAttributes
    }>`;
  }

  public transform(): number {
    if (!this.element) {
      Konsole.log("missing " + this.id);
      return 0;
    }

    const val = (this.element as HTMLInputElement).value;

    if (val === "") {
      return 0;
    }

    return parseFloat(val);
  }

  public isComputed(): boolean {
    return this.computed;
  }

  public reverseTransform(value: any): any {
    if (!value) {
      value = 0;
    }

    let newValue: number = parseInt(value.toString(), 10);

    if (this.min !== null && newValue < this.min) {
      newValue = this.min;
    }

    if (this.max !== null && newValue > this.max) {
      newValue = this.max;
    }

    if (isNaN(newValue)) {
      newValue = this.defaultValue;
    }

    const strValue = newValue.toString(10);

    if (strValue != (this.element as HTMLInputElement).value) {
      (this.element as HTMLInputElement).value = strValue;
    }

    return newValue;
  }

  public getClasses(): string[] {
    const classes = super.getClasses();

    if (this.align !== null) {
      switch (this.align) {
        case Alignment.Left:
          classes.push("text-left");
          break;
        case Alignment.Center:
          classes.push("text-center");
          break;
        case Alignment.Right:
          classes.push("text-right");
          break;
      }
    }

    if (!this.computed) {
      classes.push("persist");
    }

    if (this.tooltip === true) {
      classes.push("with-tooltip");
    }

    return classes;
  }

  public serialize(): any {
    const serialized: any = {
      min: this.min,
      max: this.max,
      defaultValue: this.defaultValue,
      align: this._align,
      computed: this._computed,
      computedValue: this._computedValue,
    };

    if (this.tooltip) {
      serialized.tooltip = this.tooltip;
    }

    if (this.tooltipLabel) {
      serialized.tooltipLabel = this.tooltipLabel;
    }

    if (this.tooltipPlacement !== TooltipPlacement.Top) {
      serialized.tooltipPlacement = this.tooltipPlacement;
    }

    return { ...serialized, ...super.serialize() };
  }

  get min(): any | null {
    return this._min;
  }

  set min(min: any | null) {
    if (min === "" || min === null) {
      this._min = null;
      return;
    }

    min = parseInt(min.toString(), 10);

    if (this.max) {
      if (min > this.max) {
        throw new WidgetAttributeError(
          "Minimum cannot be larger than the maximum"
        );
      }
    }

    this._min = min;
  }

  get computed(): boolean {
    return this._computed;
  }

  set computed(computed: boolean) {
    this._computed = computed;
  }

  get computedValue(): string {
    return this._computedValue;
  }

  set computedValue(value: string) {
    this._computedValue = value;
  }

  get max(): any | null {
    return this._max;
  }

  set max(max: any | null) {
    if (max === "" || max === null) {
      this._max = null;
      return;
    }

    max = parseInt(max.toString(), 10);

    if (this.min) {
      if (max < this.min) {
        throw new WidgetAttributeError(
          "Maximum cannot be smaller than the minimum"
        );
      }
    }

    this._max = max;
  }

  get defaultValue(): any | null {
    if (this._defaultValue === null || this._defaultValue === undefined) {
      return "";
    }

    return this._defaultValue;
  }

  set defaultValue(value: any | null) {
    if (value === "" || value === null) {
      this._defaultValue = null;
      return;
    }

    this._defaultValue = value;
  }

  get align(): any | null {
    return this._align;
  }

  set align(align: any | null) {
    if (align == "" || align == null) {
      this._align = null;
      return;
    }

    if (!(align in Alignment)) {
      throw new WidgetAttributeError("This alignment is not valid.");
    }

    this._align = align;
  }
}
