import { Board } from "../Board";
import { container } from "../../DependencyInjection/Container";
import { Services } from "../../DependencyInjection/Services";
import { BoardLayer } from "./BoardLayer";
import { DrawingItem, DrawingToolType } from "../../../shared/DrawingsData";
import Konva from "konva";
import { injectable } from "inversify";
import { EventDispatcher } from "../../Event/EventDispatcher";
import { Events } from "../../Event/Events";
import { Drawing } from "../Drawing/Drawing";
import { DrawingLine } from "../Drawing/DrawingLine";
import { DrawingRect } from "../Drawing/DrawingRect";
import { DrawingFree } from "../Drawing/DrawingFree";
import { DrawingCircle } from "../Drawing/DrawingCircle";
import { DrawingPolygon } from "../Drawing/DrawingPolygon";
import { DrawingArrow } from "../Drawing/DrawingArrow";
import { DrawingText } from "../Drawing/DrawingText";
import { DrawingFreePolygon } from "../Drawing/DrawingFreePolygon";
import { RulerState } from "../../State/RulerState";
import { States } from "../../DependencyInjection/State";
import { FogState } from "../../State/FogState";
import { DrawingState } from "../../State/DrawingState";
import { UserState } from "../../State/UserState";
import { DrawingPoI } from "../Drawing/DrawingPoI";
import { SceneState } from "../../State/SceneState";

interface DrawingItems {
  [key: string]: DrawingItem;
}

interface DrawingTexture {
  loaded: boolean;
  img: HTMLImageElement;
}

interface DrawingTextures {
  [path: string]: DrawingTexture;
}

@injectable()
export class DrawingTool {
  protected layer: BoardLayer;
  protected items: DrawingItems = {};
  protected transformer: Konva.Transformer;
  protected transformerNode: Konva.Shape;
  protected textures: DrawingTextures = {};

  public constructor() {
    this.refreshLayer();

    this.transformer = new Konva.Transformer({
      keepRatio: false,
      borderStroke: "grey",
      anchorStroke: "grey",
      enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"],
      centeredScaling: false,
      rotationSnaps: [0, 90, 180, 270],
    });
  }

  public removeItem(itemKey: string, layerKey: string) {
    delete this.items[itemKey];
    const layer: BoardLayer = this.getBoard().getLayer(layerKey);

    if (!layer.item.drawingItems) {
      return;
    }

    const item = layer.item.drawingItems[itemKey];

    if (!item) {
      return;
    }

    if (item.node) {
      item.node.remove();
    }

    delete layer.item.drawingItems[itemKey];
  }

  public addItem(item: DrawingItem) {
    this.items[item.key] = item;
  }

  public deleteItem(key: string) {
    if (this.items[key] == undefined) {
      return;
    }

    const item: DrawingItem = this.items[key];

    if (item.node) {
      const node: Konva.Shape = item.node as Konva.Shape;

      if (node === this.transformerNode) {
        this.transformer.hide();
      }

      node.remove();
    }

    delete this.items[key];
  }

  public draw(item: DrawingItem, layerKey?: string) {
    let layer = this.layer;

    if (layerKey) {
      layer = this.getBoard().getLayer(layerKey);
    }

    if (!layer) {
      return;
    }

    this.getTool(item.type).draw(item, layer);
    this.applyTransform(item);

    this.items[item.key] = item;
  }

  protected applyTransform(item: DrawingItem) {
    if (!item.transform) {
      return;
    }

    if (!item.node) {
      return;
    }

    const node: Konva.Shape = item.node;

    node.rotation(item.transform.rotation);
    node.scaleX(item.transform.scaleX);
    node.scaleY(item.transform.scaleY);
  }

