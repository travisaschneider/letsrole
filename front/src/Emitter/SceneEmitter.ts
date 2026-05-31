import { Emitter } from "./Emitter";
import { injectable } from "inversify";
import { EventDispatcher } from "../Event/EventDispatcher";
import {
  Events,
  SceneItemMultiChangeLayerEvent,
  SceneItemMultiDeleteEvent,
  SceneItemMultiMoveEvent,
} from "../Event/Events";
import { SceneImage } from "../Engine/SceneImage";
import { container } from "../DependencyInjection/Container";
import { SceneState } from "../State/SceneState";
import { States } from "../DependencyInjection/State";
import { SceneElement } from "../Engine/SceneElement";
import { ImageItem, LayerItem, TokenItem } from "../../shared/Scene/SceneData";
import { BoardLayer } from "../Engine/Board/BoardLayer";
import { Shape } from "konva/lib/Shape";
import { DoorAction } from "../Engine/Board/DynamicLighting/Door";

@injectable()
export class SceneEmitter extends Emitter {
  protected static readonly TRANSFORM_PRECISION: number = 1000;

  public init() {
    EventDispatcher.on(Events.SCENE_ITEM_DELETE, (e: any) => {
      this.deleteSceneItem(e.item);
    });

    EventDispatcher.on(
      Events.SCENE_ITEM_MULTI_DELETE,
      (e: SceneItemMultiDeleteEvent) => {
        this.deleteMultipleSceneItem(e.items);
      }
    );

    EventDispatcher.on(Events.SCENE_ITEM_ZINDEX, (e: any) => {
      this.changeSceneItemZIndex(e.layer);
    });

    EventDispatcher.on(Events.SCENE_ITEM_MOVE, (e) => {
      this.moveSceneItem(e.item, e.x, e.y);
    });

    EventDispatcher.on(
      Events.SCENE_ITEM_MULTI_MOVE,
      (e: SceneItemMultiMoveEvent) => {
        this.moveMultipleSceneItems(e);
      }
    );

    EventDispatcher.on(Events.SCENE_ITEM_TRANSFORM, (e) => {
      this.transformSceneItem(e.item, e.x, e.y, e.scale, e.rotation);
    });

    EventDispatcher.on(Events.SCENE_ITEM_PASTE, (e) => {
      this.pasteItem(e.item, e.position);
    });

    EventDispatcher.on(Events.SCENE_ITEM_CONTROL, (e) => {
      this.controlItem(e.item, e.uid);
    });

    EventDispatcher.on(Events.SCENE_ITEM_ADAPT, (e) => {
      this.adaptSceneToItem(e.item);
    });

    EventDispatcher.on(Events.SCENE_ITEM_BAR_SET_VALUE, (e) => {
      this.setBarValue(e.item, e.bar, e.value);
    });

    EventDispatcher.on(Events.SCENE_ITEM_CHANGE_LAYER, (e) => {
      this.changeItemLayer(e.item, e.layerKey);
    });

    EventDispatcher.on(
      Events.SCENE_ITEM_MULTI_CHANGE_LAYER,
      (e: SceneItemMultiChangeLayerEvent) => {
        this.changeMultiItemLayer(e.items, e.layerKey);
      }
    );

    EventDispatcher.on(Events.LIGHTING_DOOR_ACTION, (e) => {
      this.doorAction(e.door.id, e.action);
    });
  }

  protected doorAction(doorId: string, action: DoorAction) {
    this.getClient().send("scene", "doorAction", {
      scene: this.getSceneState().id,
      doorId: doorId,
      action: action,
    });
  }

  protected setBarValue(item: TokenItem, bar: string, value: number) {
    this.getClient().send("scene", "updateTokenBarValue", {
      scene: this.getSceneState().id,
      key: item.key,
      bar: bar,
      value: value,
    });
  }

  protected changeItemLayer(item: SceneImage, layerKey: string) {
    this.getClient().send("scene", "changeItemLayer", {
      scene: this.getSceneState().id,
      key: item.item.key,
      layerKey: layerKey,
    });
  }

