import Konva from "konva";
import { Dimension } from "../Math/Dimension";
import { Board } from "./Board";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { Services } from "../DependencyInjection/Services";
import { inject, injectable } from "inversify";
import { Constants } from "../DependencyInjection/Constants";
import { TableState } from "../State/TableState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { UserState } from "../State/UserState";
import { SceneElement } from "./SceneElement";
import { RulerState } from "../State/RulerState";
import { ElementSize, WindowState } from "../State/WindowState";
import {
  CraftItem,
  LayerItem,
  LayerItemType,
  SceneFog,
  SceneLayer,
  TokenItem,
} from "../../shared/Scene/SceneData";
import { SceneImage } from "./SceneImage";
import { AbstractGrid } from "./Board/Grid/AbstractGrid";
import { FogState } from "../State/FogState";
import { DrawingState } from "../State/DrawingState";
import { DrawingItem, DrawingToolNames } from "../../shared/DrawingsData";
import { BoardLayer } from "./Board/BoardLayer";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { Repository } from "../DependencyInjection/Repository";
import { UserRepository } from "../Repository/UserRepository";
import { TurnOrderView } from "../View/TurnOrderView";
import { Views } from "../DependencyInjection/Views";
import { Template } from "../View/Template";
import { DynamicLightingView } from "../View/DynamicLightingView";
import Vector2d = Konva.Vector2d;

@injectable()
export class Stage {
  public static readonly FPSTarget: number = 1000 / 30; // ms
  public static readonly MaxFogSize: number = 10500; // pixels

  public node: Konva.Stage;
  protected windowState: WindowState;

  protected domId: string;

  protected board: Board;
  protected fog: Konva.Layer;

  protected mousePosition: Konva.Vector2d;
  protected isMousePressed: boolean;
  protected isTransforming = false;

  protected static zoomIntensity = 1.1;
  protected lastDraw = 0;

  public constructor(
    @inject(Constants.DomId) id: string,
    @inject(Services.Board) board: Board,
    @inject(States.Window) windowState: WindowState
  ) {
    this.board = board;
    this.domId = id;
    this.windowState = windowState;

    const originalFillStroke = Konva.Context.prototype.fillStrokeShape;

    Konva.Context.prototype.fillStrokeShape = function (shape: Konva.Shape) {
      if (shape instanceof Konva.Text || shape instanceof Konva.TextPath) {
        if (shape.strokeEnabled()) {
          this._stroke(shape);
        }
        if (shape.fillEnabled()) {
          this._fill(shape);
        }
      } else {
        originalFillStroke.call(this, shape);
      }
    };

    this.initEvents();
  }

