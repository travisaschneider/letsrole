import { injectable } from "inversify";
import { SceneLayer } from "../../shared/Scene/SceneData";
import { Scene } from "../Entity/Scene";

@injectable()
export class SceneState {
  protected _scene: Scene;
  protected _layerKey: string;
  public same = true;

  set layerKey(key: string) {
    this._layerKey = key;
  }

  get layerKey(): string {
    return this._layerKey;
  }

  get layer(): SceneLayer {
    return this.scene.data.layers[this.layerKey];
  }

  set scene(scene: Scene) {
    this._scene = scene;

    // TODO : save current layer in localStorage
    for (const key in scene.data.layers) {
      this.layerKey = key;
      break;
    }
  }

  get scene(): Scene {
    return this._scene;
  }

  get id(): number {
    return this.scene.id;
  }
}
