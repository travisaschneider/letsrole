import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import {
  CraftItem,
  DefaultLighting,
  ImageItem,
  JournalItem,
  LayerItem,
  SceneFog,
  SceneGrid,
  SceneLayer,
  SceneLighting,
  SceneLightingDoor,
  SceneLightingLight,
  SceneMetrics,
  TokenItem,
} from "../../shared/Scene/SceneData";
import { Board } from "../Engine/Board";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { SceneRepository } from "../Repository/SceneRepository";
import { Repository } from "../DependencyInjection/Repository";
import { GmView } from "../View/GmView";
import { Views } from "../DependencyInjection/Views";
import { SceneState } from "../State/SceneState";
import { States } from "../DependencyInjection/State";
import { Scene } from "../Entity/Scene";
import { SceneImage } from "../Engine/SceneImage";
import { UserState } from "../State/UserState";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { Stage } from "../Engine/Stage";
import { CancelState } from "../State/CancelState";
import { DynamicLightingView } from "../View/DynamicLightingView";
import { DoorAction } from "../Engine/Board/DynamicLighting/Door";
import { Light } from "../Engine/Board/DynamicLighting/Light/Light";
import { DynamicLighting } from "../Engine/Board/DynamicLighting";

@injectable()
export class SceneController extends Controller {
  public readonly name = "scene";

  public constructor() {
    super();
  }

  public async enableCollisions(request: BaseMessage) {
    const dl: DynamicLighting = this.getBoard().getDynamicLighting();

    console.log("enableCollisions", request);

    if (request.enabled) {
      dl.enableCollisions();
    } else {
      dl.disableCollisions();
    }
  }

  public async lockDoors(request: BaseMessage) {
    const dl: DynamicLighting = this.getBoard().getDynamicLighting();

    if (!dl) {
      setTimeout(() => {
        this.lockDoors(request);
      }, 500); // retry

      return;
    }

    if (request.locked) {
      dl.lockDoors();
    } else {
      dl.unlockDoors();
    }
  }

  public async doorAction(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene.data.lighting || !scene.data.lighting.doors) {
      return;
    }

    const action: DoorAction = request.action;

    for (const d of scene.data.lighting.doors) {
      if (d.id === request.doorId) {
        d.closed = action === DoorAction.Close;
        break;
      }
    }

    scene.data.segmentsUpdated = true;

