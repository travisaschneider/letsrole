import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { DrawingItem } from "../../shared/DrawingsData";
import { Scene } from "../Entity/Scene";
import { SceneRepository } from "../Repository/SceneRepository";
import { container } from "../DependencyInjection/Container";
import { Repository } from "../DependencyInjection/Repository";
import { DrawingTool } from "../Engine/Board/DrawingTool";
import { Services } from "../DependencyInjection/Services";
import { LayerItem, SceneLayer } from "../../shared/Scene/SceneData";
import { Shape } from "konva/lib/Shape";

@injectable()
export class DrawingController extends Controller {
  public readonly name = "drawing";

  public async giveControl(request: BaseMessage) {
    const layerKey: string = request.layerKey;
    const sceneId: number = request.sceneId;
    const itemKey: string = request.itemKey;
    const controls: number[] = request.controls;

    const scene: Scene = this.getSceneRepository().get(sceneId);
    const layer: SceneLayer = scene.data.layers[layerKey];

    if (!layer.drawingItems) {
      return;
    }

    const item: DrawingItem = layer.drawingItems[itemKey];

    if (!item) {
      return;
    }

    item.controls = controls;

    this.getDrawingTool().draw(item, layer.key);
  }

  public async updateZIndex(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const layer: SceneLayer = scene.data.layers[request.layer];
    const changes: any = request.changes;

    if (layer.drawingItems == undefined) {
      return;
    }

    for (const i in layer.drawingItems) {
      const item: DrawingItem = layer.drawingItems[i];

      if (changes[item.key] != undefined && item.node) {
        (item.node as Shape).setZIndex(changes[item.key]);
      }
    }
  }

  public async clear(request: BaseMessage) {
    const sceneId: number = request.sceneId;
    const deleted: any = request.deleted;
    const tool: DrawingTool = this.getDrawingTool();
    const scene: Scene = this.getSceneRepository().get(sceneId);

    for (const layerKey in deleted) {
      const layer: SceneLayer = scene.data.layers[layerKey];

      if (!layer) {
        continue;
      }

      if (!layer.drawingItems) {
        continue;
      }

      for (const i in deleted[layerKey]) {
        const itemKey: string = deleted[layerKey][i];
        tool.removeItem(itemKey, layerKey);
      }
    }
  }

  public async deleteItem(request: BaseMessage) {
    const sceneId: number = request.sceneId;
    const itemKey: string = request.itemKey;
    const layerKey: string = request.layerKey;

    this.getDrawingTool().deleteItem(itemKey);
  }

  public async updateAttribute(request: BaseMessage) {
    const layerKey: string = request.layerKey;
    const sceneId: number = request.sceneId;
    const itemKey: string = request.itemKey;
    const attribute: string = request.attribute;
    const value: any = request.value;

    const scene: Scene = this.getSceneRepository().get(sceneId);
    const layer: SceneLayer = scene.data.layers[layerKey];

    if (!layer.drawingItems) {
      return;
    }

    const item: DrawingItem = layer.drawingItems[itemKey];

    if (!item) {
      return;
    }

    item[attribute] = value;

    this.getDrawingTool().draw(item, layer.key);
  }

  public async addItem(request: BaseMessage) {
    const layerKey: string = request.layerKey;
    const sceneId: number = request.sceneId;
    const item: DrawingItem = request.item;

    const scene: Scene = this.getSceneRepository().get(sceneId);
    const layer: SceneLayer = scene.data.layers[layerKey];

    if (!layer.drawingItems) {
      layer.drawingItems = {};
    }

    layer.drawingItems[item.key] = item;

    this.getDrawingTool().draw(item, layer.key);
  }

  public async transformItem(request: BaseMessage) {
    const layerKey: string = request.layerKey;
    const sceneId: number = request.sceneId;
    const itemKey: string = request.itemKey;

    const scene: Scene = this.getSceneRepository().get(sceneId);
    const layer: SceneLayer = scene.data.layers[layerKey];

    if (!layer.drawingItems) {
      return;
    }

    const item: DrawingItem = layer.drawingItems[itemKey];
    item.position.x = request.x;
    item.position.y = request.y;

    if (!item.transform) {
      item.transform = {
        rotation: request.rotation,
        scaleX: request.scaleX,
        scaleY: request.scaleY,
      };
    } else {
      item.transform.rotation = request.rotation;
      item.transform.scaleX = request.scaleX;
      item.transform.scaleY = request.scaleY;
    }

    this.getDrawingTool().draw(item, layer.key);
  }

  public async moveItem(request: BaseMessage) {
    const layerKey: string = request.layerKey;
    const sceneId: number = request.sceneId;
    const itemKey: string = request.itemKey;

    const scene: Scene = this.getSceneRepository().get(sceneId);
    const layer: SceneLayer = scene.data.layers[layerKey];

    if (!layer.drawingItems) {
      return;
    }

    const item: DrawingItem = layer.drawingItems[itemKey];
    item.position.x = request.x;
    item.position.y = request.y;

    this.getDrawingTool().draw(item, layer.key);
  }

  protected getSceneRepository(): SceneRepository {
    return container.get<SceneRepository>(Repository.Scene);
  }

  protected getDrawingTool(): DrawingTool {
    return container.get<DrawingTool>(Services.DrawingTool);
  }
}
