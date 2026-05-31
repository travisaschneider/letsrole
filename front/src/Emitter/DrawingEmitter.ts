import { Emitter } from "./Emitter";
import { injectable } from "inversify";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { SceneState } from "../State/SceneState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { DrawingItem } from "../../shared/DrawingsData";
import * as Konva from "konva";
import { BoardLayer } from "../Engine/Board/BoardLayer";
import { LayerItem } from "../../shared/Scene/SceneData";
import { Shape } from "konva/lib/Shape";

@injectable()
export class DrawingEmitter extends Emitter {
  public static readonly SendInterval: number = 1000 / 30;

  protected transformSentAt: Date;
  protected moveSentAt: Date;
  protected transformInterval: any;
  protected moveInterval: any;

  public init() {
    EventDispatcher.on(Events.DRAWING_DRAGMOVE, (e) => this.move(e));
    EventDispatcher.on(Events.DRAWING_DRAGEND, (e) => this.move(e));
    EventDispatcher.on(Events.DRAWING_TRANSFORM, (e) => this.transform(e));
    EventDispatcher.on(Events.DRAWING_TRANSFORM_END, (e) => this.transform(e));
    EventDispatcher.on(Events.DRAWING_DELETE, (e) => this.deleteItem(e));
    EventDispatcher.on(Events.DRAWING_ZINDEX, (e) =>
      this.changeZIndex(e.layer)
    );
    EventDispatcher.on(Events.DRAWING_CONTROL, (e) =>
      this.updateControls(e.item, e.uid)
    );
  }

  protected updateControls(item: DrawingItem, uid: number) {
    this.getClient().send("drawing", "giveControl", {
      layerKey: (item.node as Shape).getAttr("layerKey"),
      sceneId: this.getSceneState().id,
      itemKey: item.key,
      userId: uid,
    });
  }

  protected deleteItem(e: any) {
    const item: DrawingItem = e.item;

    this.getClient().send("drawing", "deleteItem", {
      layerKey: (item.node as Shape).getAttr("layerKey"),
      sceneId: this.getSceneState().id,
      itemKey: item.key,
    });
  }

  protected transform(e: any) {
    const item: DrawingItem = e.item;

    const send = () => {
      this.getClient().send("drawing", "transformItem", {
        layerKey: (item.node as Shape).getAttr("layerKey"),
        sceneId: this.getSceneState().id,
        itemKey: item.key,
        x: e.x,
        y: e.y,
        rotation: e.rotation,
        scaleX: e.scaleX,
        scaleY: e.scaleY,
      });

      this.transformSentAt = new Date();
      clearTimeout(this.transformInterval);
    };

    const now: Date = new Date();
    clearTimeout(this.transformInterval);

    if (!this.transformSentAt) {
      return send();
    }

    if (
      now.getTime() - this.transformSentAt.getTime() >
      DrawingEmitter.SendInterval
    ) {
      send();
    } else {
      this.transformInterval = setTimeout(() => {
        send();
      }, DrawingEmitter.SendInterval);
    }
  }

  protected move(e: any) {
    const item: DrawingItem = e.item;

    const send = () => {
      this.getClient().send("drawing", "moveItem", {
        layerKey: (item.node as Shape).getAttr("layerKey"),
        sceneId: this.getSceneState().id,
        itemKey: item.key,
        x: e.x,
        y: e.y,
      });

      this.moveSentAt = new Date();
      clearTimeout(this.moveInterval);
    };

    const now: Date = new Date();
    clearTimeout(this.moveInterval);

    if (!this.moveSentAt) {
      return send();
    }

    if (
      now.getTime() - this.moveSentAt.getTime() >
      DrawingEmitter.SendInterval
    ) {
      send();
    } else {
      this.moveInterval = setTimeout(() => {
        send();
      }, DrawingEmitter.SendInterval);
    }
  }

  protected changeZIndex(layer: BoardLayer) {
    const state: SceneState = this.getSceneState();
    const itemsZIndex: any = {};

    if (layer.item.drawingItems == undefined) {
      return;
    }

    for (const i in layer.item.drawingItems) {
      const item: DrawingItem = layer.item.drawingItems[i];

      if (!item.node) {
        continue;
      }

      itemsZIndex[item.key] = (item.node as Shape).getZIndex();
    }

    this.getClient().send("drawing", "updateZIndex", {
      layer: layer.item.key,
      order: itemsZIndex,
      sceneId: state.id,
    });
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }
}
