import { SceneImage } from "./SceneImage";
import { EventDispatcher } from "../Event/EventDispatcher";
import { AbstractGrid } from "./Board/Grid/AbstractGrid";
import {
  BoardEvent,
  Events,
  SceneAdaptEvent,
  SceneItemDragMoveEvent,
  SceneItemMultiMoveEvent,
} from "../Event/Events";
import { injectable } from "inversify";
import { Services } from "../DependencyInjection/Services";
import {
  LayerItem,
  LayerItemType,
  SceneGrid,
  SceneGridType,
  SceneLayer,
  TokenItem,
} from "../../shared/Scene/SceneData";
import { Stage } from "./Stage";
import { container } from "../DependencyInjection/Container";
import { BoardLayer } from "./Board/BoardLayer";
import { Scene } from "../Entity/Scene";
import { GridMetrics } from "./Board/Grid/GridMetrics";
import { SquareGrid } from "./Board/Grid/SquareGrid";
import { HexGrid } from "./Board/Grid/HexGrid";
import { ToolLayer } from "./Board/ToolLayer";
import { DrawingTool } from "./Board/DrawingTool";
import { DrawingItem } from "../../shared/DrawingsData";
import { DynamicLighting, VisibilitySource } from "./Board/DynamicLighting";
import { Light } from "./Board/DynamicLighting/Light/Light";
import { UserState } from "../State/UserState";
import { ActiveTokens, LightingState } from "../State/LightingState";
import { States } from "../DependencyInjection/State";
import Konva from "konva";
import { View } from "../View/View";
import { CharacterState } from "../State/CharacterState";
import { Collision } from "./Board/DynamicLighting/Collision";
import Group = Konva.Group;
import Vector2d = Konva.Vector2d;

@injectable()
export class Board {
  public static readonly MaxItemSelection = 20;

  public node: Konva.Layer;
  public selectedItem: SceneImage;
  public selectedDrawingItem: DrawingItem;
  public isUpdated = false;
  public isAnimated = false;

  protected _scene: Scene;

  protected background: Konva.Rect;
  protected layers: BoardLayer[] = [];
  protected layersContainer: Konva.Group;
  protected toolLayer: ToolLayer;
  protected grid: AbstractGrid;
  protected lighting: DynamicLighting;

  protected draggingItem: SceneImage;

  protected selectedItems: Set<SceneImage> = new Set<SceneImage>();
  protected selectionGroup: Konva.Group;

  static readonly MIN_SCALE: number = 0.075;
  static readonly MAX_SCALE: number = 3;

  protected computedScale: Konva.Vector2d = { x: 1, y: 1 };
  protected computedPosition: Konva.Vector2d = { x: 0, y: 0 };

  public constructor() {
    this.node = new Konva.Layer();
    //this.node.hitCanvas.setPixelRatio(0.5); // performance optimization

    EventDispatcher.on(Events.BOARD_CLICK, (event: BoardEvent) =>
      this.onMouseDown(event)
    );
    EventDispatcher.on(Events.SCENE_ITEM_DRAGSTART, (event: Event) =>
      this.onSceneItemDragStart(event)
    );
    EventDispatcher.on(Events.SCENE_ITEM_DRAGEND, (event: Event) =>
      this.onSceneItemDragEnd(event)
    );
    EventDispatcher.on(
      Events.SCENE_ITEM_DRAGMOVE,
      (event: SceneItemDragMoveEvent) => this.onSceneItemDragMove(event)
    );
    EventDispatcher.on(Events.SCENE_ITEM_TRANSFORM_END, (event: Event) =>
      this.onSceneItemTransformEnd(event)
    );
    EventDispatcher.on(Events.SCENE_ITEM_SELECT, (event: Event) =>
      this.onItemSelect(event)
    );
    EventDispatcher.on(Events.DRAWING_SELECT, (event: Event) =>
      this.onDrawingSelect(event)
    );
    EventDispatcher.on(Events.BOARD_IS_ANIMATED, (event: any) =>
      this.setIsAnimated()
    );
    EventDispatcher.on(Events.SCENE_ITEM_GROUP_SELECT, (event: BoardEvent) =>
      this.addGroupSelect(event.item)
    );
    EventDispatcher.on(Events.SCENE_ITEM_IMAGE_ADAPT, (e: SceneAdaptEvent) => {
      this.adaptImageToScene(e.item);
    });
  }