    this.getBoard()
      .getDynamicLighting()
      .doorAction(scene.data, request.doorId, action);
    this.getBoard().updateVisibility();
    this.getBoard().getDynamicLighting().updateLights(scene.data);
  }

  public async updateTokenLighting(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    const token: TokenItem = scene.findByKey(request.key) as TokenItem;

    if (!token) {
      return;
    }

    for (const spec in request.attributes) {
      token[spec] = request.attributes[spec];
    }

    this.getBoard().updateVisibility();
  }

  public moveLight(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene.data.lighting) {
      scene.data.lighting = JSON.parse(JSON.stringify(DefaultLighting));
    }

    if (!scene.data.lighting.lights) {
      scene.data.lighting.lights = [];
    }

    const light: Light = this.getBoard()
      .getDynamicLighting()
      .getLightInstance(request.lightId);

    if (!light) {
      return;
    }

    light.setPosition({
      x: request.x,
      y: request.y,
    });

    this.getDynamicLightingView().updateLight(light);
  }

  public async updateLight(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene.data.lighting) {
      scene.data.lighting = JSON.parse(JSON.stringify(DefaultLighting));
    }

    if (!scene.data.lighting.lights) {
      scene.data.lighting.lights = [];
    }

    let light: SceneLightingLight;

    for (const i in scene.data.lighting.lights) {
      if (scene.data.lighting.lights[i].id == request.lightId) {
        light = scene.data.lighting.lights[i];
      }
    }

    for (const spec in request.attributes) {
      light[spec] = request.attributes[spec];
    }

    await this.getBoard().updateDynamicLights();
    this.getBoard().updateVisibility();
    this.getBoard().getDynamicLighting().displayLightSelection();
  }

  public async updateDoor(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene.data.lighting) {
      scene.data.lighting = JSON.parse(JSON.stringify(DefaultLighting));
    }

    if (!scene.data.lighting.doors) {
      scene.data.lighting.doors = [];
    }

    let door: SceneLightingDoor;

    for (const i in scene.data.lighting.doors) {
      if (scene.data.lighting.doors[i].id == request.doorId) {
        door = scene.data.lighting.doors[i];
      }
    }

    for (const spec in request.attributes) {
      door[spec] = request.attributes[spec];
    }

    scene.data.segmentsUpdated = true;

    this.getBoard().getDynamicLighting().removeDoor(request.doorId);
    this.getBoard().getDynamicLighting().addDoor(door);
  }

  public removeLight(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene.data.lighting || !scene.data.lighting.lights) {
      return;
    }

    for (const i in scene.data.lighting.lights) {
      if (scene.data.lighting.lights[i].id == request.lightId) {
        scene.data.lighting.lights.splice(Number(i), 1);
        break;
      }
    }

    this.getBoard().updateDynamicLights();
    this.getBoard().updateVisibility();
  }

  public async addLight(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene.data.lighting) {
      scene.data.lighting = JSON.parse(JSON.stringify(DefaultLighting));
    }

    if (!scene.data.lighting.lights) {
      scene.data.lighting.lights = [];
    }

    scene.data.lighting.lights.push(request.light);

    await this.getBoard().updateDynamicLights();
    this.getBoard().updateVisibility();

    if (request.createdBy == this.getUserState().id) {
      this.getDynamicLightingView().selectLight(
        request.sceneId,
        request.light.id
      );
    }
  }

  public removeDoor(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene.data.lighting || !scene.data.lighting.doors) {
      return;
    }

    for (const i in scene.data.lighting.doors) {
      if (scene.data.lighting.doors[i].id == request.doorId) {
        scene.data.lighting.doors.splice(Number(i), 1);
        break;
      }
    }

    scene.data.segmentsUpdated = true;

    this.getBoard().getDynamicLighting().removeDoor(request.doorId);
    this.getBoard().updateDynamicWalls();
    this.getBoard().updateVisibility();
  }

  public removeWall(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene.data.lighting || !scene.data.lighting.walls) {
      return;
    }

    for (const i in scene.data.lighting.walls) {
      if (scene.data.lighting.walls[i].id == request.wallId) {
        scene.data.lighting.walls.splice(Number(i), 1);
        break;
      }
    }

    scene.data.segmentsUpdated = true;

    this.getBoard().updateDynamicWalls();
    this.getBoard().updateVisibility();
  }

  public addDoor(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene.data.lighting) {
      scene.data.lighting = JSON.parse(JSON.stringify(DefaultLighting));
    }

    if (!scene.data.lighting.doors) {
      scene.data.lighting.doors = [];
    }

    scene.data.lighting.doors.push(request.door);
    scene.data.segmentsUpdated = true;

    this.getBoard().updateDynamicWalls();
    this.getBoard().updateVisibility();
    this.getBoard().getDynamicLighting().addDoor(request.door);

    if (request.createdBy == this.getUserState().id) {
      this.getDynamicLightingView().selectDoor(
        request.sceneId,
        request.door.id
      );
    }
  }

  public addWall(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene.data.lighting) {
      scene.data.lighting = JSON.parse(JSON.stringify(DefaultLighting));
    }

    if (!scene.data.lighting.walls) {
      scene.data.lighting.walls = [];
    }

    scene.data.lighting.walls.push(request.wall);
    scene.data.segmentsUpdated = true;

    this.getBoard().updateDynamicWalls();
    this.getBoard().updateVisibility();

    if (request.createdBy == this.getUserState().id) {
      this.getDynamicLightingView().selectWall(
        request.sceneId,
        request.wall.id
      );
    }
  }

  public async updateControls(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const item: LayerItem = scene.data.layers[request.layer].items[request.key];

    item.controls = request.controls;

    if (item.node && item.node instanceof SceneImage) {
      item.node.updateControls();
    }
  }

  public async moveMultiItemLayer(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene) {
      return;
    }

    interface MoveLayerItem {
      key: string;
      layer: string;
      newLayer: string;
    }

    const items: MoveLayerItem[] = request.items;

    for (const movingItem of items) {
      const oldLayer: SceneLayer = scene.data.layers[movingItem.layer];
      const newLayer: SceneLayer = scene.data.layers[movingItem.newLayer];

      if (!oldLayer || !newLayer) {
        continue;
      }

      const item: TokenItem = oldLayer.items[movingItem.key] as TokenItem;

      if (item.node) {
        item.node.remove();
        item.node = null;
      }

      delete oldLayer.items[item.key];
      newLayer.items[item.key] = item;

      this.getBoard().getLayer(newLayer.key).addImage(item);
    }
  }

  public async moveItemLayer(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene) {
      return;
    }

    const oldLayer: SceneLayer = scene.data.layers[request.oldLayer];
    const newLayer: SceneLayer = scene.data.layers[request.newLayer];

    if (!oldLayer || !newLayer) {
      return;
    }

    const item: TokenItem = oldLayer.items[request.key] as TokenItem;

    if (item.node) {
      item.node.remove();
      item.node = null;
    }

    delete oldLayer.items[item.key];
    newLayer.items[item.key] = item;

    this.getBoard().getLayer(newLayer.key).addImage(item);
  }

  public async updatePlaylist(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (scene) {
      scene.data.playlistId = request.playlistId;
    }
  }

  public async updateTokenExtra(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const layer: SceneLayer = scene.data.layers[request.layer];
    const item: TokenItem = layer.items[request.key] as TokenItem;

    item.aura = request.aura;
    item.bars = request.bars;

    if (item.node && item.node instanceof SceneImage) {
      item.node.updateExtras();
    }
  }

  public async updateTokenBars(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const layer: SceneLayer = scene.data.layers[request.layer];
    const item: TokenItem = layer.items[request.key] as TokenItem;
    item.bars = request.bars;

    if (item.node && item.node instanceof SceneImage) {
      item.node.updateExtras();
    }
  }

  public async updateTokenAura(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const layer: SceneLayer = scene.data.layers[request.layer];
    const item: TokenItem = layer.items[request.key] as TokenItem;
    item.aura = request.aura;

    if (item.node && item.node instanceof SceneImage) {
      item.node.updateExtras();
    }
  }

  public async updateMetrics(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const metrics: SceneMetrics = request.metrics;

    scene.data.metrics = metrics;

    EventDispatcher.emit(Events.SCENE_UPDATE_METRICS, {
      metrics: metrics,
    });

    this.getGmView().updateSceneBlock();
  }

  public async updateFog(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const fog: SceneFog = request.fog;

    scene.data.fog = fog;

    this.getStage().displayFog(scene.data.fog, scene.size);

    this.getGmView().updateSceneBlock();
  }

  public updateLighting(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const lighting: SceneLighting = request.lighting;

    scene.data.lighting = lighting;

    this.getBoard().displayDynamicLighting();

    this.getGmView().updateSceneBlock();

    if (lighting.enabled && this.getUserState().isGm()) {
      this.getDynamicLightingView().enableDock();
    } else {
      this.getDynamicLightingView().disableDock();
    }
  }

  public async display(request: BaseMessage) {
    const scene: Scene = new Scene();
    const sameScene: boolean =
      request.dmSceneId == request.playerSceneId ||
      request.playerSceneId == null;

    this.getSceneState().same = sameScene;

    scene.id = request.scene.id;
    scene.name = request.scene.name;
    scene.data = request.scene.data;
    scene.data.segmentsUpdated = true;

    this.getCancelState().clear();

    this.getSceneRepository().save(scene.id, scene);

    this.getSceneState().scene = scene;
    this.getBoard().scene = scene;
    this.getGmView().updateForScene(scene);
    this.getGmView().disableFogTool();

    EventDispatcher.emit(Events.SCENE_AFTER_LOAD, {
      scene: scene,
    });
  }

  public async updateGrid(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const grid: SceneGrid = request.grid;

    scene.data.grid = grid;

    this.getBoard().updateGrid();
    this.getGmView().updateSceneBlock();
  }

  public async updateZIndex(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const layer: SceneLayer = scene.data.layers[request.layer];
    const changes: any = request.changes;

    for (const i in layer.items) {
      const item: LayerItem = layer.items[i];

      if (changes[item.key] != undefined && item.node) {
        (item.node as any).setZIndex(changes[item.key]);
      }
    }
  }

  public async deleteItem(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene) {
      return;
    }

    this.getBoard().deleteItem(request.layer, request.key);

    delete scene.data.layers[request.layer].items[request.key];
  }

  public async deleteMultiItem(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    if (!scene) {
      return;
    }

    for (const item of request.items) {
      this.getBoard().deleteItem(item.layer, item.key);
      delete scene.data.layers[item.layer].items[item.key];
    }
  }

  public async transformItem(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const item: ImageItem = scene.data.layers[request.layer].items[
      request.key
    ] as ImageItem;

    item.transformation = request.transformation;

    this.getBoard().updateTransform(request.layer, request.key);
  }

  public async moveItem(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    scene.data.layers[request.layer].items[request.key].x = request.x;
    scene.data.layers[request.layer].items[request.key].y = request.y;

    this.getBoard().updatePosition(request.layer, request.key);
  }

  public async moveMultipleItem(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    const items = request.items;

    items.forEach((item) => {
      scene.data.layers[item.layer].items[item.key].x = item.x;
      scene.data.layers[item.layer].items[item.key].y = item.y;

      this.getBoard().updatePosition(item.layer, item.key);
    });
  }

  public async addItem(request: BaseMessage) {
    const item: ImageItem = request.item;
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    scene.data.layers[request.layer].items[item.key] = item;

    this.getBoard().getLayer(request.layer).addImage(item);
  }

  public async addToken(request: BaseMessage) {
    const token: TokenItem = request.token;
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    scene.data.layers[request.layer].items[token.key] = token;

    this.getBoard().getLayer(request.layer).addToken(token);
  }

  public async addJournal(request: BaseMessage) {
    const journal: JournalItem = request.journal;
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    scene.data.layers[request.layer].items[journal.key] = journal;

    this.getBoard().getLayer(request.layer).addJournal(journal);
  }

  public async addCraft(request: BaseMessage) {
    const craft: CraftItem = request.craft;
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    scene.data.layers[request.layer].items[craft.key] = craft;

    this.getBoard().getLayer(request.layer).addCraft(craft);
  }

  public async changeBackground(request: BaseMessage) {
    const id: number = request.sceneId;
    const color: string = request.color;

    const scene: Scene = this.getSceneRepository().get(id);
    scene.data.backgroundColor = color;

    this.getBoard().updateBackgroundColor();
  }

  public async changeName(request: BaseMessage) {
    const id: number = request.sceneId;
    const name: string = request.name;

    const scene: Scene = this.getSceneRepository().get(id);
    scene.name = name;

    this.getGmView().updateSceneBlock();
  }

  public async changeWidth(request: BaseMessage) {
    const id: number = request.sceneId;
    const width: number = request.width;

    const scene: Scene = this.getSceneRepository().get(id);
    scene.data.width = width;

    this.getBoard().updateWidth();
    this.getGmView().updateSceneBlock();
  }

  public async changeHeight(request: BaseMessage) {
    const id: number = request.sceneId;
    const height: number = request.height;

    const scene: Scene = this.getSceneRepository().get(id);
    scene.data.height = height;

    this.getBoard().updateHeight();
    this.getGmView().updateSceneBlock();
  }

  public async deleteLayer(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);
    const key: string = request.layer;

    delete scene.data.layers[key];

    this.getBoard().deleteLayer(key);
  }

  public async changeLayerOrder(request: BaseMessage) {
    const scene: Scene = this.getSceneRepository().get(request.sceneId);

    for (const key in request.layers) {
      const position: number = request.layers[key];
      scene.data.layers[key].position = position;
    }

    this.getBoard().reorderLayers();
    this.getGmView().updateForScene(scene);
  }

  public async updateLayer(request: BaseMessage) {
    const id: number = request.sceneId;
    const layerKey: string = request.layerKey;

    if (!this.getSceneRepository().has(id)) {
      console.error("Unable to find scene", id);
      return;
    }

    const scene: Scene = this.getSceneRepository().get(id);
    const layer: SceneLayer = scene.data.layers[layerKey];

    if (request.name !== undefined) {
      layer.name = request.name;
    }

    if (request.visible !== undefined) {
      layer.visible = request.visible;
      this.getBoard().changeVisible(layer);
    }

    if (request.locked !== undefined) {
      layer.locked = request.locked;
      this.getBoard().changeLocked(layer);
    }

    if (request.gm !== undefined) {
      layer.gm = request.gm;
      this.getBoard().changeGm(layer);
    }

    if (request.lighting !== undefined) {
      layer.lighting = request.lighting;
    }

    if (request.token !== undefined) {
      layer.token = request.token;
    }

    if (request.drawings !== undefined) {
      layer.drawings = request.drawings;
    }

    this.getGmView().updateForScene(scene);
  }

  public async createLayer(request: BaseMessage) {
    const id: number = request.sceneId;
    const layer: SceneLayer = request.layer;

    if (!this.getSceneRepository().has(id)) {
      console.error("Unable to find scene", id);
      return;
    }

    const scene: Scene = this.getSceneRepository().get(id);
    scene.data.layers[layer.key] = layer;

    this.getGmView().updateForScene(scene);
    this.getBoard().addLayer(layer);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getBoard(): Board {
    return container.get<Board>(Services.Board);
  }

  protected getSceneRepository(): SceneRepository {
    return container.get<SceneRepository>(Repository.Scene);
  }

  protected getGmView(): GmView {
    return container.get<GmView>(Views.Gm);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }

  protected getCancelState(): CancelState {
    return container.get<CancelState>(States.Cancel);
  }

  protected getDynamicLightingView(): DynamicLightingView {
    return container.get<DynamicLightingView>(Views.DynamicLighting);
  }
}
