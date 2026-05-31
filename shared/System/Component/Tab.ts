import { ContainerAwareComponent } from "./ContainerAwareComponent";
import { Table, TableLine } from "../Table/Table";
import { Tables } from "../Tables";
import { Tree } from "../Tree";
import { View } from "./View";
import { Component } from "./Component";
import { CharacterSheet } from "../CharacterSheet";

export class Tab extends ContainerAwareComponent {
  public static readonly icon: string = "fas fa-window-maximize";
  public static readonly widgetName: string = "Tab";
  public static readonly attributeTemplate = "attribute-tab.html.njk";

  public vertical = false;
  protected _verticalWidth = 3;
  protected _verticalText = false;
  protected _verticalAlign = "left";

  protected _table: Table = null;
  protected _tableId: string = null;
  private _titleAttribute: string = null;
  private _viewAttribute: string = null;

  public initialize(element: HTMLElement) {
    super.initialize(element);

    const content: HTMLElement = element.querySelector(".tab-content");

    this.children = this.createViewComponents();

    let html = "";
    let first = true;

    for (const i in this.children) {
      const view: Component = this.children[i];
      const fullId: string = this.e(this.id) + "-" + this.e(view.id);

      let active = "";

      if (first) {
        active = "active";
      }

      first = false;

      html += `<div class="tab-pane ${active}" id="${fullId}" role="tabpanel" aria-labelledby="${fullId}-tab" data-view-id="${view.id}">`;
      html += view.render();
      html += "</div>";
    }

    content.innerHTML = html;

    this.sheet.initView(content);

    const $ = window["$"];

    element
      .querySelectorAll(".nav-tabs a")
      .forEach((tab: HTMLAnchorElement) => {
        tab.dataset.target =
          "#" + this.sheet.getContainerId() + " " + tab.dataset.destination;

        tab.addEventListener("click", (e) => {
          e.preventDefault();
          $(e.currentTarget).tab("show");
        });
      });
  }

  public render(): string {
    let html = `<div class="tab widget ${this.e(this.widgetClasses)}" ${
      this.renderAttributes
    }>`;

    if (this.vertical) {
      let col = "";

      if (!this.verticalText) {
        col = `col-${this.e(this.verticalWidth)}`;
      }

      html += `<div class="row no-gutters">
                <div class="${col} col-tabs">`;
    }

    let navClasses = "";

    if (this.vertical) {
      navClasses = "flex-column vertical-tabs";
    }

    html += `<ul class="nav nav-tabs ${navClasses}" id="tabs-${this.e(
      this.id
    )}" role="tablist">`;

    let first = true;
    const titles = this.titles();

    for (const key in titles) {
      let active = "";
      const name: string = this.translate(titles[key]);
      const fullId: string = this.e(this.id) + "-" + this.e(key);

      if (first) {
        active = "active";
      }

      html += `<li class="nav-item">
                <a class="nav-link ${active}" id="${fullId}-tab" href="#" data-destination="#${fullId}" role="tab" aria-controls="${fullId}" aria-selected="true">${name}</a>
                </li>`;

      first = false;
    }

    html += "</ul>";

    if (this.vertical) {
      html += '</div><div class="col">';
    }

    html += '<div class="tab-content"></div>';

    if (this.vertical) {
      html += "</div></div>";
    }

    html += "</div>";

    return html;
  }

  public initWidgetOptions(container: HTMLElement) {
    const tableSelect: HTMLSelectElement =
      container.querySelector('[name="tableId"]');
    const titleSelect: HTMLSelectElement = container.querySelector(
      '[name="titleAttribute"]'
    );
    const viewSelect: HTMLSelectElement = container.querySelector(
      '[name="viewAttribute"]'
    );
    const verticalCheck: HTMLInputElement =
      container.querySelector('[name="vertical"]');
    const verticalTextCheck: HTMLInputElement = container.querySelector(
      '[name="verticalText"]'
    );
    const verticalAlignSelect: HTMLSelectElement = container.querySelector(
      '[name="verticalAlign"]'
    );
    const verticalWidthInput: HTMLInputElement = container.querySelector(
      '[name="verticalWidth"]'
    );

    const onChange = () => {
      const tableId: string = tableSelect.value;

      if (!tableId) {
        return;
      }

      const table: Table = this.getTables().get(tableId);

      titleSelect.innerHTML = "";

      table.columns.forEach((column: string) => {
        const option: HTMLOptionElement = document.createElement("option");
        option.value = column;
        option.innerText = column;

        if (column == this.titleAttribute) {
          option.selected = true;
        }

        titleSelect.appendChild(option);
      });

      viewSelect.innerHTML = "";

      table.columns.forEach((column: string) => {
        const option: HTMLOptionElement = document.createElement("option");
        option.value = column;
        option.innerText = column;

        if (column == this.viewAttribute) {
          option.selected = true;
        }

        viewSelect.appendChild(option);
      });
    };

    const onVerticalChange = () => {
      if (verticalCheck.checked) {
        (
          verticalTextCheck.closest(".form-group") as HTMLElement
        ).classList.remove("d-none");
        (
          verticalAlignSelect.closest(".form-group") as HTMLElement
        ).classList.remove("d-none");

        if (verticalTextCheck.checked) {
          (
            verticalWidthInput.closest(".form-group") as HTMLElement
          ).classList.add("d-none");
        } else {
          (
            verticalWidthInput.closest(".form-group") as HTMLElement
          ).classList.remove("d-none");
        }
      } else {
        (verticalTextCheck.closest(".form-group") as HTMLElement).classList.add(
          "d-none"
        );
        (
          verticalAlignSelect.closest(".form-group") as HTMLElement
        ).classList.add("d-none");
        (
          verticalWidthInput.closest(".form-group") as HTMLElement
        ).classList.add("d-none");
      }
    };

    tableSelect.addEventListener("change", onChange);
    verticalCheck.addEventListener("change", onVerticalChange);
    verticalTextCheck.addEventListener("change", onVerticalChange);

    onChange();
    onVerticalChange();
  }

