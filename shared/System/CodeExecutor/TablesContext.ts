import { Tables } from "../Tables";
import { TableContext } from "./Table/TableContext";

export function TablesContext(tables: Tables) {
  this.get = (id: string) => {
    if (tables.has(id)) {
      return new TableContext(tables.get(id));
    }

    return null;
  };
}