  set scene(scene: Scene) {
    this._scene = scene;

    this.build();
  }

  get scene(): Scene {
    return this._scene;
  }

  public isMultipleSelect(): boolean {
    return this.selectedItems.size > 1;
  }

  public addGroupSelect(image: SceneImage) {
    if (this.selectedItems.has(image)) {
      this.selectedItems.delete(image);

      if (this.selectedItems.size <= 1) {
        this.clearGroupSelect();
      }
    } else {
      if (this.selectedItems.size < Board.MaxItemSelection) {
        this.selectedItems.add(image);
      }
    }

    this.renderGroupSelect();
  }

  public getAllSelectedItems(): Set<SceneImage> {
    return this.selectedItems;
  }

  protected renderGroupSelect() {
    if (!this.selectionGroup) {
      return;
    }

    this.selectionGroup.moveToTop();
    this.selectionGroup.removeChildren();

    if (this.selectedItems.size < 2) {
      return;
    }

    let minX = 99999;
    let minY = 99999;
    let maxX = -99999;
    let maxY = -99999;

    this.selectedItems.forEach((item: SceneImage) => {
      const node: Konva.Node = item.item.node;
      item.removeTransformer();

      const rect = node.getClientRect({
        relativeTo: this.node,
      });

      const minPosition = {
        x: rect.x,
        y: rect.y,
      };

      const maxPosition = {
        x: rect.x + rect.width,
        y: rect.y + rect.height,
      };

      if (minPosition.x < minX) minX = minPosition.x;
      if (minPosition.y < minY) minY = minPosition.y;
      if (maxPosition.x > maxX) maxX = maxPosition.x;
      if (maxPosition.y > maxY) maxY = maxPosition.y;

      const shape: Konva.Rect = new Konva.Rect({
        x: rect.x - SceneImage.TransformerPadding,
        y: rect.y - SceneImage.TransformerPadding,
        width: rect.width + SceneImage.TransformerPadding * 2,
        height: rect.height + SceneImage.TransformerPadding * 2,
        stroke: View.getPrimarySkinColor(),
        strokeWidth: 2,
        listening: false,
        cornerRadius: 5,
      });

      this.selectionGroup.add(shape);
    });
  }

  public getLocalPosition(stagePosition: Konva.Vector2d): Konva.Vector2d {
    const s = this.computedScale;
    const p = this.computedPosition;

    return {
      x: stagePosition.x / s.x - p.x / s.x,
      y: stagePosition.y / s.y - p.y / s.y,
    };
  }

  public getLayers(): BoardLayer[] {
    return this.layers;
  }

  public getLayer(key: string): BoardLayer {
    for (const i in this.layers) {
      if (this.layers[i].item.key === key) {
        return this.layers[i];
      }
    }

    return null;
  }

  public reset() {
    if (this.toolLayer) {
      this.toolLayer.removeChildren();
      this.toolLayer.destroy();
      this.toolLayer.remove();
    }

    if (this.node) {
      this.node.removeChildren();
      this.node.destroy();
      this.node.remove();
    }

    this.layers = [];
    this.computedScale = { x: 1, y: 1 };
    this.computedPosition = { x: 0, y: 0 };
    this.toolLayer = new ToolLayer();

    this.build();
  }

  public build() {
    if (this._scene === undefined) {
      return;
    }

    this.node.removeChildren();
    this.node.clear();
    this.node.setAttr("clipimage", null);
    this.node.setAttr("clipcanvas", null);

    this.isAnimated = false;

    this.layersContainer = new Konva.Group();
    this.layers = [];

    this.background = new Konva.Rect({
      width: this.scene.data.width,
      height: this.scene.data.height,
      x: 0,
      y: 0,
      fill: this.scene.data.backgroundColor,
    });

    const layers: SceneLayer[] = this.scene.getOrderedLayers();

    for (const i in layers) {
      const layer: BoardLayer = new BoardLayer(layers[i]);
      this.layersContainer.add(layer.node);
      this.layers.push(layer);

      layer.build();
    }

    this.selectionGroup = new Konva.Group();

    this.node.add(this.background);
    this.node.add(this.layersContainer);
    this.node.add(this.toolLayer);
    this.node.add(this.selectionGroup);

    this.updateGrid();

    const stageFog = this.getStage().getFog();

    stageFog.setAttr("clipshadow", null);
    stageFog.setAttr("clipimage", null);
    stageFog.setAttr("clipcanvas", null);
    stageFog.removeChildren();

    this.getStage().displayFog(this.scene.data.fog, this.scene.size);

    this.createLighting();

    this.isUpdated = true;
  }

