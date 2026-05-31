import { Emitter } from "./Emitter";
import { injectable } from "inversify";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { SceneState } from "../State/SceneState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";

@injectable()
export class CraftEmitter extends Emitter {
  public init() {
    EventDispatcher.on(Events.CRAFT_PERSIST, (e) => this.persist(e));
    EventDispatcher.on(Events.CRAFT_MULTI_PERSIST, (e) => this.multiPersist(e));
  }

  protected persist(data: any) {
    if (data.tokenKey) {
      data.sceneId = this.getSceneState().id;
    }

    this.getClient().send("craft", "persist", data);
  }

  protected multiPersist(data: any) {
    if (data.tokenKey) {
      data.sceneId = this.getSceneState().id;
    }

    this.getClient().send("craft", "multiPersist", data);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }
}
