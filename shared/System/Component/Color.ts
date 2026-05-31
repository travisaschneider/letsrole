import { Component } from "./Component";
import { CharacterColors } from "../../Scene/SceneData";

export class Color extends Component {
  public static readonly icon: string = "fas fa-palette";
  public static readonly widgetName: string = "Color";
  public static readonly attributeTemplate = "attribute-color.html.njk";

  public get colors(): any {
    return CharacterColors;
  }

  public render(): string {
    let html = `<div class="widget-color-container">
            <div class="dropdown">
            <button class="btn btn-secondary dropdown-toggle btn-block btn-sm" type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <i class="fas fa-palette"></i> Color
            </button>`;

    if (!this.readOnly) {
      html += `<div class="dropdown-menu bg-dark text-light p-1" aria-labelledby="dropdownMenuButton"><div class="row no-gutters">`;

      for (const key in this.colors) {
        const color: string = this.colors[key];

        html += `<div class="col-4 p-1">
                    <div class="color-picker-item" data-color="${key}" style="border-color: ${color}; background: ${color};"></div>
                    </div>`;
      }

      html += "</div></div>";
    }

    html += `</div>
            <input type="hidden" ${
              this.renderAttributes
            } class="widget color ${this.e(this.widgetClasses)}">
            </div>`;

    return html;
  }

  public initialize(element: HTMLElement) {
    super.initialize(element);

    const container: HTMLElement = element.closest(
      ".widget-color-container"
    ) as HTMLElement;
    const hidden: HTMLInputElement = container.querySelector(
      'input[type="hidden"]'
    );

    container
      .querySelectorAll(".color-picker-item")
      .forEach((picker: HTMLElement) => {
        picker.addEventListener("click", (e) => {
          hidden.value = picker.dataset.color;

          const event: Event = new Event("change");
          hidden.dispatchEvent(event);
        });
      });
  }

  public getClasses(): string[] {
    const classes = super.getClasses();
    classes.push("persist");

    return classes;
  }

  public reverseTransform(value: any): any {
    const container: HTMLElement = this.element.closest(
      ".widget-color-container"
    ) as HTMLElement;
    const color: string = value;
    const button: HTMLElement = container.querySelector("button");
    const hues: string = this.colors[color] || null;

    if (hues === null) {
      button.style.backgroundColor = null;
      button.style.color = "#fff";
    } else {
      button.style.backgroundColor = hues;
      button.style.color = "#fff";
    }

    return color;
  }
}
