import { injectable } from "inversify";

@injectable()
export class PersistedState {
  protected static readonly StorageKey = "persisted";
  protected state: any;
  protected loaded = false;

  public set(key: string, value: any) {
    this.load();
    this.state[key] = value;
    this.save();
  }

  public get(key: string, defaultValue: any = null) {
    this.load();

    if (this.state[key] != undefined) {
      return this.state[key];
    }

    return defaultValue;
  }

  protected save() {
    window.localStorage.setItem(
      PersistedState.StorageKey,
      JSON.stringify(this.state)
    );
  }

  protected load() {
    if (this.loaded) {
      return;
    }

    const raw: any = window.localStorage.getItem(PersistedState.StorageKey);
    let data = {};

    if (raw) {
      data = JSON.parse(raw);
    }

    if (!data || typeof data != "object") {
      data = {};
    }

    this.state = data;
    this.loaded = true;
  }
}
