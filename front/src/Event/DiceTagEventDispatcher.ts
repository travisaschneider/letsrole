import { EventEmitter } from "events";

export class DiceTagEventDispatcher {
  protected static instance: EventEmitter;

  public static emit(tag: string, roll: any) {
    this.getEmitter().emit(tag, roll);
  }

  public static on(tag: string, callback: any) {
    this.getEmitter().removeListener(tag, callback);
    this.getEmitter().on(tag, callback);
  }

  public static getEmitter(): EventEmitter {
    if (this.instance === undefined) {
      this.instance = new EventEmitter();
    }

    return this.instance;
  }
}