  protected setIsAnimated() {
    this.isAnimated = true;
  }

  protected createLighting() {
    if (this.lighting) {
      this.lighting.clear();
      this.lighting.destroy();
    }

    const apply = () => {
      this.lighting = new DynamicLighting({
        x: 0,
        y: 0,
      });
      this.lighting.init(this.getUserState().isGm());
      this.node.add(this.lighting);

      this.lighting.moveToTop();

      EventDispatcher.emit(Events.LIGHTING_READY, {
        lighting: this.lighting,
      });

      this.displayDynamicLighting();
    };

    if (this.getUserState().isLoaded()) {
      apply();
    } else {
      EventDispatcher.once(Events.USER_ME_LOADED, () => {
        apply();
      });
    }
  }

  public addLightingShadow(shadow: Konva.Layer) {
    this.getStage().node.add(shadow);
    this.applyDynamicShadowComputed();
  }

  public update() {
    this.isUpdated = true;
  }

  public addLayer(layerData: SceneLayer) {
    const layer: BoardLayer = new BoardLayer(layerData);
    this.layersContainer.add(layer.node);
    this.layers.push(layer);

    this.update();
  }

  public reorderLayers() {
    for (const key in this.scene.data.layers) {
      this.getLayer(key).updateZIndex();
    }

    this.update();
  }

  public changeVisible(layer: SceneLayer) {
    const boardLayer: BoardLayer = this.getLayer(layer.key);
    boardLayer.updateVisible();

    this.update();
  }

  public changeGm(layer: SceneLayer) {
    const boardLayer: BoardLayer = this.getLayer(layer.key);
    boardLayer.updateVisible();

    this.update();
  }

  public updateTransform(layerKey: string, key: string) {
    const item: LayerItem = this.scene.data.layers[layerKey].items[key];

    if (item.node && item.node instanceof SceneImage) {
      item.node.updateTransform();
    }

    this.update();
  }

  public updatePosition(layerKey: string, key: string) {
    const item: LayerItem = this.scene.data.layers[layerKey].items[key];

    if (item.node && item.node instanceof SceneImage) {
      item.node.x(item.x);
      item.node.y(item.y);
    }

    if (item.type === LayerItemType.Token) {
      const token: TokenItem = item as TokenItem;

      if (token.emitsLight) {
        this.getDynamicLighting().updateTokenLight(this.scene.data, token);
      }

      this.updateVisibility();
    }

    this.update();
  }

  public updateGrid() {
    const grid: SceneGrid = this.scene.data.grid;

    let layerData: SceneLayer = this.scene.getTokenLayer();

    if (layerData === null) {
      layerData = this.scene.getOrderedLayers().reverse()[0];
    }

    const layer: BoardLayer = this.getLayer(layerData.key);

    if (!grid.enabled) {
      if (this.grid) {
        this.grid.remove();
        this.grid = null;
      }

      return;
    }

    const dimensions = {
      width: this.scene.data.width,
      height: this.scene.data.height,
    };

    const metrics: GridMetrics = {
      colWidth: grid.size,
      rowHeight: grid.size,
      color: grid.color,
      opacity: grid.opacity,
      strokeWidth: 1,
    };

    if (this.grid) {
      if (
        grid.type === SceneGridType.Square &&
        !(this.grid instanceof SquareGrid)
      ) {
        this.grid.remove();
        this.grid = undefined;
      }

      if (grid.type === SceneGridType.Hex && !(this.grid instanceof HexGrid)) {
        this.grid.remove();
        this.grid = undefined;
      }
    }

    if (this.grid === undefined || this.grid === null) {
      if (grid.type === SceneGridType.Hex) {
        this.grid = new HexGrid();
      } else {
        this.grid = new SquareGrid();
      }
    }

    this.grid.dimensions = dimensions;
    this.grid.metrics = metrics;
    this.grid.isSnap = !!grid.snap && !!grid.enabled;

    layer.grid = this.grid;

    this.update();
  }