  public initItem(item: DrawingItem) {
    const node: Konva.Shape = item.node;
    const layer: BoardLayer | boolean = this.getLayerForItem(item);

    if (!node) {
      return;
    }

    node.draggable(true);

    if (layer && layer instanceof BoardLayer) {
      if (!layer.node.getAttr("drawingTransformer")) {
        layer.node.add(this.transformer);
        this.transformer.hide();
        layer.node.setAttr("drawingTransformer", this.transformer);
      }
    }

    node.on("mousedown", (e) => {
      const layer: BoardLayer | boolean = this.getLayerForItem(item);

      if (this.getTool(item.type).onItemClick(item, layer)) {
        e.cancelBubble = true;
      }

      if (this.isLocked(layer)) {
        return;
      }

      if (!this.canEdit(item)) {
        return;
      }

      e.cancelBubble = true;

      EventDispatcher.emit(Events.BOARD_CLICK, {
        item: item,
      });

      this.transformer.attachTo(node);
      this.transformer.show();
      this.transformerNode = node;

      EventDispatcher.emit(Events.DRAWING_SELECT, {
        item: item,
      });
    });

    node.on("transformstart", (e) => {
      if (!item.transform) {
        item.transform = {
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
        };
      }

      EventDispatcher.emit(Events.DRAWING_TRANSFORM_START, {
        item: item,
      });
    });

    node.on("transformend", (e) => {
      item.position.x = node.x();
      item.position.y = node.y();
      item.transform.rotation = node.rotation();
      item.transform.scaleX = node.scaleX();
      item.transform.scaleY = node.scaleY();

      EventDispatcher.emit(Events.DRAWING_TRANSFORM_END, {
        item: item,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
      });
    });

    node.on("transform", (e) => {
      item.position.x = node.x();
      item.position.y = node.y();
      item.transform.rotation = node.rotation();
      item.transform.scaleX = node.scaleX();
      item.transform.scaleY = node.scaleY();

      EventDispatcher.emit(Events.DRAWING_TRANSFORM, {
        item: item,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
      });
    });

    node.on("dragstart", (e) => {
      if (this.isLocked(layer) || !this.canEdit(item)) {
        node.stopDrag();
      }
    });

    node.on("dragend", (e) => {
      item.position.x = node.x();
      item.position.y = node.y();

      EventDispatcher.emit(Events.DRAWING_DRAGEND, {
        item: item,
        x: node.x(),
        y: node.y(),
      });
    });

    node.on("dragmove", (e) => {
      item.position.x = node.x();
      item.position.y = node.y();

      EventDispatcher.emit(Events.DRAWING_DRAGMOVE, {
        item: item,
        x: node.x(),
        y: node.y(),
      });
    });
  }

  public hideTransformer() {
    this.transformer.hide();
  }

  public updateTransformer() {
    this.transformer.forceUpdate();
  }

  public setLayerKey(key: string) {
    this.setLayer(this.getBoard().getLayer(key));
  }

  public setLayer(layer: BoardLayer) {
    this.layer = layer;
  }

  public getLayer(): BoardLayer {
    return this.layer;
  }

  public getTool(type: DrawingToolType): Drawing {
    switch (type) {
      case DrawingToolType.Free:
        return container.get<DrawingFree>(Services.DrawingFree);
      case DrawingToolType.Line:
        return container.get<DrawingLine>(Services.DrawingLine);
      case DrawingToolType.Rect:
        return container.get<DrawingRect>(Services.DrawingRect);
      case DrawingToolType.Circle:
        return container.get<DrawingCircle>(Services.DrawingCircle);
      case DrawingToolType.FreePolygon:
        return container.get<DrawingFreePolygon>(Services.DrawingFreePolygon);
      case DrawingToolType.Polygon:
        return container.get<DrawingPolygon>(Services.DrawingPolygon);
      case DrawingToolType.Arrow:
        return container.get<DrawingArrow>(Services.DrawingArrow);
      case DrawingToolType.Text:
        return container.get<DrawingText>(Services.DrawingText);
      case DrawingToolType.PoI:
        return container.get<DrawingPoI>(Services.DrawingPoI);
    }

    return null;
  }

