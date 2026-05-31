import { Emitter } from "./Emitter";
import { injectable } from "inversify";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";

@injectable()
export class CharacterEmitter extends Emitter {
  public init() {
    EventDispatcher.on(Events.CHARACTER_PERSIST, (e) => this.persist(e));
    EventDispatcher.on(Events.CHARACTER_MULTI_PERSIST, (e) =>
      this.multiPersist(e)
    );
  }

  protected persist(data: any) {
    this.getClient().send("character", "persist", data);
  }

  protected multiPersist(data: any) {
    this.getClient().send("character", "multiPersist", data);
  }
}