  public build(): void {
    const metrics = this.windowState.getMap();

    if (this.node !== undefined) {
      this.node.remove();
    }

    this.board.reset();

    this.node = new Konva.Stage({
      container: this.domId,
      width: metrics.w,
      height: metrics.h,
    });

    this.isMousePressed = false;

    this.node.add(this.board.node);

    const lightingView: DynamicLightingView = this.getDynamicLightingView();

    this.node.on("mousedown touchstart", () => {
      this.mousePosition = this.node.getPointerPosition();

      lightingView.onMouseDown(this.mousePosition);

      if (
        !this.getRulerState().active &&
        this.node.isListening() &&
        !this.getFogState().isDrawing() &&
        !this.getDrawingState().isDrawing() &&
        !lightingView.isDrawing() &&
        !this.isTransforming
      ) {
        this.isMousePressed = true;

        EventDispatcher.emit(Events.BOARD_CLICK);
      }
    });

    this.node.on("mouseup touchend", () => {
      this.mousePosition = this.node.getPointerPosition();
      lightingView.onMouseUp(this.mousePosition);
    });

    this.node.on("mousemove", () => {
      lightingView.onMouseMove(this.node.getPointerPosition());
    });

    function getDistance(p1, p2) {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    function getCenter(p1, p2) {
      return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
      };
    }

    let lastCenter = null;
    let lastDist = 0;

    this.node.on("touchmove", (e: any) => {
      const event: TouchEvent = e.evt;

      event.preventDefault();

      const touch1 = event.touches[0];
      const touch2 = event.touches[1];

      if (!touch2) {
        this.moveMobile(event);
        return;
      }

      const p1 = {
        x: touch1.clientX,
        y: touch1.clientY,
      };

      const p2 = {
        x: touch2.clientX,
        y: touch2.clientY,
      };

      if (!lastCenter) {
        lastCenter = getCenter(p1, p2);
        return;
      }

      const newCenter = getCenter(p1, p2);
      const dist = getDistance(p1, p2);

      if (!lastDist) {
        lastDist = dist;
      }

      const boardPosition = this.board.getComputedPosition();
      const boardScale = this.board.getComputedScale();

      const pointTo = {
        x: (newCenter.x - boardPosition.x) / boardScale.x,
        y: (newCenter.y - boardPosition.y) / boardScale.x,
      };

      const scale = boardScale.x * (dist / lastDist);

      const dx = newCenter.x - lastCenter.x;
      const dy = newCenter.y - lastCenter.y;

      const newPos = {
        x: newCenter.x - pointTo.x * scale + dx,
        y: newCenter.y - pointTo.y * scale + dy,
      };

      this.board.setComputedPosition(newPos);

      this.board.setComputedScale({
        x: scale,
        y: scale,
      });

      lastDist = dist;
      lastCenter = newCenter;

      this.board.applyComputed();
    });

    this.initContextualMenu();

    this.fog = new Konva.Layer();
    this.fog.listening(false);
    this.node.add(this.fog);
  }

  public moveMobile(event: TouchEvent) {
    const position = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };

