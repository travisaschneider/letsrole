import { injectable } from "inversify";
import { Scene } from "../Entity/Scene";

@injectable()
export class SceneRepository {
  protected registry: Map<number, Scene> = new Map<number, Scene>();

  public save(id: number, scene: Scene) {
    this.registry.set(id, scene);
  }

  public has(id: number): boolean {
    return this.registry.has(id);
  }

  public get(id: number): Scene {
    return this.registry.get(id);
  }
}
