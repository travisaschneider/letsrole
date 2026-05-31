export interface TableLine {
  id: string;
  [row: string]: string;
}

export class Table {
  public id: string;
  public columns: string[] = ["id"];
  public data: TableLine[] = [];

  public get size(): number {
    return this.data.length;
  }

  public moveLine(from: number, to: number) {
    this.data.splice(to, 0, this.data.splice(from, 1)[0]);
  }

  public deleteLine(line: number) {
    this.data.splice(line, 1);
  }

  public get(id: string): TableLine | null {
    for (const i in this.data) {
      if (this.data[i]["id"] === id) {
        return this.data[i];
      }
    }

    return null;
  }

  public getAtIndex(index: number): TableLine | null {
    return this.data[index];
  }

  public setData(index: number, column: string, value: string) {
    if (!value) {
      value = "";
    }

    this.data[index][column] = value;
  }

  public createLine() {
    const line: TableLine = {
      id: "",
    };

    this.columns.forEach((column: string) => {
      line[column] = "";
    });

    return line;
  }

  public addLine(line: TableLine) {
    this.data.push(line);
  }

  public addColumn(name: string) {
    this.columns.push(name);

    this.data.forEach((line: TableLine) => {
      line[name] = "";
    });
  }

  public renameColumn(oldName: string, newName: string) {
    for (const i in this.columns) {
      if (this.columns[i] === oldName) {
        this.columns[i] = newName;
      }
    }

    for (const i in this.data) {
      const line: TableLine = this.data[i];

      for (const key in line) {
        if (key === oldName) {
          line[newName] = line[key];
          delete line[key];
        }
      }
    }
  }

  public removeColumn(name: string) {
    const index = this.columns.indexOf(name);

    if (index > -1) {
      this.columns.splice(index, 1);
    }

    this.data.forEach((line: TableLine) => {
      delete line[name];
    });
  }

  public serialize(): any {
    return {
      id: this.id,
      columns: this.columns,
      data: this.data,
    };
  }
}