    if (position !== undefined) {
      const board = this.board;
      const computedPosition: Vector2d = board.getComputedPosition();

      computedPosition.x += position.x - this.mousePosition.x;
      computedPosition.y += position.y - this.mousePosition.y;

      board.applyComputed();

      this.fog.position(board.getComputedPosition());

      this.mousePosition = position;
    }
  }

  public displayPlayerFog(fog: SceneFog, size: Vector2d) {
    let clip: Konva.Image = this.board.node.getAttr("clipimage");
    let canvas: HTMLCanvasElement = this.board.node.getAttr("clipcanvas");

    if (clip) {
      clip.remove();
      canvas.remove();

      clip = null;
      canvas = null;
    }

    const width: number = Math.min(Stage.MaxFogSize, size.x);
    const height: number = Math.min(Stage.MaxFogSize, size.y);

    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      this.board.node.setAttr("clipcanvas", canvas);
    }

    if (canvas.width != width) {
      canvas.width = width;
    }

    if (canvas.height != height) {
      canvas.height = height;
    }

    if (!clip) {
      clip = new Konva.Image({
        image: canvas as any,
        fill: "#000",
        globalCompositeOperation: "destination-in",
        listening: false,
      });

      this.board.node.add(clip);
      this.board.node.setAttr("clipimage", clip);
    }

    const ctx = canvas.getContext("2d");

    ctx.beginPath();

    fog.points.forEach((region) => {
      if (region.length <= 0) {
        return;
      }

      ctx.moveTo(region[0][0], region[0][1]);

      for (let i = 1; i < region.length; i++) {
        ctx.lineTo(region[i][0], region[i][1]);
      }

      ctx.closePath();
    });

    ctx.fill("evenodd");

    clip.image(canvas as any);
    clip.draw();
  }

  public displayFog(fog: SceneFog, size: Vector2d) {
    if (!fog || !fog.enabled) {
      this.fog.visible(false);

      return;
    }

    if (!this.getUserState().isGm()) {
      return this.displayPlayerFog(fog, size);
    }

    this.fog.visible(true);

    let shadow: Konva.Rect = this.fog.getAttr("clipshadow");
    let clip: Konva.Image = this.fog.getAttr("clipimage");
    let canvas: HTMLCanvasElement = this.fog.getAttr("clipcanvas");

    if (shadow) {
      shadow.remove();
      clip.remove();
      canvas.remove();

      shadow = null;
      clip = null;
      canvas = null;
    }

    if (!shadow) {
      shadow = new Konva.Rect({
        x: -100,
        y: -100,
        width: this.board.scene.data.width + 200,
        height: this.board.scene.data.height + 200,
        fill: "black",
        opacity: 0.55,
      });

      this.fog.add(shadow);
      this.fog.setAttr("clipshadow", shadow);
    }

    const width: number = Math.min(Stage.MaxFogSize, size.x);
    const height: number = Math.min(Stage.MaxFogSize, size.y);

    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      this.fog.setAttr("clipcanvas", canvas);
    }

    if (canvas.width != width) {
      canvas.width = width;
    }

    if (canvas.height != height) {
      canvas.height = height;
    }

    if (!clip) {
      clip = new Konva.Image({
        image: canvas as CanvasImageSource,
        globalCompositeOperation: "destination-out",
      });

      this.fog.add(clip);
      this.fog.setAttr("clipimage", clip);
    }

    const ctx = canvas.getContext("2d");
    ctx.beginPath();

    fog.points.forEach((region) => {
      if (region.length <= 0) {
        return;
      }

      ctx.moveTo(region[0][0], region[0][1]);

      for (let i = 1; i < region.length; i++) {
        ctx.lineTo(region[i][0], region[i][1]);
      }

      ctx.closePath();
    });

    ctx.fill("evenodd");

    clip.image(canvas as CanvasImageSource);
    clip.draw();
  }

  public clearFogMask() {
    const mask: Konva.Line = this.fog.getAttr("clipmask");

    if (mask) {
      mask.remove();
      this.fog.setAttr("clipmask", null);
    }
  }

  public displayFogMask(polygon: number[][]) {
    let mask: Konva.Line = this.fog.getAttr("clipmask");

    if (!mask) {
      mask = new Konva.Line({
        points: [],
        closed: true,
        fill: "rgba(255,0,0,0.3)",
        stroke: "red",
        strokeWidth: 3,
      });

      this.fog.add(mask);
      this.fog.setAttr("clipmask", mask);
    }

    const flat: number[] = [];

    for (const i in polygon) {
      flat.push(polygon[i][0], polygon[i][1]);
    }

    mask.points(flat);
    mask.draw();
  }

  protected initContextualMenu(): void {
    document.getElementById(this.domId).addEventListener("contextmenu", (e) => {
      e.preventDefault();

      document.getElementById("poi").innerHTML = "";

      if (
        this.board.selectedItem == null &&
        this.board.selectedDrawingItem == null &&
        !this.board.isMultipleSelect()
      ) {
        return false;
      }

      if (this.board.isMultipleSelect()) {
        return this.openMultiContextual(this.board.getAllSelectedItems(), e);
      }

      if (this.board.selectedDrawingItem && !this.board.selectedItem) {
        const item = this.getBoard().selectedDrawingItem;
        return this.openDrawingContextual(item, e);
      }

      const item = this.getBoard().selectedItem;

      if (item == null) {
        return;
      }

      switch (item.item.type) {
        case LayerItemType.Image:
          return this.openImageContextual(item, e);

        case LayerItemType.Token:
          return this.openTokenContextual(item, e);

        case LayerItemType.Craft:
          return this.openCraftContextual(item, e);
      }
    });

    document.addEventListener("mousedown", (e) => {
      const container: HTMLElement = document.getElementById("contextual");
      const firstChild: HTMLElement =
        container.firstElementChild as HTMLElement;

      if (!firstChild) {
        return;
      }

      if (!firstChild.contains(e.target as HTMLElement)) {
        this.closeContextualMenu();
      }
    });
  }

  protected openCraftContextual(item: SceneImage, e: MouseEvent) {
    const container: HTMLElement = document.getElementById("contextual");
    const layers: LayerItem[] = this.getLayersToMove(item);

    const data = item.item as CraftItem;

    const users = this.getUserRepository()
      .toArray()
      .filter((user: any) => {
        return user.id !== this.getUserState().id;
      });

    const alreadyControl = {};

    if (item.item.controls) {
      item.item.controls.forEach((uid: number) => {
        alreadyControl[uid.toString(10)] = true;
      });
    }

    const menuHtml: string = Template.render(
      "stage/contextual/craft-menu.html.njk",
      {
        left: e.pageX,
        top: e.pageY,
        title: data.craft.name,
        item: item,
        layer: item.layer.item.name,
        layers: layers,
        canLayerMove: layers.length > 0,
        users: users,
        canGiveControl: users.length > 0,
        isGm: this.getUserState().isGm(),
        alreadyControl: alreadyControl,
      }
    );

    container.innerHTML = menuHtml;

    const menu: HTMLElement = container.querySelector(".menu");
    const openCraft: HTMLElement = menu.querySelector(".btn-open-craft");
    const openAura: HTMLElement = menu.querySelector(".btn-open-aura");
    const openBars: HTMLElement = menu.querySelector(".btn-open-bars");
    const turnOrderAction: HTMLElement =
      menu.querySelector(".turn-order-action");

    const $menu = $(menu);

    if (e.pageY + $menu.outerHeight() > window.innerHeight) {
      $(menu).css("top", e.pageY - $(menu).outerHeight());
    }

    this.initGenericContextual(menu, item);

    if (openCraft) {
      openCraft.addEventListener("click", (e) => {
        e.preventDefault();

        EventDispatcher.emit(Events.CRAFT_OPEN_SHEET, {
          id: data.craft.id,
        });

        this.closeContextualMenu();
      });
    }

    if (openAura) {
      openAura.addEventListener("click", (e) => {
        e.preventDefault();

        EventDispatcher.emit(Events.TOKEN_OPEN_AURA, {
          item: item,
        });

        this.closeContextualMenu();
      });
    }

    if (openBars) {
      openBars.addEventListener("click", (e) => {
        e.preventDefault();

        EventDispatcher.emit(Events.TOKEN_OPEN_BARS, {
          item: item,
        });

        this.closeContextualMenu();
      });
    }

    if (turnOrderAction) {
      turnOrderAction.addEventListener("click", (e) => {
        e.preventDefault();

        this.getTurnOrderView().addCraft(data.craft.id, data.craft.name, 0);
        this.closeContextualMenu();
      });
    }

    this.initMoveToLayerContextual(menu, item);
    this.initGiveControlContextual(menu, item);
  }

  protected openMultiContextual(items: Set<SceneImage>, e: MouseEvent) {
    const container: HTMLElement = document.getElementById("contextual");
    const layers: LayerItem[] = this.getLayersToMove(null);

    const menuHtml: string = Template.render(
      "stage/contextual/multi-menu.html.njk",
      {
        left: e.pageX,
        top: e.pageY,
        layers: layers,
        canLayerMove: layers.length > 1,
        items: items,
        isGm: this.getUserState().isGm(),
      }
    );

    container.innerHTML = menuHtml;

    const menu: HTMLElement = container.querySelector(".menu");
    const $menu = $(menu);

    if (e.pageY + $menu.outerHeight() > window.innerHeight) {
      $(menu).css("top", e.pageY - $(menu).outerHeight());
    }

    menu.querySelector(".delete-action").addEventListener("click", (e) => {
      EventDispatcher.emit(Events.SCENE_ITEM_MULTI_DELETE, {
        items: items,
      });

      this.getBoard().clearGroupSelect();
      this.closeContextualMenu();
    });

    menu
      .querySelectorAll(".layer-move-action")
      .forEach((moveLink: HTMLAnchorElement) => {
        moveLink.addEventListener("click", (e) => {
          e.preventDefault();

          const layerKey: string = moveLink.dataset.key;

          EventDispatcher.emit(Events.SCENE_ITEM_MULTI_CHANGE_LAYER, {
            items: items,
            layerKey: layerKey,
          });

          this.closeContextualMenu();
        });
      });
  }

  protected openDrawingContextual(item: DrawingItem, e: MouseEvent) {
    const container: HTMLElement = document.getElementById("contextual");
    let layer: BoardLayer = null;

    if (item.node) {
      const layerKey: string = item.node.getAttr("layerKey");

      if (layerKey) {
        layer = this.getBoard().getLayer(layerKey);
      }
    }

    const users = this.getUserRepository()
      .toArray()
      .filter((user: any) => {
        return user.id !== this.getUserState().id;
      });

    const alreadyControl = {};

    if (item.controls) {
      item.controls.forEach((uid: number) => {
        alreadyControl[uid.toString(10)] = true;
      });
    }

    const menuHtml: string = Template.render(
      "stage/contextual/drawing-menu.html.njk",
      {
        left: e.pageX,
        top: e.pageY,
        item: item,
        layer: layer.item,
        names: DrawingToolNames,
        users: users,
        canGiveControl:
          users.length > 0 &&
          (item.userId == this.getUserState().id || this.getUserState().isGm()),
        isGm: this.getUserState().isGm(),
        alreadyControl: alreadyControl,
      }
    );

    container.innerHTML = menuHtml;

    const menu: HTMLElement = container.querySelector(".menu");
    const $menu = $(menu);

    if (e.pageY + $menu.outerHeight() > window.innerHeight) {
      $(menu).css("top", e.pageY - $(menu).outerHeight());
    }

    menu.querySelector(".front-action").addEventListener("click", (e) => {
      item.node.moveToTop();

      EventDispatcher.emit(Events.DRAWING_ZINDEX, {
        item: item,
        layer: layer,
      });

      this.closeContextualMenu();
    });

    menu.querySelector(".up-action").addEventListener("click", (e) => {
      item.node.setZIndex(item.node.getZIndex() + 1);

      EventDispatcher.emit(Events.DRAWING_ZINDEX, {
        item: item,
        layer: layer,
      });

      this.closeContextualMenu();
    });

    menu.querySelector(".down-action").addEventListener("click", (e) => {
      item.node.setZIndex(item.node.getZIndex() - 1);

      EventDispatcher.emit(Events.DRAWING_ZINDEX, {
        item: item,
        layer: layer,
      });

      this.closeContextualMenu();
    });

    menu.querySelector(".back-action").addEventListener("click", (e) => {
      item.node.moveToBottom();

      EventDispatcher.emit(Events.DRAWING_ZINDEX, {
        item: item,
        layer: layer,
      });

      this.closeContextualMenu();
    });

    menu
      .querySelectorAll(".give-control-action")
      .forEach((controlBtn: HTMLElement) => {
        controlBtn.addEventListener("click", (e) => {
          e.preventDefault();
          const uid: number = parseInt(controlBtn.dataset.userId, 10);

          EventDispatcher.emit(Events.DRAWING_CONTROL, {
            item: item,
            uid: uid,
          });

          this.closeContextualMenu();
        });
      });
  }

  protected openTokenContextual(item: SceneImage, e: MouseEvent) {
    const container: HTMLElement = document.getElementById("contextual");

    const data = item.item as TokenItem;
    const layers: LayerItem[] = this.getLayersToMove(item);

    const users = this.getUserRepository()
      .toArray()
      .filter((user: any) => {
        return user.id !== this.getUserState().id;
      });

    const alreadyControl = {};

    if (item.item.controls) {
      item.item.controls.forEach((uid: number) => {
        alreadyControl[uid.toString(10)] = true;
      });
    }

    const menuHtml: string = Template.render(
      "stage/contextual/token-menu.html.njk",
      {
        left: e.pageX,
        top: e.pageY,
        title: data.character.name,
        item: item,
        layer: item.layer.item.name,
        layers: layers,
        canLayerMove: layers.length > 0,
        users: users,
        canGiveControl: users.length > 0,
        isGm: this.getUserState().isGm(),
        alreadyControl: alreadyControl,
      }
    );

    container.innerHTML = menuHtml;

    const menu: HTMLElement = container.querySelector(".menu");
    const $menu = $(menu);

    if (e.pageY + $menu.outerHeight() > window.innerHeight) {
      $(menu).css("top", e.pageY - $(menu).outerHeight());
    }

    this.initGenericContextual(menu, item);

    menu.querySelector(".btn-open-sheet").addEventListener("click", (e) => {
      e.preventDefault();
      console.log("sheet open click");

      EventDispatcher.emit(Events.CHARACTER_OPEN_SHEET, {
        id: data.character.id,
      });

      this.closeContextualMenu();
    });

    menu.querySelector(".btn-open-aura").addEventListener("click", (e) => {
      e.preventDefault();

      EventDispatcher.emit(Events.TOKEN_OPEN_AURA, {
        item: item,
      });

      this.closeContextualMenu();
    });

    menu.querySelector(".btn-open-bars").addEventListener("click", (e) => {
      e.preventDefault();

      EventDispatcher.emit(Events.TOKEN_OPEN_BARS, {
        item: item,
      });

      this.closeContextualMenu();
    });

    menu.querySelector(".turn-order-action").addEventListener("click", (e) => {
      e.preventDefault();

      this.getTurnOrderView().addCharacter(
        data.character.id,
        data.character.name,
        0
      );
      this.closeContextualMenu();
    });

    this.initMoveToLayerContextual(menu, item);
    this.initGiveControlContextual(menu, item);
  }

  protected initGiveControlContextual(menu: HTMLElement, item: SceneImage) {
    menu
      .querySelectorAll(".give-control-action")
      .forEach((controlBtn: HTMLElement) => {
        controlBtn.addEventListener("click", (e) => {
          e.preventDefault();
          const uid: number = parseInt(controlBtn.dataset.userId, 10);

          EventDispatcher.emit(Events.SCENE_ITEM_CONTROL, {
            item: item,
            uid: uid,
          });

          this.closeContextualMenu();
        });
      });
  }

  protected getLayersToMove(item?: SceneImage): LayerItem[] {
    let layers = [];

    this.getBoard()
      .getLayers()
      .forEach((layer: BoardLayer) => {
        if (!item) {
          layers.push(layer.item);
        } else {
          if (item.layer.item.key != layer.item.key) {
            layers.push(layer.item);
          }
        }
      });

    layers = layers.reverse();

    return layers;
  }

  protected openImageContextual(item: SceneImage, e: MouseEvent) {
    const container: HTMLElement = document.getElementById("contextual");
    const layers: LayerItem[] = this.getLayersToMove(item);

    let canAdapt = true;

    if (item.item.transformation) {
      if (item.item.transformation.rotation !== 0) {
        canAdapt = false;
      }
    }

    const users = this.getUserRepository()
      .toArray()
      .filter((user: any) => {
        return user.id !== this.getUserState().id;
      });

    const alreadyControl = {};

    if (item.item.controls) {
      item.item.controls.forEach((uid: number) => {
        alreadyControl[uid.toString(10)] = true;
      });
    }

    const menuHtml: string = Template.render(
      "stage/contextual/image-menu.html.njk",
      {
        left: e.pageX,
        top: e.pageY,
        title: item.item.name,
        item: item,
        canAdapt: canAdapt,
        layer: item.layer.item.name,
        layers: layers,
        canLayerMove: layers.length > 0,
        users: users,
        canGiveControl: users.length > 0,
        alreadyControl: alreadyControl,
        isGm: this.getUserState().isGm(),
      }
    );

    container.innerHTML = menuHtml;

    const menu: HTMLElement = container.querySelector(".menu");
    const $menu = $(menu);

    if (e.pageY + $menu.outerHeight() > window.innerHeight) {
      $(menu).css("top", e.pageY - $(menu).outerHeight());
    }

    menu.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    });

    menu.querySelector(".delete-action").addEventListener("click", (e) => {
      EventDispatcher.emit(Events.SCENE_ITEM_DELETE, {
        item: item,
      });

      this.closeContextualMenu();
    });

    const adaptActionBtn = menu.querySelector(".adapt-action");
    const adaptImageActionBtn = menu.querySelector(".adapt-image-action");

    if (adaptActionBtn) {
      adaptActionBtn.addEventListener("click", (e) => {
        e.preventDefault();

        EventDispatcher.emit(Events.SCENE_ITEM_ADAPT, {
          item: item,
        });

        this.closeContextualMenu();
      });
    }

    if (adaptImageActionBtn) {
      adaptImageActionBtn.addEventListener("click", (e) => {
        e.preventDefault();

        EventDispatcher.emit(Events.SCENE_ITEM_IMAGE_ADAPT, {
          item: item,
        });

        this.closeContextualMenu();
      });
    }

    this.initGenericContextual(menu, item);
    this.initMoveToLayerContextual(menu, item);
    this.initGiveControlContextual(menu, item);

    return false;
  }

  protected initMoveToLayerContextual(menu: HTMLElement, item: SceneImage) {
    menu
      .querySelectorAll(".layer-move-action")
      .forEach((moveLink: HTMLAnchorElement) => {
        moveLink.addEventListener("click", (e) => {
          e.preventDefault();

          const layerKey: string = moveLink.dataset.key;

          EventDispatcher.emit(Events.SCENE_ITEM_CHANGE_LAYER, {
            item: item,
            layerKey: layerKey,
          });

          this.closeContextualMenu();
        });
      });
  }

  protected initGenericContextual(menu: HTMLElement, item: SceneElement) {
    const frontAction: HTMLElement = menu.querySelector(".front-action");
    const upAction: HTMLElement = menu.querySelector(".up-action");
    const downAction: HTMLElement = menu.querySelector(".down-action");
    const backAction: HTMLElement = menu.querySelector(".back-action");

    if (frontAction) {
      frontAction.addEventListener("click", (e) => {
        e.preventDefault();
        item.moveToTop();

        EventDispatcher.emit(Events.SCENE_ITEM_ZINDEX, {
          item: item,
          layer: item.layer,
        });

        this.closeContextualMenu();
      });
    }

    if (upAction) {
      upAction.addEventListener("click", (e) => {
        e.preventDefault();
        item.setZIndex(item.getZIndex() + 1);

        EventDispatcher.emit(Events.SCENE_ITEM_ZINDEX, {
          item: item,
          layer: item.layer,
        });

        this.closeContextualMenu();
      });
    }

    if (downAction) {
      downAction.addEventListener("click", (e) => {
        e.preventDefault();
        item.setZIndex(item.getZIndex() - 1);

        EventDispatcher.emit(Events.SCENE_ITEM_ZINDEX, {
          item: item,
          layer: item.layer,
        });

        this.closeContextualMenu();
      });
    }

    if (backAction) {
      backAction.addEventListener("click", (e) => {
        e.preventDefault();
        item.moveToBottom();

        EventDispatcher.emit(Events.SCENE_ITEM_ZINDEX, {
          item: item,
          layer: item.layer,
        });

        this.closeContextualMenu();
      });
    }
  }

  public closeContextualMenu() {
    document.getElementById("contextual").innerHTML = "";
  }

  protected initEvents(): void {
    window.addEventListener("mouseup", () => {
      this.isMousePressed = false;
    });

    EventDispatcher.on(Events.DRAWING_TRANSFORM_START, () => {
      this.isTransforming = true;
    });

    EventDispatcher.on(Events.DRAWING_TRANSFORM_END, () => {
      this.isTransforming = false;
    });

    document
      .getElementById(this.domId)
      .addEventListener("wheel", (event: WheelEvent) => {
        this.onMouseWheel(event);
      });

    const requestAnimationFrame = (t: number) => {
      this.onEnterFrame(t);
      window.requestAnimationFrame(requestAnimationFrame);
    };

    window.requestAnimationFrame(requestAnimationFrame);
  }

  public resize() {
    const windowState: WindowState = container.get<WindowState>(States.Window);
    const dimensions: ElementSize = windowState.getMap();

    this.node.width(dimensions.w);
    this.node.height(dimensions.h);
  }

  public snapPosition(position: Konva.Vector2d): Konva.Vector2d {
    const grid: AbstractGrid = this.board.getGrid();

    if (!grid) {
      return position;
    }

    if (!grid.isSnap) {
      return position;
    }

    return grid.snapPosition(position);
  }

  public snapDimension(dimension: Dimension): Dimension {
    const grid: AbstractGrid = this.board.getGrid();

    if (!grid) {
      return dimension;
    }

    if (!grid.isSnap) {
      return dimension;
    }

    return grid.snapDimension(dimension);
  }

  public toLocalPosition(x: number, y: number) {
    const board = this.board;
    const oldScale = board.node.scaleX();

    return {
      x: x / oldScale - board.node.x() / oldScale,
      y: y / oldScale - board.node.y() / oldScale,
    };
  }

  public toGlobalPosition(x: number, y: number) {
    const transform = this.getBoard().node.getAbsoluteTransform();

    const transformed = transform.point({
      x: x,
      y: y,
    });

    return transformed;
  }

  public getItemGlobalPosition(item: Konva.Node): Konva.Vector2d {
    return item.getAbsolutePosition();
  }

  protected onMouseWheel(event: WheelEvent) {
    event.preventDefault();

    const board = this.board;
    const oldScale = board.node.scaleX();
    const pointerPosition = this.node.getPointerPosition();

    if (pointerPosition === undefined) {
      return;
    }

    const mousePointTo = {
      x: pointerPosition.x / oldScale - board.node.x() / oldScale,
      y: pointerPosition.y / oldScale - board.node.y() / oldScale,
    };

    let newScale =
      event.deltaY < 0
        ? oldScale * Stage.zoomIntensity
        : oldScale / Stage.zoomIntensity;

    if (newScale < Board.MIN_SCALE) {
      newScale = Board.MIN_SCALE;
    } else if (newScale > Board.MAX_SCALE) {
      newScale = Board.MAX_SCALE;
    }

    const position = {
      x: -(mousePointTo.x - pointerPosition.x / newScale) * newScale,
      y: -(mousePointTo.y - pointerPosition.y / newScale) * newScale,
    };

    const scale = {
      x: newScale,
      y: newScale,
    };

    board.setComputedPosition(position);
    board.setComputedScale(scale);
    board.applyComputed();
  }

  public getFog(): Konva.Layer {
    return this.fog;
  }

  public onEnterFrame(t: number) {
    if (this.isMousePressed && !this.getWindowState().isMobile()) {
      const position = this.node.getPointerPosition();

      if (position !== undefined) {
        const board = this.board;
        const computedPosition: Vector2d = board.getComputedPosition();

        computedPosition.x += position.x - this.mousePosition.x;
        computedPosition.y += position.y - this.mousePosition.y;

        board.applyComputed();

        this.fog.position(board.getComputedPosition());

        this.mousePosition = position;
      }
    }

    if (this.board.isAnimated) {
      if (t - this.lastDraw > Stage.FPSTarget) {
        this.board.node.batchDraw();
        this.lastDraw = t;
      }
    }
  }

  public getBoard(): Board {
    return this.board;
  }

  protected getTurnOrderView(): TurnOrderView {
    return container.get<TurnOrderView>(Views.TurnOrder);
  }

  protected getCharacterRepository(): CharacterRepository {
    return container.get<CharacterRepository>(Repository.CharacterRepository);
  }

  protected getUserRepository(): UserRepository {
    return container.get<UserRepository>(Repository.UserRepository);
  }

  protected getWindowState(): WindowState {
    return container.get<WindowState>(States.Window);
  }

  protected getTableState(): TableState {
    return container.get<TableState>(States.Table);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
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

  protected getDynamicLightingView(): DynamicLightingView {
    return container.get<DynamicLightingView>(Views.DynamicLighting);
  }
}
