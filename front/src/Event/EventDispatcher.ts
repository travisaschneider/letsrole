import { EventEmitter } from "events";

export class EventDispatcher {
  protected static instance: EventEmitter;

  public static emit(event: string, params?: any): EventDispatcher {
    this.getEmitter().emit(event, params);

    return EventDispatcher;
  }

  public static on(event: string, callback: any) {
    this.getEmitter().removeListener(event, callback);
    this.getEmitter().on(event, callback);

    return EventDispatcher;
  }

  public static once(event: string, callback: any) {
    this.getEmitter().removeListener(event, callback);
    this.getEmitter().once(event, callback);

    return EventDispatcher;
  }

  public static off(event: string, callback: any = null) {
    if (callback) {
      this.getEmitter().removeListener(event, callback);
    } else {
      this.getEmitter().removeAllListeners(event);
    }

    return EventDispatcher;
  }

  public static getEmitter(): EventEmitter {
    if (this.instance === undefined) {
      this.instance = new EventEmitter();

      if (this.instance.setMaxListeners) {
        this.instance.setMaxListeners(30);
      }
    }

    return this.instance;
  }
}