  public refreshLayer() {
    this.layer = null;

    const layers: BoardLayer[] = this.getBoard().getLayers();
    let defaultLayer: BoardLayer;

    for (const i in layers) {
      const layer: BoardLayer = layers[i];

      if (layers[i].isDrawingLayer()) {
        if (layer.item.locked || !layer.item.visible) {
          continue;
        }

        if (layer.item.gm && !this.getUserState().isGm()) {
          continue;
        }

        if (this.getUserState().isGm()) {
          if (this.getSceneState().layerKey == layer.item.key) {
            this.layer = layer;
            return;
          }
        }

        defaultLayer = layer;
      }
    }

    if (defaultLayer) {
      this.layer = defaultLayer;
    }
  }

  protected getLayerForItem(item: DrawingItem): BoardLayer | boolean {
    const board: Board = this.getBoard();
    const layers: BoardLayer[] = board.getLayers();

    for (const layerKey in layers) {
      const layer: BoardLayer = layers[layerKey];

      if (
        layer.item.drawingItems != undefined &&
        layer.item.drawingItems[item.key]
      ) {
        return layer;
      }
    }

    return false;
  }

  protected getBoard(): Board {
    return container.get<Board>(Services.Board);
  }

  public getTextureNames(): any {
    return {
      lava2: "Lava",
      asphalt1: "Asphalt",
      brain1: "Brain",
      brick1: "Brick",
      brick2: "Brick 2",
      dirt1: "Dirt",
      metal1: "Metal",
      rocks1: "Rocks 1",
      rocks2: "Rocks 2",
      rocks3: "Rocks 3",
      wood1: "Wooden floor",
      grass1: "Grass",
      grass2: "Grass 2",
      ice1: "Ice",
      sand1: "Sand",
      snow1: "Snow",
      leaves1: "Leaves",
      water1: "Water",
    };
  }

  public applyTexture(item: Konva.Shape, name: string) {
    const apply = () => {
      item.fillEnabled(true);
      item.fill(null);
      item.fillPatternImage(this.textures[name].img);
    };

    if (this.textures[name] == undefined) {
      this.loadTexture(name, apply);
    }

    if (this.textures[name].loaded) {
      apply();
    }
  }

  protected loadTexture(path: string, callback: Function) {
    const img = document.createElement("img") as HTMLImageElement;
    img.setAttribute("crossOrigin", "Anonymous");

    this.textures[path] = {
      loaded: false,
      img: img,
    };

    this.textures[path].img.addEventListener("load", () => {
      this.textures[path].loaded = true;
      callback();
    });

    img.src =
      window["configuration"]["cdnReadUrl"] +
      "/static/texture/" +
      path +
      ".jpg";
  }

  public canEdit(item: DrawingItem): boolean {
    if (this.getUserState().isGm()) {
      return true;
    }

    const uid: number = this.getUserState().id;

    if (item.userId === uid) {
      return true;
    }

    if (item.controls) {
      if (item.controls.indexOf(uid) >= 0) {
        return true;
      }
    }

    return false;
  }

  public getTextures(): any {
    return this.textures;
  }

  public getTexture(name: string) {
    return this.textures[name];
  }

  public isLocked(layer?: BoardLayer | boolean): boolean {
    if (layer === false) {
      return true;
    }

    if (layer == null) {
      layer = this.getLayer();
    }

    if (layer == null) {
      return true;
    }

    layer = layer as BoardLayer;

    return (
      layer.item.locked ||
      this.getRulerState().active ||
      this.getFogState().isDrawing() ||
      this.getDrawingState().isDrawing()
    );
  }

  protected getRulerState(): RulerState {
    return container.get<RulerState>(States.Ruler);
  }

  protected getFogState(): FogState {
    return container.get<FogState>(States.Fog);
  }

  protected getDrawingState(): DrawingState {
    return container.get<DrawingState>(States.Drawing);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }
}
