import { Component } from "./Component";
import { IconList, IconLib } from "../../IconList";

export class Icon extends Component {
  public static readonly icon: string = "fas fa-dice";
  public static readonly widgetName: string = "Icon";
  public static readonly attributeTemplate = "attribute-icon.html.njk";

  protected _roll = "";
  protected _rollTitle = "";

  public iconName = "";

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
            title: this.rollTitle ? this.rollTitle : "Untitled",
          },
          bubbles: true,
          cancelable: true,
        });

        element.dispatchEvent(rollEvent);
      });
    }
  }

  protected getIconClasses(iconName: string): string {
    let name = iconName;
    const icParts = name.split("_");
    let iconLib = IconLib._default_;

    if (icParts.length > 1 && icParts[0] in IconLib) {
      iconLib = IconLib[icParts[0]];
      name = icParts[1];
    }

    return `pict ${iconLib.baseSelector} ${iconLib.classPrefix}${name}`;
  }

  public render(): string {
    const ic: string = this.iconName ? this.iconName : "dice";
    const iconClass = this.getIconClasses(ic);

    return `<span class="widget icon ${this.e(this.widgetClasses)}" ${
      this.renderAttributes
    }>
            <i class="${iconClass}"></i>
            </span>`;
  }

  public transform(): any {
    return this.iconName;
  }

  public reverseTransform(value: any): any {
    if (this.isIconValid(value)) {
      const icon: HTMLElement =
        this.element.querySelector<HTMLElement>("i.pict")!;
      icon.className = this.getIconClasses(value);
    }
  }

  public extractMessages(): string[] {
    return [this.rollTitle, ...super.extractMessages()];
  }

  public getClasses(): string[] {
    const classes = super.getClasses();

    if (this.roll && !this.readOnly) {
      classes.push("clickable");
    }

    return classes;
  }

  public serialize(): any {
    const serialized = super.serialize();

    const values = {
      iconName: this.iconName,
      roll: this.roll,
      rollTitle: this.rollTitle,
    };

    return { ...serialized, ...values };
  }

  public set roll(roll: string) {
    this._roll = roll;
  }

  public get roll(): string {
    return this._roll;
  }

  public set rollTitle(title: string) {
    this._rollTitle = title;
  }

  public get rollTitle(): string {
    return this._rollTitle;
  }

  public isIconValid(name: string) {
    return IconList.indexOf(name) >= 0;
  }

  public initWidgetOptions(container: HTMLElement) {
    const dropdown = container.querySelector("div.dropdown");

    if (!dropdown) return;

    const button = dropdown.querySelector<HTMLButtonElement>(
      "button.dropdown-toggle"
    );
    const iconDiv = dropdown.querySelector<Element>(".dropdown-menu-list");

    const icons: HTMLAnchorElement[] = [];

    IconList.forEach((icon: string) => {
      const item: HTMLAnchorElement = document.createElement("a");
      item.className = "dropdown-item";
      item.setAttribute("data-value", icon);
      item.href = "#";
      const iElt: HTMLElement = document.createElement("i");
      iElt.className = this.getIconClasses(icon);
      item.append(iElt, document.createTextNode(icon));

      icons.push(item);
    });

    if (button) {
      button.innerText = this.iconName;
    }

    if (iconDiv) {
      // TODO fix with spead operator
      // eslint-disable-next-line prefer-spread
      iconDiv.append.apply(iconDiv, icons);
    }
  }
}