  public getGrid(): AbstractGrid {
    return this.grid;
  }

  public deleteLayer(key: string) {
    this.layers.forEach((layer: BoardLayer, index: number) => {
      if (layer.item.key === key) {
        layer.node.remove();
        this.layers.splice(index, 1);
      }
    });

    this.update();
  }

  public deleteItem(layerKey: string, key: string) {
    const item: LayerItem = this.scene.data.layers[layerKey].items[key];

    if (item.node && item.node instanceof SceneImage) {
      item.node.remove();
    }

    this.update();
  }

  public changeLocked(layer: SceneLayer) {
    const boardLayer: BoardLayer = this.getLayer(layer.key);
    boardLayer.updateLock();

    this.update();
  }

  public updateBackgroundColor() {
    this.background.fill(this.scene.data.backgroundColor);
    this.update();
  }

  public updateWidth() {
    this.background.width(this.scene.data.width);
    this.update();
  }

  public updateHeight() {
    this.background.height(this.scene.data.height);
    this.update();
  }

  public getDynamicLighting(): DynamicLighting {
    return this.lighting;
  }

  public displayDynamicLighting() {
    if (
      !this.scene.data.lighting ||
      !this.lighting ||
      !this.scene.data.lighting.enabled
    ) {
      this.getCollision().resetSegments();
      return;
    }

    this.getCollision().setEnabled(
      !!this.scene.data.lighting?.collisionsEnabled
    );
    this.getDynamicLighting().prepareSegments(this.scene.data);

    this.lighting.displayWalls(this.scene.data);
    this.lighting.displayDoors(this.scene.data);

    this.lighting
      .displayLights(this.scene.data)
      .then(() => {
        return this.updateDynamicLights();
      })
      .then(async () => {
        if (
          this.getUserState().isGm() ||
          this.getCharacterState().isEnabled()
        ) {
          return this.updateVisibility();
        } else {
          EventDispatcher.once(Events.CHARACTER_SHEET_LOADED, () => {
            return this.updateVisibility();
          });
        }
      });
  }

  protected adaptImageToScene(item: SceneImage) {
    const scene: Scene = this.scene;
    const sceneSize: Vector2d = scene.size;
    const sceneRatio: number = sceneSize.x / sceneSize.y;
    const imageRatio = item.item.width / item.item.height;
    const isWidth: boolean = imageRatio > sceneRatio;

    let targetWidth: number;
    let targetHeight: number;

    if (isWidth) {
      targetWidth = sceneSize.x;
      targetHeight = targetWidth / imageRatio;
    } else {
      targetHeight = sceneSize.y;
      targetWidth = targetHeight * imageRatio;
    }

    const scale: number = targetWidth / item.item.width;

    item.item.transformation = {
      x: 0,
      y: 0,
      scale: scale,
      rotation: 0,
    };

    item.item.x = 0;
    item.item.y = 0;

    if (item.item.node) {
      item.item.node.x(item.item.x);
      item.item.node.y(item.item.y);
    }

    item.updateTransform();

    EventDispatcher.emit(Events.SCENE_ITEM_MOVE, {
      item: item,
      x: 0,
      y: 0,
    });

    EventDispatcher.emit(Events.SCENE_ITEM_TRANSFORM, {
      item: item,
      x: 0,
      y: 0,
      scale: scale,
      rotation: 0,
    });
  }

  protected updateTokenLights(): Promise<Light[]> {
    const tokens: TokenItem[] = this.scene.findCharacterTokens();
    const promises: Promise<Light>[] = [];

    for (const token of tokens) {
      promises.push(
        this.getDynamicLighting().updateTokenLight(this.scene.data, token)
      );
    }

    return Promise.all(promises);
  }

  public updateDynamicWalls() {
    if (!this.scene.data.lighting || !this.lighting) {
      return;
    }

    this.lighting.displayWalls(this.scene.data);
  }

  public async updateDynamicLights(): Promise<Light[]> {
    if (!this.scene.data.lighting || !this.lighting) {
      return;
    }

    return this.lighting.displayLights(this.scene.data);
  }

