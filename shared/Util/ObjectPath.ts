export class ObjectPath {
  public static parse(path: string) {
    return path.split(".");
  }

  public static get(data: any, path: string): any | undefined {
    if (!data) {
      return undefined;
    }

    if (Array.isArray(data)) {
      for (const i in data) {
        const entry = ObjectPath.get(data[i], path);

        if (entry !== undefined) {
          return entry;
        }
      }

      return undefined;
    }

    const paths = this.parse(path);
    let current: any = data;

    for (const i in paths) {
      const path = paths[i];

      if (current[path] !== undefined) {
        current = current[path];
      } else {
        return undefined;
      }
    }

    return current;
  }

  public static has(data: any, path: string): boolean {
    if (Array.isArray(data)) {
      for (const i in data) {
        if (ObjectPath.has(data[i], path)) {
          return true;
        }
      }

      return false;
    }

    return this.get(data, path) !== undefined;
  }

  public static set(data: any, path: string, value: any): boolean {
    if (typeof path !== "string") {
      console.error("ObjectPath path should be a string");
      return;
    }

    const paths = this.parse(path);
    const last = paths.pop();
    let current: any = data;
    let parent: any;

    for (const i in paths) {
      const path = paths[i];
      parent = current;

      if (Array.isArray(current[path])) {
        // convert old array types, to remove later
        const obj = {};

        for (const j in current[path]) {
          obj[j.toString()] = current[path][j];
        }

        current[path] = obj;
      }

      if (current[path] !== undefined) {
        current = current[path];
      } else {
        parent[path] = {};
        current = parent[path];
      }
    }

    current[last] = value;

    return true;
  }

  public static remove(data: any, path: string): boolean {
    const paths = this.parse(path);
    const last = paths.pop();
    let current: any = data;

    for (const i in paths) {
      const path = paths[i];

      if (current[path] !== undefined) {
        current = current[path];
      } else {
        return false;
      }
    }

    delete current[last];

    return true;
  }
}
