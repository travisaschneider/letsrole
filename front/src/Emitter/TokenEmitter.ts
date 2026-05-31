import { Emitter } from "./Emitter";
import { injectable } from "inversify";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { Scene } from "../Entity/Scene";
import { SceneState } from "../State/SceneState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { CraftItem, TokenBar, TokenItem } from "../../shared/Scene/SceneData";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { Repository } from "../DependencyInjection/Repository";
import { ObjectPath } from "../../shared/Util/ObjectPath";

@injectable()
export class TokenEmitter extends Emitter {
  public init() {
    EventDispatcher.on(Events.CHARACTER_PERSIST, (e) => {
      const cid = e.cid;
      const entries = [e];

      this.updateBarsFromAttributes(cid, false, entries);
    });

    EventDispatcher.on(Events.CRAFT_PERSIST, (e) => {
      const cid = e.cid;
      const entries = [e];
      const tokenKey: string = e.tokenKey;

      if (tokenKey) {
        this.updateBarForToken(tokenKey, entries);
      } else {
        this.updateBarsFromAttributes(cid, true, entries);
      }
    });

    //EventDispatcher.on(Events.CHARACTER_MULTI_PERSIST, (e) => this.multiPersist(e));
  }

  public updateBarForToken(tokenKey: string, entries: any[]) {
    const scene: Scene = this.getSceneState().scene;

    let isUpdated = false;

    const token: CraftItem = scene.findByKey(tokenKey) as CraftItem;

    if (!token) {
      return;
    }

    for (let j = 1; j <= 2; j++) {
      if (!token.bars) {
        continue;
      }

      const bar: TokenBar = token.bars["bar" + j.toString(10)];

      if (!bar) {
        continue;
      }

      for (const k in entries) {
        const data: any = entries[k];

        if (bar.connected) {
          if (bar.connectedValue === data.p && bar.value != data.val) {
            bar.value = parseFloat(data.val);
            isUpdated = true;
          }
          if (bar.connectedMax === data.p && bar.max != data.val) {
            bar.max = parseFloat(data.val);
            isUpdated = true;
          }
        }
      }
    }

    if (isUpdated) {
      this.getClient().send("scene", "updateTokenExtra", {
        aura: false,
        bars: token.bars,
        key: token.key,
        scene: scene.id,
      });
    }
  }

  public updateBarsFromAttributes(
    cid: number,
    craft: boolean,
    entries: any[],
    forceUpdate = false
  ) {
    const scene: Scene = this.getSceneState().scene;

    if (!scene) {
      return;
    }

    let tokens: any[];

    if (craft) {
      tokens = scene.findCraftTokens(cid);
    } else {
      tokens = scene.findCharacterTokens(cid);
    }

    for (const i in tokens) {
      let isUpdated = false;

      for (let j = 1; j <= 2; j++) {
        if (!tokens[i].bars) {
          continue;
        }

        const bar: TokenBar = tokens[i].bars["bar" + j.toString(10)];

        if (!bar) {
          continue;
        }

        for (const k in entries) {
          const data: any = entries[k];

          if (ObjectPath.has(tokens[i].data, data.p)) {
            continue;
          }

          if (bar.connected) {
            if (bar.connectedValue === data.p && bar.value != data.val) {
              bar.value = parseFloat(data.val);
              isUpdated = true;
            }
            if (bar.connectedMax === data.p && bar.max != data.val) {
              bar.max = parseFloat(data.val);
              isUpdated = true;
            }
          }
        }
      }

      if (isUpdated || forceUpdate) {
        this.getClient().send("scene", "updateTokenExtra", {
          aura: false,
          bars: tokens[i].bars,
          key: tokens[i].key,
          scene: scene.id,
        });
      }
    }
  }

  /*protected multiPersist(e: any) {
        this.getClient().send('character', 'multiPersist', e);
    }*/

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }
}