  public async updateVisibility() {
    if (!this.lighting) {
      return;
    }

    const activeTokens: ActiveTokens =
      this.getLightingState().getActiveTokens();
    const sources: VisibilitySource[] = [];
    const computeRange: Function =
      this.getDynamicLighting().getTokenVisionRange;

    await this.updateTokenLights();

    for (const token of activeTokens.tokens) {
      const node: SceneImage = token.node;
      let center: Konva.Vector2d = {
        x: 0,
        y: 0,
      };

      if (node && node.isInit) {
        center = node.getCenter();
      }

      sources.push({
        x: token.x + center.x,
        y: token.y + center.y,
        hasRange: true,
        range: computeRange(this.scene.data, token),
      });
    }

    this.lighting.display(sources, this.scene.data, !activeTokens.isDefault);
  }

  public onMouseDown(event?: BoardEvent): void {
    this.selectedItem = null;

    if (event && event.item) {
      if (this.selectedItems.has(event.item)) {
        // click on a multiple selection
      } else {
        this.clearGroupSelect();
      }
    } else {
      this.clearGroupSelect();
    }

    EventDispatcher.emit(Events.BOARD_UNSELECT, {});

    for (const key in this.scene.data.layers) {
      const layer: SceneLayer = this.scene.data.layers[key];

      for (const itemKey in layer.items) {
        const item = layer.items[itemKey];

        if (item.node && item.node instanceof SceneImage) {
          item.node.onClickOutside();
        }
      }
    }

    this.getDrawingTool().hideTransformer();
  }

  public clearGroupSelect() {
    this.selectedItems.forEach((item: SceneImage) => {
      item.updateTransformable();
    });

    this.selectedItems.clear();
    this.renderGroupSelect();
  }

  public onItemSelect(e: any) {
    const element: SceneImage = e.item;
    this.selectedItem = element;

    if (!this.selectedItems.size) {
      this.selectedItems.add(element);
    }

    if (element.isToken()) {
      EventDispatcher.emit(Events.TOKEN_SELECTED, {
        token: element,
      });
    }
  }

  public onDrawingSelect(e: any) {
    this.selectedDrawingItem = e.item;
  }

  public getThumbnail(callback: Function) {
    const resized = document.createElement("canvas") as HTMLCanvasElement;
    const context = resized.getContext("2d");

    const ratio = this.scene.data.height / this.scene.data.width;
    const pasteHeight: number = 200 * ratio;

    resized.width = 200;
    resized.height = Math.min(pasteHeight, 200);

    this.node.toImage({
      mimeType: "image/jpeg",
      x: this.getComputedPosition().x,
      y: this.getComputedPosition().y,
      width: this.scene.data.width * this.getComputedScale().x,
      height: this.scene.data.height * this.getComputedScale().y,
      quality: 0.2,
      callback: (img) => {
        context.drawImage(img, 0, 0, resized.width, pasteHeight);
        callback(resized);
      },
    });
  }

  public onSceneItemDragStart(event: any) {
    this.draggingItem = event.item;
  }

  public onSceneItemDragMove(event: SceneItemDragMoveEvent) {
    const item: SceneImage = event.item;

    item.item.x = event.x;
    item.item.y = event.y;

    if (item.item.type === LayerItemType.Token) {
      this.updateVisibility();
    }

    if (this.isMultipleSelect()) {
      const multiEvent: SceneItemMultiMoveEvent = {
        items: [
          {
            item: event.item,
            x: event.x,
            y: event.y,
          },
        ],
      };

      this.selectedItems.forEach((selectedItem: SceneImage) => {
        if (selectedItem === item) {
          return;
        }

        const pos: Konva.Vector2d = {
          x: selectedItem.x(),
          y: selectedItem.y(),
        };

        if (event.diffX) {
          pos.x = selectedItem.x() + event.diffX;
        }

        if (event.diffY) {
          pos.y = selectedItem.y() + event.diffY;
        }

        selectedItem.position(pos);
        selectedItem.updatePrevPosition();

        multiEvent.items.push({
          item: selectedItem,
          x: pos.x,
          y: pos.y,
        });
      });

      this.renderGroupSelect();

      EventDispatcher.emit(Events.SCENE_ITEM_MULTI_MOVE, multiEvent);
    } else {
      EventDispatcher.emit(Events.SCENE_ITEM_MOVE, event);
    }
  }

