import { Emitter } from "./Emitter";
import { injectable } from "inversify";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";

@injectable()
export class PingEmitter extends Emitter {
  public init() {
    EventDispatcher.on(Events.PING, (e) => {
      this.getClient().send("ping", "ping", {
        position: e.position,
        color: e.color,
      });
    });
  }
}
