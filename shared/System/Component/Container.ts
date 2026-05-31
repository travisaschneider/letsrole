import { Component } from "./Component";

export enum ContainerLayout {
  Horizontal = "horizontal",
  Vertical = "vertical",
}

export class Container extends Component {
  public static readonly icon: string = "fas fa-th-large";
  public static readonly widgetName: string = "Container";
  public static readonly attributeTemplate = "attribute-container.html.njk";

  public classes = "";
  public layout: ContainerLayout = ContainerLayout.Horizontal;

  public render(): string {
    return `<div class="widget widget-container ${this.e(
      this.widgetClasses
    )}" ${this.renderAttributes}>
            ${this.renderChildren()}
            </div>`;
  }

  public getClasses(): string[] {
    const classes = super.getClasses();

    classes.push("d-flex");

    if (this.layout === ContainerLayout.Horizontal) {
      classes.push("flex-row");
    } else {
      classes.push("flex-column");
    }

    return classes;
  }

  public serialize(): any {
    const serialized = super.serialize();

    const values = {
      layout: this.layout,
    };

    return { ...serialized, ...values };
  }
}