  public onSceneItemDragEnd(event: any) {
    const grid: AbstractGrid = this.getGrid();

    if (!grid) {
      return;
    }

    if (!grid.isSnap) {
      return;
    }

    const item: SceneImage = event.item;

    if (!item) {
      return;
    }

    if (!item.shouldSnapToGrid()) {
      return;
    }

    const content: Group = item.getContent();
    const position: Vector2d = grid.snapPosition(
      content.getAbsolutePosition(this.node)
    );

    item.x(position.x);
    item.y(position.y);

    content.x(0);
    content.y(0);

    EventDispatcher.emit(Events.SCENE_ITEM_TRANSFORM, {
      item: item,
      scale: content.scaleX(),
      rotation: content.rotation(),
      x: content.x(),
      y: content.y(),
    });

    EventDispatcher.emit(Events.SCENE_ITEM_DRAGMOVE, {
      item: item,
      x: position.x,
      y: position.y,
    });
  }

  public onSceneItemTransformEnd(event: any) {
    const grid: AbstractGrid = this.getGrid();

    if (!grid) {
      return;
    }

    if (!grid.isSnap) {
      return;
    }

    const item: SceneImage = event.item;

    if (!item) {
      return;
    }

    if (!item.shouldSnapToGrid()) {
      return;
    }

    const content = item.getContent();
    const image = item.getImage();

    const position = grid.snapPosition(content.getAbsolutePosition(this.node));

    item.x(position.x);
    item.y(position.y);

    content.x(0);
    content.y(0);

    const size = {
      width: image.width() * content.scaleX(),
      height: image.height() * content.scaleY(),
    };

    const dimension = grid.snapDimension(size);

    const ratioX = dimension.width / (image.width() * content.scaleX());
    const ratioY = dimension.height / (image.height() * content.scaleY());

    content.scaleX(ratioX * content.scaleX());
    content.scaleY(ratioY * content.scaleY());

    EventDispatcher.emit(Events.SCENE_ITEM_TRANSFORM, {
      item: item,
      scale: content.scaleX(),
      rotation: content.rotation(),
      x: content.x(),
      y: content.y(),
    });

    EventDispatcher.emit(Events.SCENE_ITEM_DRAGMOVE, {
      item: item,
      x: position.x,
      y: position.y,
    });
  }

  public applyComputed(): void {
    if (this.node.scale().x === this.computedScale.x) {
      if (this.node.scale().y === this.computedScale.y) {
        if (this.node.position().x === this.computedPosition.x) {
          if (this.node.position().y === this.computedPosition.y) {
            // no changes applied
            return;
          }
        }
      }
    }

    this.node.scale(this.computedScale);
    this.node.position(this.computedPosition);

    this.applyDynamicShadowComputed();

    const fog: Konva.Layer = this.getStage().getFog();

    if (fog) {
      fog.scale(this.computedScale);
      fog.position(this.computedPosition);
    }

    if (this.grid) {
      this.grid.updateLineScale(this.computedScale);
    }

    EventDispatcher.emit(Events.BOARD_SCALE_CHANGE, {
      board: this,
    });
  }

  protected applyDynamicShadowComputed() {
    const dl: DynamicLighting = this.getDynamicLighting();

    if (dl && dl.shadowLayer) {
      dl.shadowLayer.scale(this.computedScale);
      dl.shadowLayer.position(this.computedPosition);
    }
  }

  public getFrame(): Konva.RectConfig {
    return {
      x: 0,
      y: 0,
      width: this.scene.data.width,
      height: this.scene.data.height,
    };
  }

  public getToolLayer(): ToolLayer {
    return this.toolLayer;
  }

  public setComputedScale(scale: Konva.Vector2d) {
    this.computedScale = scale;
  }

  public setComputedPosition(position: Konva.Vector2d) {
    position.x = Math.round(position.x);
    position.y = Math.round(position.y);

    this.computedPosition = position;
  }

  public getComputedScale(): Konva.Vector2d {
    return this.computedScale;
  }

  public getComputedPosition(): Konva.Vector2d {
    return this.computedPosition;
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }

  protected getDrawingTool(): DrawingTool {
    return container.get<DrawingTool>(Services.DrawingTool);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getCharacterState(): CharacterState {
    return container.get<CharacterState>(States.Character);
  }

  protected getLightingState(): LightingState {
    return container.get<LightingState>(States.Lighting);
  }

  protected getCollision(): Collision {
    return container.get<Collision>(Services.Collision);
  }
}