  protected changeMultiItemLayer(items: Set<SceneImage>, layerKey: string) {
    const messageItems: MessageItem[] = this.extraMessageItemFromSet(items);

    this.getClient().send("scene", "changeMultiItemLayer", {
      scene: this.getSceneState().id,
      items: messageItems,
      layerKey: layerKey,
    });
  }

  protected adaptSceneToItem(item: SceneImage) {
    this.getClient().send("scene", "adapt", {
      scene: this.getSceneState().id,
      key: item.item.key,
    });
  }

  protected controlItem(item: SceneElement, uid: number) {
    this.getClient().send("scene", "giveControl", {
      scene: this.getSceneState().id,
      key: item.item.key,
      userId: uid,
    });
  }

  protected pasteItem(item: SceneElement, position: any) {
    position.x = parseInt(position.x, 10);
    position.y = parseInt(position.y, 10);

    this.getClient().send("scene", "pasteItem", {
      key: item.item.key,
      scene: this.getSceneState().id,
      position: position,
    });
  }

  protected transformSceneItem(
    item: SceneImage,
    x: number,
    y: number,
    scale: number,
    rotation: number
  ) {
    scale =
      Math.round(scale * SceneEmitter.TRANSFORM_PRECISION) /
      SceneEmitter.TRANSFORM_PRECISION;
    rotation =
      Math.round(rotation * SceneEmitter.TRANSFORM_PRECISION) /
      SceneEmitter.TRANSFORM_PRECISION;
    x =
      Math.round(x * SceneEmitter.TRANSFORM_PRECISION) /
      SceneEmitter.TRANSFORM_PRECISION;
    y =
      Math.round(y * SceneEmitter.TRANSFORM_PRECISION) /
      SceneEmitter.TRANSFORM_PRECISION;

    item.item.transformation = {
      x: x,
      y: y,
      rotation: rotation,
      scale: scale,
    };

    this.getClient().send("scene", "transformItem", {
      key: item.item.key,
      scene: this.getSceneState().id,
      scale: scale,
      rotation: rotation,
      x: x,
      y: y,
    });
  }

  protected moveSceneItem(item: SceneImage, x: number, y: number) {
    this.getClient().send("scene", "moveItem", {
      key: item.item.key,
      x: Math.round(x),
      y: Math.round(y),
      scene: this.getSceneState().id,
    });
  }

  protected moveMultipleSceneItems(event: SceneItemMultiMoveEvent) {
    const items = [];

    event.items.forEach((item) => {
      items.push({
        key: item.item.item.key,
        x: item.x,
        y: item.y,
      });
    });

    this.getClient().send("scene", "moveMultipleItem", {
      items: items,
      scene: this.getSceneState().id,
    });
  }

  protected changeSceneItemZIndex(layer: BoardLayer) {
    const state: SceneState = this.getSceneState();
    const itemsZIndex: any = {};

    for (const i in layer.item.items) {
      const item: LayerItem = layer.item.items[i];

      if (!item.node) {
        continue;
      }

      itemsZIndex[item.key] = (item.node as Shape).getZIndex();
    }

    this.getClient().send("scene", "updateZIndex", {
      layer: layer.item.key,
      order: itemsZIndex,
      scene: state.id,
    });
  }

  protected deleteSceneItem(item: SceneImage) {
    const state: SceneState = this.getSceneState();

    this.getClient().send("scene", "deleteItem", {
      layer: state.layerKey,
      key: item.item.key,
      scene: state.id,
    });
  }

  protected deleteMultipleSceneItem(items: Set<SceneImage>) {
    const state: SceneState = this.getSceneState();
    const messageItems: MessageItem[] = this.extraMessageItemFromSet(items);

    this.getClient().send("scene", "deleteMultiItem", {
      items: messageItems,
      scene: state.id,
    });
  }

  protected extraMessageItemFromSet(items: Set<SceneImage>): MessageItem[] {
    const messageItems: MessageItem[] = [];

    items.forEach((item: SceneImage) => {
      messageItems.push({
        key: item.item.key,
        layer: item.layer.item.key,
      });
    });

    return messageItems;
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }
}

interface MessageItem {
  key: string;
  layer: string;
}
