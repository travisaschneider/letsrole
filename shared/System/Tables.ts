import { injectable } from "inversify";
import { Table } from "./Table/Table";

@injectable()
export class Tables {
  protected tables: Map<string, Table> = new Map<string, Table>();

  public serialize(): any {
    const serialized = [];

    this.tables.forEach((table: Table) => {
      serialized.push(table.serialize());
    });

    return serialized;
  }

  public unserialize(data: any) {
    for (const i in data) {
      const table = Object.assign(new Table(), data[i]);
      this.add(table);
    }
  }

  public all(): Map<string, Table> {
    return this.tables;
  }

  public toArray(): Table[] {
    const arr: Table[] = [];

    this.tables.forEach((table: Table) => {
      arr.push(table);
    });

    return arr;
  }

  public add(table: Table) {
    this.tables.set(table.id, table);
  }

  public remove(table: Table | string) {
    let id: string;

    if (table instanceof Table) {
      id = table.id;
    } else {
      id = table;
    }

    this.tables.delete(id);
  }

  public get(id: string): Table {
    return this.tables.get(id);
  }

  public has(id: string): boolean {
    return this.tables.has(id);
  }
}
