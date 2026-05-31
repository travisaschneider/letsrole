import { Component } from "./Component";
import { ComponentError } from "./ComponentError";

export class Column extends Component {
  public static readonly icon: string = "fas fa-grip-lines-vertical";
  public static readonly widgetName: string = "Column";
  public static readonly attributeTemplate = "attribute-column.html.njk";

  protected _size: number = null;

  public render(): string {
    const siz: string = this.size ? "-" + this.size.toString() : "";

    const html = `<div class="widget col${this.e(siz)} ${this.e(
      this.widgetClasses
    )}" ${this.renderAttributes}>
            ${this.renderChildren()}
            </div>`;

    return html;
  }

  public serialize(): any {
    const serialized = {
      size: this.size,
    };

    return { ...serialized, ...super.serialize() };
  }

  public validateProperties(): ComponentError[] {
    const errors: ComponentError[] = super.validateProperties();

    if (this.size != null) {
      const allowed = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

      if (allowed.indexOf(this.size) == -1) {
        errors.push({
          id: "size",
          message: "size should be an integer between 1 and 12",
        });
      }
    }

    return errors;
  }

  set size(size: any | null) {
    if (!size) {
      this._size = null;
      return;
    }

    size = parseInt(size.toString(), 10);

    this._size = size;
  }

  get size(): any | null {
    return this._size;
  }
}
