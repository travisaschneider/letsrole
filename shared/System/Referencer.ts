import { parse } from "../reference";
import { Component } from "./Component/Component";
import { SharedAdapter } from "./SharedAdapter";
import { Tree } from "./Tree";
import { ReferenceList } from "./ReferenceList";
import { Tables } from "./Tables";
import { Table } from "./Table/Table";
import { Konsole } from "../Konsole";
import { CharacterSheet, SheetItem } from "./CharacterSheet";

interface Variables {
  [name: string]: string;
}

export class Referencer {
  protected sheet: CharacterSheet;

  public constructor(sheet: CharacterSheet) {
    this.sheet = sheet;
  }

  public render(
    content: string,
    context: any = {},
    references: ReferenceList = null
  ): any {
    return this.renderItem(content, context, references);
  }

  public renderRoll(expression: string, context: any = {}): string {
    try {
      // eslint-disable-next-line no-useless-escape
      const regexp = RegExp(/(\@|\$|\#)(\w+)/, "gi");
      let matches;
      const found: string[] = [];

      while ((matches = regexp.exec(expression)) !== null) {
        found.push(matches[0]);
      }

      found.forEach((value: string) => {
        while (expression.indexOf(value) >= 0) {
          expression = expression.replace(
            value,
            this.renderItem(value, context, null, true)
          );
        }
      });
    } catch (e) {
      Konsole.log("An error happened during roll parsing : ", e);
    }

    return expression;
  }

  public renderItem(
    content: string,
    context: any = {},
    references: ReferenceList = null,
    roll = false
  ): any {
    try {
      if (references == null || !(references instanceof ReferenceList)) {
        references = new ReferenceList();
      }

      const depth = references.deeper();
      const variables: Variables = this.getVariables();

      const result = parse(content, {
        references: references,
        getComponent: (id: string) => {
          return this.sheet.getSheetItem(id).component;
        },
        getContextValue: (id: string) => {
          if (context[id]) {
            return context[id];
          }

          return null;
        },
        getVariable: (id: string) => {
          if (variables[id]) {
            return variables[id];
          }

          return null;
        },
        getReferenceValue: (id: string) => {
          const sheetItem: SheetItem = this.sheet.getSheetItem(id);
          const component: Component = sheetItem.component;

          if (!component) {
            const extra = this.sheet.getView().getExtraReferences();

            if (extra[id] !== undefined) {
              references.add(id, depth);

              if (roll) {
                return this.renderRoll(extra[id], context);
              } else {
                return this.renderItem(extra[id], context, references, roll);
              }
            }

            return 0;
          }

          references.add(component.id, depth);

          if (references.error) {
            Konsole.error(references.errorString);
            return 0;
          }

          if (component.isComputed()) {
            return component.renderValue(references);
          }

          return component.transform();
        },
        getVariableValue: (id: string) => {
          if (!variables[id]) {
            Konsole.error(`Variable ${id} not found`);
            return 0;
          }

          references.add(id);

          if (references.error) {
            Konsole.error(references.errorString);
            return 0;
          }

          if (roll) {
            return this.renderRoll(variables[id]);
          }

          return this.render(variables[id], context, references);
        },
      });

      if (result.type === "string") {
        return result.value;
      }

      const total = result.total;

      if (Number.isNaN(total)) {
        return 0;
      }

      return total;
    } catch (e) {
      if (e.message) {
        Konsole.error(`Error when parsing reference for ${content}`, e.message);
      } else {
        Konsole.error("An error happened during reference parsing : ", e);
      }

      throw e;
    }
  }

  public getVariables(): Variables {
    const tables: Tables = this.getTables();

    if (tables.has("variables")) {
      const variables: Table = tables.get("variables");
      const data = variables.data;
      const result = {};

      for (const i in data) {
        result[data[i]["id"]] = data[i]["value"];
      }

      return result;
    }

    return {};
  }

  protected getTree(): Tree {
    return SharedAdapter.container.get("SystemTree");
  }

  protected getTables(): Tables {
    return SharedAdapter.container.get("SystemTables");
  }
}
