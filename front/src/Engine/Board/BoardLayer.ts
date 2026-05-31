import Konva from "konva";
import {
  CraftItem,
  ImageItem,
  JournalItem,
  LayerItem,
  LayerItemType,
  SceneLayer,
  TokenItem,
} from "../../../shared/Scene/SceneData";
import { SceneImage } from "../SceneImage";
import { UserState } from "../../State/UserState";
import { container } from "../../DependencyInjection/Container";
import { States } from "../../DependencyInjection/State";
import { AbstractGrid } from "./Grid/AbstractGrid";
import { DrawingItem } from "../../../shared/DrawingsData";
import { DrawingTool } from "./DrawingTool";
import { Services } from "../../DependencyInjection/Services";

export class BoardLayer {
  protected _node: Konva.Group;
  protected _item: SceneLayer;
  protected _grid: AbstractGrid;

  public constructor(item: SceneLayer) {
    this._item = item;
    this._node = new Konva.Group();
  }

  public getFirstImageUrl(): string {
    for (const i in this.item.items) {
      const item: LayerItem = this.item.items[i];

      if (item["path"]) {
        return item["path"];
      }
    }

    return null;
  }

  public build() {
    for (const itemKey in this.item.items) {
      const item = this.item.items[itemKey];

      switch (item.type) {
        case LayerItemType.Craft:
          this.addImage(item as CraftItem);
          break;

        case LayerItemType.Image:
          this.addImage(item as ImageItem);
          break;

        case LayerItemType.Token:
          this.addToken(item as TokenItem);
          break;

        case LayerItemType.Journal:
          this.addJournal(item as JournalItem);
          break;
      }
    }

    for (const drawingKey in this.item.drawingItems) {
      const drawingItem = this.item.drawingItems[drawingKey];
      this.getDrawingTool().draw(drawingItem, this.item.key);
    }

    this.updateLock();
    this.updateVisible();
    this.updateZIndex();
  }

  public updateZIndex() {
    if (this.node.getParent()) {
      this.node.setZIndex(this.item.position);
    }

    for (const i in this.item.items) {
      const item: LayerItem = this.item.items[i];

      if (item.node) {
        (item.node as Konva.Shape).setZIndex(item.zIndex);
      }
    }

    if (this.item.drawingItems == undefined) {
      return;
    }

    for (const i in this.item.drawingItems) {
      const item: DrawingItem = this.item.drawingItems[i];

      if (item.node) {
        (item.node as Konva.Shape).setZIndex(item.zIndex);
      }
    }
  }

  public updateLock() {
    this.node.getChildren().forEach((child: any) => {
      if (child instanceof SceneImage) {
        child.onLockChange();
      }
    });
  }

  public updateVisible() {
    if (this.item.visible) {
      if (this.item.gm) {
        if (this.getUserState().isGm()) {
          this.node.visible(true);
        } else {
          this.node.visible(false);
        }
      } else {
        this.node.visible(true);
      }
    } else {
      this.node.visible(false);
    }
  }

  public addToken(token: TokenItem) {
    this.addImage(token);
  }

  public addCraft(craft: CraftItem) {
    this.addImage(craft);
  }

  public addJournal(token: JournalItem) {
    this.addImage(token);
  }

  public addImage(image: ImageItem) {
    const userState = this.getUserState();
    let hasControls = false;

    if (image.controls) {
      const uid: number = userState.id;

      if (image.controls.indexOf(uid) !== -1) {
        hasControls = true;
      }
    }

    const isOwner: boolean =
      image.userId && image.userId == this.getUserState().id;

    const canTransform: boolean = userState.isGm() || hasControls || isOwner;

    const opts: any = {
      item: image,
      draggable: canTransform,
      layer: this,
      transformable: canTransform,
    };

    const render = new SceneImage(opts);

    this.node.add(render);
    image.node = render;
  }

  public addDrawing(item: DrawingItem) {
    (item.node as Konva.Shape).setAttr("layerKey", this.item.key);
    this.node.add(item.node);

    if (this.item.drawingItems == undefined) {
      this.item.drawingItems = {};
    }

    this.item.drawingItems[item.key] = item;
  }

  public isDrawingLayer(): boolean {
    return !!this.item.drawings;
  }

  get item(): SceneLayer {
    return this._item;
  }

  get node(): Konva.Group {
    return this._node;
  }

  set grid(grid: AbstractGrid) {
    if (!this._grid) {
      this.node.add(grid.node);

      for (const i in grid.highlightNodes) {
        this.node.add(grid.highlightNodes[i].group);
        grid.highlightNodes[i].group.moveToBottom();
      }

      grid.node.moveToBottom();
    }

    this._grid = grid;

    grid.layer = this;
    grid.render();
    grid.node.cache();
  }

  public removeGrid() {
    this._grid.node.remove();
    this._grid = null;
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getDrawingTool(): DrawingTool {
    return container.get<DrawingTool>(Services.DrawingTool);
  }
}
