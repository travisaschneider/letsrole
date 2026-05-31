import { Table } from "../../Table/Table";
import { SharedAdapter } from "../../SharedAdapter";
import { Konsole } from "../../../Konsole";

export function TableContext(table: Table) {
  this.get = (id) => {
    return table.get(id);
  };

  this.has = (id) => {
    return table.get(id) !== null;
  };

  this.each = (callback: Function) => {
    for (const i in table.data) {
      callback(table.data[i]);
    }
  };

  this.random = (...args) => {
    try {
      let count = 1;
      let cb;

      if (args.length == 1) {
        cb = args[0];
      }

      if (args.length >= 2) {
        count = args[0];
        cb = args[1];
      }

      if (!cb) {
        return;
      }

      const dimension = table.size;
      const ed = SharedAdapter.eventDispatcher;

      ed.emit("table-random", {
        count: count,
        dimension: dimension,
        callback: cb,
        table: table,
      });
    } catch (e) {
      Konsole.error("An error occured during random table generation");
    }
  };
}
