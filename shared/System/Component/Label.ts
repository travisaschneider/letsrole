import { Component } from "./Component";
import { Alignment } from "./Alignment";
import { WidgetAttributeError } from "../Error/WidgetAttributeError";
import { TooltipPlacement } from "./TooltipPlacement";
import { MarkdownParser } from "../../MarkdownParser";
import { IconLib } from "../../IconList";

export class Label extends Component {
  public static readonly icon: string = "fas fa-align-justify";
  public static readonly widgetName: string = "Label";
  public static readonly attributeTemplate = "attribute-label.html.njk";

  protected _align: Alignment | null = null;
  protected _roll: string = null;
  protected _computedProperty = "text";

  public clickable = false;
  public quickBar = false;
  public quickBarLabel: string;
  public text = "";
  public isTemplate = false;
  public computed = false;
  public markdown = false;

  public initialize(element: HTMLElement) {
    super.initialize(element);

    if (this.roll) {
      element.addEventListener("click", (e) => {
        const rollEvent = new CustomEvent("roll", {
          detail: {
            expression: this.sheet.referencer.renderRoll(
              this.roll,
              this.getContext()
            ),
            title: this.renderValue(),
          },
          bubbles: true,
          cancelable: true,
        });

        element.dispatchEvent(rollEvent);
      });
    }
  }

  public render(): string {
    let tooltip = "";
    let draggable = "";

    if (this.tooltip) {
      tooltip = `title="${this.translate(
        this.tooltipLabel
      )}" data-placement="${this.e(this.tooltipPlacement)}"`;
    }

    if (this.quickBar) {
      draggable = 'draggable="true"';
    }

    return `<p class="widget label ${this.e(this.widgetClasses)}" ${tooltip} ${
      this.renderAttributes
    } ${draggable}>${this.applyMarkdown(
      this.translateNoEscape(this.text)
    )}</p>`;
  }

  public isComputed(): boolean {
    return this.computed;
  }

  public extractMessages(): string[] {
    return [this.quickBarLabel, this.text, ...super.extractMessages()];
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

    if ((this.clickable || this.roll) && !this.readOnly) {
      classes.push("clickable");
    }

    if (this.quickBar) {
      classes.push("can-quick-bar");
    }

    if (this.tooltip === true) {
      classes.push("with-tooltip");
    }

    return classes;
  }

  public serialize(): any {
    const serialized: any = {
      text: this.text,
      align: this.align,
      clickable: this.clickable,
      quickBar: this.quickBar,
      quickBarLabel: this.quickBarLabel,
      isTemplate: this.isTemplate,
      computed: this.computed,
      roll: this.roll,
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

    if (this.markdown) {
      serialized.markdown = true;
    }

    return { ...serialized, ...super.serialize() };
  }

  public get roll(): string {
    return this._roll;
  }

  public set roll(roll: string) {
    this._roll = roll;
  }

  public applyMarkdown(value: string): string {
    return this.transformValue(value);
  }

  public reverseTransform(value: any): any {
    if (this.markdown) {
      this.element.innerHTML = this.transformValue(value);
    } else {
      this.element.innerHTML = this.nl2br(this.e(value));
    }
  }

  public nl2br(str) {
    return str.split("\n").join("<br />");
  }

  public transform(): any {
    return this.element.innerText;
  }

  public transformValue(value: any): string {
    let newValue = this.e(value);

    if (this.markdown) {
      newValue = this.nl2br(newValue);
      newValue = MarkdownParser.parse(newValue);
      newValue = this.replaceIcons(newValue);

      return newValue;
    }

    return newValue;
  }

  public replaceIcons(str) {
    let result = str;

    for (const iconLibName in IconLib) {
      // eslint-disable-next-line no-useless-escape
      const regexp = new RegExp(`:${iconLibName}_([\\w-]+):`, "gm");
      result = result.replace(
        regexp,
        `<i class="${IconLib[iconLibName].baseSelector} ${IconLib[iconLibName].classPrefix}$1"></i>`
      );
    }

    // eslint-disable-next-line no-useless-escape
    return result.replace(
      /:([\w-]+):/gm,
      `<i class="${IconLib._default_.baseSelector} ${IconLib._default_.classPrefix}$1"></i>`
    );
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
