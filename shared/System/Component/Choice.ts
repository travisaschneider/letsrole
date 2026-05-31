import { Tables } from "../Tables";
import { Table, TableLine } from "../Table/Table";
import { ContainerAwareComponent } from "./ContainerAwareComponent";

export class Choice extends ContainerAwareComponent {
  public static readonly icon: string = "fas fa-list-ul";
  public static readonly widgetName: string = "Choice";
  public static readonly attributeTemplate = "attribute-choice.html.njk";

  protected _table: Table = null;
  protected _tableId: string = null;
  protected _customChoices: any;

  public label: string = null;
  public optional = false;
  public expanded = false;
  public multiple = false;
  public expandedClass = "";

  public initialize(element: HTMLElement) {
    super.initialize(element);

    this.renderContent();
  }

  public render(): string {
    if (this.expanded) {
      const multipleClass: string = this.multiple ? "multiple" : "";
      return `<div class="widget choice ${multipleClass} ${this.e(
        this.widgetClasses
      )}" ${this.renderAttributes}></div>`;
    }

    const readOnly = this.readOnly ? "readonly disabled" : "";

    return `<select class="widget choice form-control ${this.e(
      this.widgetClasses
    )}"
            ${this.renderAttributes} ${readOnly}>
            </select>`;
  }

  protected renderContent() {
    if (this.expanded) {
      let html = "";
      const globalRandomId: string = this.sheet.generateRandomString(16);

      for (const key in this.choices) {
        const readOnly: string = this.readOnly ? "readonly disabled" : "";
        const lbl: string = this.choices[key];
        const randomId: string = this.sheet.generateRandomString(16);

        html += `<div class="${this.e(this.expandedClass)}">
                    <div class="sub-choice form-check">`;

        if (this.multiple) {
          html += `<input type="checkbox" name="${globalRandomId}" data-key="${this.e(
            key
          )}" id="${randomId}" ${readOnly} class="form-check-input">`;
        } else {
          html += `<input type="radio" name="${globalRandomId}" data-key="${this.e(
            key
          )}" id="${randomId}" ${readOnly} class="form-check-input">`;
        }

        html += `<label for="${randomId}" class="form-check-label">${this.translate(
          lbl
        )}</label>
                    </div>
                    </div>`;
      }

      this.element.innerHTML = html;
    } else {
      let html = "";

      for (const key in this.choices) {
        const lbl: string = this.choices[key];
        html += `<option value="${this.e(key)}">${this.translate(
          lbl
        )}</option>`;
      }

      this.element.innerHTML = html;
    }
  }

  public initWidgetOptions(container: HTMLElement) {
    const tableSelect: HTMLSelectElement =
      container.querySelector('[name="tableId"]');
    const labelSelect: HTMLSelectElement =
      container.querySelector('[name="label"]');

    const onChange = () => {
      const tableId: string = tableSelect.value;

      if (!tableId) {
        return;
      }

      const table: Table = this.getTables().get(tableId);

      labelSelect.innerHTML = "";

      table.columns.forEach((column: string) => {
        const option: HTMLOptionElement = document.createElement("option");
        option.value = column;
        option.innerText = column;

        if (column == this.label) {
          option.selected = true;
        }

        labelSelect.appendChild(option);
      });
    };

    if (tableSelect) {
      tableSelect.addEventListener("change", onChange);
    }

    onChange();
  }

  public transformForDisplay(value: any): any {
    if (!this.table) {
      return "";
    }

    const val = this.table.get(value);

    if (!val) {
      return "";
    }

    return val[this.label];
  }

  public getClasses(): string[] {
    const classes = super.getClasses();
    classes.push("persist");

    return classes;
  }

  public serialize(): any {
    const serialized = super.serialize();

    const values = {
      label: this.label,
      tableId: this.tableId,
      optional: this.optional,
      expanded: this.expanded,
      multiple: this.multiple,
      expandedClass: this.expandedClass,
    };

    return { ...serialized, ...values };
  }

  public extractMessages(): string[] {
    const messages: string[] = [];
    const choices: any = this.choices;

    for (const i in choices) {
      messages.push(choices[i]);
    }
    messages.push(...super.extractMessages());

    return messages;
  }

  public set tableId(id: string) {
    this._tableId = id;
    this._table = this.getTables().get(id);
  }

  public get tableId(): string {
    return this._tableId;
  }

  public get table(): Table | null {
    if (!this._table && this.tableId) {
      this._table = this.getTables().get(this.tableId);
    }

    return this._table;
  }

  public get tables(): any[] {
    return this.getTables().toArray();
  }

  public get choices(): any {
    const choices = {};

    if (this._customChoices) {
      return this._customChoices;
    }

    if (!this.table) {
      return {};
    }

    const data = this.table.data;

    if (this.optional) {
      choices["0"] = "";
    }

    for (const i in data) {
      const id = data[i].id;
      const value = data[i][this.label];

      choices[id] = value;
    }

    return choices;
  }

  public setChoices(choices: any, element: HTMLElement) {
    this._customChoices = choices;
    this.renderContent();
  }

  public getSelectedLabel(): string | null {
    if (!this.expanded || !this.multiple) {
      const value: string = this.transform();

      return this.choices[value];
    }

    return null;
  }

  protected getTables(): Tables {
    return this.container.get<Tables>("SystemTables");
  }

  public transform(): any {
    const element: HTMLElement = this.element;

    if (this.expanded) {
      if (this.multiple) {
        const result: string[] = [];

        element
          .querySelectorAll('[type="checkbox"]')
          .forEach((checkbox: HTMLInputElement) => {
            if (checkbox.checked) {
              result.push(checkbox.dataset.key);
            }
          });

        return result;
      } else {
        let result: string = null;

        element
          .querySelectorAll('[type="radio"]')
          .forEach((radio: HTMLInputElement) => {
            if (radio.checked) {
              result = radio.dataset.key;

              if (result === "0") {
                result = null;
              }
            }
          });

        return result;
      }
    } else {
      const e = <HTMLSelectElement>element;
      return e.options[e.selectedIndex].value;
    }
  }

  public reverseTransform(value: any): any {
    if (this.expanded) {
      if (this.multiple) {
        if (Array.isArray(value)) {
          value.forEach((val: string) => {
            const input: HTMLInputElement = this.element.querySelector(
              'input[data-key="' + val + '"]'
            ) as HTMLInputElement;

            if (input) {
              input.checked = true;
            }
          });
        }
      } else {
        const input: HTMLInputElement = this.element.querySelector(
          'input[data-key="' + value + '"]'
        ) as HTMLInputElement;

        if (input) {
          input.checked = true;
        }
      }
    } else {
      const e = <HTMLSelectElement>this.element;
      e.value = value;
    }

    return value;
  }
}
