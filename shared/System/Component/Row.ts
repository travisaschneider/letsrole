import { Component } from "./Component";

export class Row extends Component {
  public static readonly icon: string = "fas fa-columns";
  public static readonly widgetName: string = "Row";
  public static readonly attributeTemplate = "attribute-row.html.njk";

  public render(): string {
    return `<div class="row widget ${this.e(this.widgetClasses)}" ${
      this.renderAttributes
    }>
            ${this.renderChildren()}
            </div>`;
  }
}
