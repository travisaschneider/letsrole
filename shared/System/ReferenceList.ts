export class ReferenceList {
  protected _items: string[][] = [];
  protected _error = false;
  protected _depth = -1;
  protected _errorPath: string[] = [];

  public add(reference: string, depth = 0) {
    if (!this._items[depth]) {
      this._items[depth] = [];
    }

    this._items[depth].push(reference);

    if (this.detectErrors()) {
      this._error = true;
      return;
    }
  }

  public toArray() {
    const flat: string[] = [];
    const index: any = {};

    for (const i in this._items) {
      for (const j in this._items[i]) {
        const id: string = this._items[i][j];

        if (index[id] === undefined) {
          flat.push(id);
          index[id] = true;
        }
      }
    }

    return flat;
  }

  public deeper() {
    this._depth += 1;

    return this._depth;
  }

  protected detectErrors() {
    for (const i in this._items[0]) {
      const id: string = this._items[0][i];
      const path: string[] = [id];

      for (let j = 1; j < this._items.length; j++) {
        for (let k = 0; k < this._items[j].length; k++) {
          path.push(this._items[j][k]);

          if (this._items[j][k] === id) {
            this._errorPath = path;
            return true;
          }
        }
      }
    }

    return false;
  }

  public get error(): boolean {
    return this._error;
  }

  public get errorString(): string {
    if (!this._error) {
      return null;
    }

    let error = "Circular reference detected : ";
    let e = 0;

    for (const i in this._errorPath) {
      error += this._errorPath[i];

      if (e < this._errorPath.length - 1) {
        error += " -> ";
      }

      e++;
    }

    return error;
  }
}