  public getClasses(): string[] {
    const classes: string[] = super.getClasses();

    if (this.vertical) {
      if (this.verticalAlign === "right") {
        classes.push("vertical-align-right");
      } else {
        classes.push("vertical-align-left");
      }

      if (this.verticalText) {
        classes.push("vertical-text");
      } else {
        classes.push("horizontal-text");
      }
    }

    return classes;
  }

  public serialize(): any {
    const serialized = {
      tableId: this.tableId,
      titleAttribute: this.titleAttribute,
      viewAttribute: this.viewAttribute,
      vertical: this.vertical,
      verticalWidth: this.verticalWidth,
      verticalText: this.verticalText,
      verticalAlign: this.verticalAlign,
      children: [],
    };

    return Object.assign(super.serialize(), serialized);
  }

  public get verticalWidth(): number {
    if (!this._verticalWidth) {
      return 3;
    }

    if (this._verticalWidth > 11) {
      return 11;
    }

    if (this._verticalWidth < 1) {
      return 1;
    }

    return this._verticalWidth;
  }

  public set verticalWidth(width: number) {
    this._verticalWidth = parseInt(width.toString(10), 10);
  }

  public get verticalText(): boolean {
    return this._verticalText;
  }

  public set verticalText(vertical: boolean) {
    this._verticalText = vertical;
  }

  public get verticalAlign(): string {
    return this._verticalAlign;
  }

  public set verticalAlign(align: string) {
    if (align !== "right") {
      align = "left";
    }

    this._verticalAlign = align;
  }

  public titles(): any {
    const table = this.table;
    const data: any = {};

    if (!table || !this.titleAttribute) {
      return data;
    }

    table.data.forEach((line: TableLine) => {
      data[line[this.viewAttribute]] = line[this.titleAttribute];
    });

    return data;
  }

  public extractMessages(): string[] {
    const messages: string[] = [];
    const titles: any = this.titles();

    for (const i in titles) {
      messages.push(titles[i]);
    }
    messages.push(...super.extractMessages());

    return messages;
  }

  public createViewComponents(): View[] {
    const table = this.table;

    const views: View[] = [];

    if (!table || !this.viewAttribute) {
      return views;
    }

    table.data.forEach((line: TableLine) => {
      const viewId: string = line[this.viewAttribute];
      const view: View = this.container
        .get<Tree>("SystemTree")
        .createView(viewId, this.sheet);

      if (view === null) {
        return;
      }

      if (this.readOnly) {
        view.readOnly = true;
      }

      views.push(view);
    });

    return views;
  }

  public reverseTransform(value: any): any {
    const items = this.element.querySelector("#tabs-" + this.id);
    const navLink: HTMLElement = items.querySelector(
      "#" + this.id + "-" + value + "-tab"
    );

    if (navLink) {
      window["$"](navLink).tab("show");
    }
  }

  public transform(): any {
    const active: HTMLElement = this.element.querySelector(".tab-pane.active");

    if (active) {
      return active.dataset.viewId;
    }

    return null;
  }

  public find(id: string, sheet: CharacterSheet = null): Component | null {
    const views = this.children;

    for (const i in views) {
      const found = views[i].find(id);

      if (found) {
        return found;
      }
    }

    return null;
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

  get titleAttribute(): string {
    return this._titleAttribute;
  }

  set titleAttribute(value: string) {
    this._titleAttribute = value;
  }

  get viewAttribute(): string {
    return this._viewAttribute;
  }

  set viewAttribute(value: string) {
    this._viewAttribute = value;
  }

  protected getTables(): Tables {
    return this.container.get<Tables>("SystemTables");
  }
}
