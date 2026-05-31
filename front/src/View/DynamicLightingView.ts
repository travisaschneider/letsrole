import { injectable } from "inversify";
import { View } from "./View";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { DockableView, ViewOpenMode } from "./DockableView";
import { Template } from "./Template";
import { MenuView } from "./MenuView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { Stage } from "../Engine/Stage";
import { Services } from "../DependencyInjection/Services";
import { Board } from "../Engine/Board";
import { SceneState } from "../State/SceneState";
import { States } from "../DependencyInjection/State";
import {
  DefaultLight,
  DefaultLighting,
  SceneLightingDoor,
  SceneLightingLight,
  SceneLightingWall,
  TokenItem,
} from "../../shared/Scene/SceneData";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { Scene } from "../Entity/Scene";
import { DynamicLighting } from "../Engine/Board/DynamicLighting";
import { Light } from "../Engine/Board/DynamicLighting/Light/Light";
import { LightTemplates } from "../Engine/Board/DynamicLighting/Light/LightTemplates";
import { SceneImage } from "../Engine/SceneImage";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { Repository } from "../DependencyInjection/Repository";
import { UserState } from "../State/UserState";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { LightingLockState, LightingState } from "../State/LightingState";
import Konva from "konva";

@injectable()
export class DynamicLightingView extends View {
  protected static readonly TemporaryLightId: string = "tmp";

  public selectedToken: TokenItem = null;
  protected enabled = false;

  protected optionsContainer: HTMLElement;

  protected activeTool: LightingTool = null;
  protected state: LightingToolState = LightingToolState.Idle;
  protected taskBarItem: TaskBarItem;
  protected view: DockableView;

  protected startPoint: Konva.Vector2d = null;
  protected endPoint: Konva.Vector2d = null;
  protected currentLight: SceneLightingLight;
  protected shiftDown: boolean;

  protected board: Board; // cache

  public init() {
    super.init();

    EventDispatcher.on(Events.USER_ME_LOADED, (e) => {
      if (this.getUserState().isGm()) {
        this.enabled = true;
        this.initialize();
      } else {
        this.enabled = false;
      }
    });

    EventDispatcher.on(Events.SCENE_AFTER_LOAD, (e) => {
      this.onSceneLoad(e.scene);
    });
  }

  protected onSceneLoad(scene: Scene) {
    if (!this.getUserState().isGm()) {
      return this.disableDock();
    }

    if (scene.data.lighting && scene.data.lighting.enabled) {
      return this.enableDock();
    }

    return this.disableDock();
  }

  public disableDock() {
    if (!this.view) {
      return;
    }

    this.view.hide();
  }

  public enableDock() {
    if (!this.view) {
      return;
    }

    this.view.mode = ViewOpenMode.DockRight;
    this.view.open();
    this.view.show();
  }

  protected initialize() {
    this.taskBarItem = new TaskBarItem(
      this.__("Dynamic Lighting"),
      "fas fa-lightbulb-on",
      TaskBarCategory.Tool
    );

    this.view = new DockableView({
      id: "lighting",
      title: this.__("Dynamic Lighting"),
      html: Template.render("lighting/view.html.njk"),
      taskBarItem: this.taskBarItem,
      mode: ViewOpenMode.DockRight,
      fixed: false,
      icon: "fas fa-lightbulb-on",
      defaultConfiguration: {
        index: 20,
        hidden: false,
        minimized: false,
        mode: ViewOpenMode.DockLeft,
      },
    });

    this.getUi().register(this.view);
    this.getTaskBarView().add(this.taskBarItem);

    EventDispatcher.on(Events.LIGHTING_SELECT_WALL, (e: any) => {
      this.onSelectWall(e.wall);
    });

    EventDispatcher.on(Events.LIGHTING_SELECT_DOOR, (e: any) => {
      this.onSelectDoor(e.door);
    });

    EventDispatcher.on(Events.LIGHTING_SELECT_LIGHT, (e: any) => {
      this.onSelectLight(<Light>e.light);
    });

    EventDispatcher.on(Events.LIGHTING_LIGHT_START_DRAG, (e: any) => {
      const light: Light = <Light>e.light;
      light.onMoveStart();

      this.getBoard().getDynamicLighting().clearLightsCache();
    });

    EventDispatcher.on(Events.LIGHTING_MOVE_LIGHT, (e: any) => {
      this.onMoveLight(<Light>e.light);
    });

    EventDispatcher.on(Events.LIGHTING_LIGHT_END_DRAG, (e: any) => {
      const light: Light = <Light>e.light;
      light.onMoveEnd();

      this.getBoard().getDynamicLighting().enableLightsCache();
    });

    EventDispatcher.on(Events.LIGHTING_READY, (e: any) => {
      this.onLightingInit();
    });

    EventDispatcher.on(Events.SCENE_ITEM_SELECT, (e: any) => {
      if (!this.getBoard().getDynamicLighting()) {
        return;
      }

      this.getBoard().getDynamicLighting().unselect();
      const item: SceneImage = e.item;

      if (item.isToken()) {
        this.onSelectToken(item);
      }
    });

    EventDispatcher.on(Events.BOARD_UNSELECT, () => {
      this.onUnselect();
    });

    document.addEventListener("keydown", (e: KeyboardEvent) => {
      this.shiftDown = e.shiftKey;
    });

    document.addEventListener("keyup", (e: KeyboardEvent) => {
      if (this.shiftDown && !e.shiftKey) {
        this.shiftDown = e.shiftKey;
        this.onShiftUp();
      }
    });

    this.initView();
  }

  protected onShiftUp() {
    if (!this.enabled) {
      return;
    }

    if (this.state === LightingToolState.DrawingWall) {
      this.getBoard().getDynamicLighting().clearTools();
      this.state = LightingToolState.Idle;
      this.startPoint = null;
      this.endPoint = null;
    }
  }

  protected clearActiveToolButtons() {
    this.getLightingState().isSimulating = false;

    if (!this.enabled) {
      return;
    }

    this.view.container
      .querySelectorAll(".tool-btn")
      .forEach((toolBtn: HTMLAnchorElement) => {
        toolBtn.classList.remove("active");
      });
  }

  protected initView() {
    $(this.view.container.querySelector(".tools")).find("a[title]").tooltip({
      trigger: "hover",
      placement: "top",
      boundary: "window",
    });

    this.optionsContainer = this.view.container.querySelector(
      "#lighting-options-container"
    );

    this.view.container
      .querySelectorAll(".tool-btn")
      .forEach((toolBtn: HTMLAnchorElement) => {
        const tool: string = toolBtn.dataset.tool;

        toolBtn.addEventListener("click", (e: MouseEvent) => {
          this.clearActiveToolButtons();
          this.activeTool = tool as LightingTool;

          switch (this.activeTool) {
            case LightingTool.Selection:
              this.activeTool = null;
              this.state = LightingToolState.Idle;
              break;
            case LightingTool.Wall:
              toolBtn.classList.add("active");
              this.initDrawingWall();
              break;

            case LightingTool.Light:
              toolBtn.classList.add("active");
              this.state = LightingToolState.InitLight;
              break;

            case LightingTool.Door:
              toolBtn.classList.add("active");
              this.state = LightingToolState.InitDoor;
              break;

            case LightingTool.Simulate:
              if (this.state === LightingToolState.Simulating) {
                this.state = LightingToolState.Idle;
                this.getLightingState().isSimulating = false;
                this.getBoard().updateVisibility();
              } else {
                toolBtn.classList.add("active");
                this.state = LightingToolState.Simulating;
                this.getLightingState().isSimulating = true;
              }
              break;
          }
        });
      });
  }

  protected initDrawingWall() {
    if (!this.enabled) {
      return;
    }

    this.state = LightingToolState.InitWall;

    this.optionsContainer.innerHTML = Template.render(
      "lighting/wall-drawing.html.njk"
    );
  }

  public onLightingInit() {
    if (!this.enabled) {
      return;
    }

    $(this.view.container).find(".custom-switch").tooltip({
      boundary: "window",
      container: "body",
      trigger: "hover",
    });

    const lockedInput: HTMLInputElement =
      this.view.container.querySelector("#light-locked");

    const doorsLockedInput: HTMLInputElement =
      this.view.container.querySelector("#doors-locked");

    const collisionsInput: HTMLInputElement =
      this.view.container.querySelector("#collisions");

    const lighting: DynamicLighting = this.getBoard().getDynamicLighting();
    const lockState: LightingLockState =
      this.getLightingState().getStoredLockState();

    const dispatchLockDoors = () => {
      this.getClient().send("scene", "lockDoors", {
        locked: lighting.isDoorsLocked(),
      });
    };

    const dispatchCollisions = () => {
      this.getClient().send("scene", "enableCollisions", {
        enabled: collisionsInput.checked,
        scene: this.getSceneState().id,
      });
    };

    const saveState = () => {
      this.getLightingState().storeLockState({
        global: lighting.isLocked(),
        doors: lighting.isDoorsLocked(),
      });
    };

    if (lockState.global) {
      lighting.lock();
    }

    if (lockState.doors) {
      lighting.lockDoors();
      dispatchLockDoors();
    }

    lockedInput.addEventListener("change", () => {
      if (lockedInput.checked) {
        lighting.lock();
        this.unselect();
      } else {
        lighting.unlock();
      }

      saveState();
    });

    doorsLockedInput.addEventListener("change", () => {
      if (doorsLockedInput.checked) {
        lighting.lockDoors();
        this.unselect();
      } else {
        lighting.unlockDoors();
      }

      dispatchLockDoors();
      saveState();
    });

    collisionsInput.addEventListener("change", () => {
      dispatchCollisions();
    });

    lockedInput.checked = lighting.isLocked();
    doorsLockedInput.checked = lighting.isDoorsLocked();
    collisionsInput.checked =
      !!this.getSceneState().scene.data?.lighting?.collisionsEnabled;
  }

  public selectDoor(sceneId: number, doorId: string) {
    if (!this.enabled) {
      return;
    }

    if (this.getSceneState().id != sceneId) {
      return;
    }

    const door: SceneLightingDoor = this.getSceneState().scene.findDoor(doorId);

    if (door === null) {
      return;
    }

    this.onSelectDoor(door);
  }

  public selectWall(sceneId: number, wallId: string) {
    if (!this.enabled) {
      return;
    }

    if (this.getSceneState().id != sceneId) {
      return;
    }

    const wall: SceneLightingWall = this.getSceneState().scene.findWall(wallId);

    if (wall === null) {
      return;
    }

    this.onSelectWall(wall);
  }

  public selectLight(sceneId: number, lightId: string) {
    if (!this.enabled) {
      return;
    }

    if (this.getSceneState().id != sceneId) {
      return;
    }

    const light: Light = this.getBoard()
      .getDynamicLighting()
      .getLightInstance(lightId);

    if (light === null) {
      return;
    }

    this.onSelectLight(light);
  }

  protected onUnselect() {
    if (!this.enabled) {
      return;
    }

    if (this.state === LightingToolState.Simulating) {
      return;
    }

    if (!this.getBoard().getDynamicLighting()) {
      return;
    }

    if (this.getBoard().getDynamicLighting().selectedLight) {
      this.getBoard().getDynamicLighting().unselect();
    }

    if (this.selectedToken) {
      this.selectedToken = null;
      this.getBoard().updateVisibility();
    }

    this.optionsContainer.innerHTML = "";
  }

  protected onSelectToken(token: SceneImage) {
    if (!this.enabled) {
      return;
    }

    this.unselect();

    const item: TokenItem = token.item as TokenItem;
    const scene: Scene = this.getSceneState().scene;

    this.selectedToken = item;

    let range: number = this.getBoard()
      .getDynamicLighting()
      .getTokenVisionRange(scene.data, item);
    range = this.convertToUnit(range);

    const emit = !!item.emitsLight;
    const emitColor: string = item.emittedLightColor
      ? item.emittedLightColor
      : "#eedd82";

    const updateToken = (attributes: Partial<TokenItem>) => {
      this.getClient().send("scene", "updateTokenLighting", {
        scene: this.getSceneState().id,
        key: item.key,
        attributes: attributes,
      });
    };

    this.getCharacterRepository()
      .get(item.character.id)
      .then((sheet: CharacterSheet) => {
        this.optionsContainer.innerHTML = Template.render(
          "lighting/character.html.njk",
          {
            character: sheet.character,
            range: range,
            unit: scene.data.metrics.equalType,
            emit: emit,
            emit_color: emitColor,
          }
        );

        $(this.optionsContainer).find(".color-picker").colorpicker({
          horizontal: true,
          format: "hex",
          useAlpha: false,
        });

        const rangeInput: HTMLInputElement =
          this.optionsContainer.querySelector(".character-vision");
        const emitLightInput: HTMLInputElement =
          this.optionsContainer.querySelector("#character-light");

        rangeInput.addEventListener("change", (e: Event) => {
          const units: number = parseFloat(rangeInput.value);
          const pixels: number = this.convertToPixel(units);

          updateToken({
            visionRange: pixels,
          });
        });

        emitLightInput.addEventListener("change", (e: Event) => {
          updateToken({
            emitsLight: emitLightInput.checked,
          });
        });

        $(this.optionsContainer.querySelector(".light-color")).on(
          "colorpickerHide",
          (event: any) => {
            updateToken({
              emittedLightColor: event.color.toString(),
            });
          }
        );
      });

    this.getBoard().updateVisibility();
  }

  protected onSelectLight(light: Light) {
    if (!this.enabled) {
      return;
    }

    console.log(light);

    const scene: Scene = this.getSceneState().scene;

    this.optionsContainer.innerHTML = Template.render(
      "lighting/light.html.njk",
      {
        light: light,
        templates: LightTemplates,
        unit: scene.data.metrics.equalType,
        range_value: this.convertToUnit(light.configuration.range),
      }
    );

    $(this.optionsContainer).find(".color-picker").colorpicker({
      horizontal: true,
      format: "hex",
      useAlpha: false,
    });

    const updateLight = (attributes: any) => {
      this.getClient().send("scene", "updateLight", {
        lightId: light.id,
        attributes: attributes,
        scene: this.getSceneState().id,
      });
    };

    $(this.optionsContainer.querySelector(".light-color")).on(
      "colorpickerHide",
      (event: any) => {
        updateLight({
          color: event.color.toString(),
        });
      }
    );

    const rangeInput: HTMLInputElement =
      this.optionsContainer.querySelector(".light-range");

    rangeInput.addEventListener("change", () => {
      const unitRange: number = parseFloat(rangeInput.value);
      const pixelRange: number = this.convertToPixel(unitRange);

      updateLight({
        range: pixelRange,
      });
    });

    const intensityInput: HTMLInputElement =
      this.optionsContainer.querySelector(".light-intensity");

    intensityInput.addEventListener("change", () => {
      updateLight({
        intensity: parseFloat(intensityInput.value),
      });
    });

    this.optionsContainer
      .querySelector(".delete-btn")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.getClient().send("scene", "removeLight", {
          lightId: light.id,
          scene: this.getSceneState().id,
        });

        this.unselect();
      });

    this.getBoard().getDynamicLighting().selectLight(light);
  }

  protected onSelectWall(wall: SceneLightingWall) {
    if (!this.enabled) {
      return;
    }

    this.optionsContainer.innerHTML = Template.render(
      "lighting/wall.html.njk",
      {
        wall: wall,
      }
    );

    this.getBoard().getDynamicLighting().selectWall(wall);

    this.optionsContainer
      .querySelector(".delete-btn")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.getClient().send("scene", "removeWall", {
          wallId: wall.id,
          scene: this.getSceneState().id,
        });

        this.unselect();
      });

    this.optionsContainer
      .querySelector(".door-btn")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.getClient().send("scene", "convertWallToDoor", {
          wallId: wall.id,
          scene: this.getSceneState().id,
        });
      });
  }

  protected onSelectDoor(door: SceneLightingDoor) {
    if (!this.enabled) {
      return;
    }

    this.optionsContainer.innerHTML = Template.render(
      "lighting/door.html.njk",
      {
        door: door,
      }
    );

    this.getBoard().getDynamicLighting().selectDoor(door);

    const gmInput: HTMLInputElement =
      this.optionsContainer.querySelector("#door-gm");

    gmInput.addEventListener("change", (e) => {
      this.getClient().send("scene", "updateDoor", {
        doorId: door.id,
        scene: this.getSceneState().id,
        attributes: {
          gm: gmInput.checked,
        },
      });
    });

    this.optionsContainer
      .querySelector(".delete-btn")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.getClient().send("scene", "removeDoor", {
          doorId: door.id,
          scene: this.getSceneState().id,
        });

        this.unselect();
      });
  }

  public unselect() {
    if (!this.enabled) {
      return;
    }

    this.optionsContainer.innerHTML = "";
    this.getBoard().getDynamicLighting().unselect();
  }

  protected convertToUnit(range: number) {
    const scene: Scene = this.getSceneState().scene;
    const gridSize: number = scene.data.grid ? scene.data.grid.size : 100;

    return (
      (range / gridSize / scene.data.metrics.baseCount) *
      scene.data.metrics.equalCount
    );
  }

  protected convertToPixel(unit: number) {
    const scene: Scene = this.getSceneState().scene;
    const gridSize: number = scene.data.grid ? scene.data.grid.size : 100;

    return (
      (unit / scene.data.metrics.equalCount) *
      scene.data.metrics.baseCount *
      gridSize
    );
  }

  public onMoveLight(light: Light) {
    this.getClient().send("scene", "moveLight", {
      lightId: light.id,
      scene: this.getSceneState().id,
      x: light.configuration.x,
      y: light.configuration.y,
    });

    this.updateLight(light);
  }

  public updateLight(light: Light) {
    const scene: Scene = this.getSceneState().scene;
    this.getBoard()
      .getDynamicLighting()
      .updateLight(light.id, light.configuration, scene.data);
  }

  public onMouseDown(pointer: any) {
    // TODO Change
    switch (this.state) {
      case LightingToolState.Idle:
        return;

      case LightingToolState.InitWall:
        this.state = LightingToolState.DrawingWall;
        this.startPoint = this.getStage().toLocalPosition(pointer.x, pointer.y);
        return;

      case LightingToolState.InitDoor:
        this.state = LightingToolState.DrawingDoor;
        this.startPoint = this.getStage().toLocalPosition(pointer.x, pointer.y);
        return;

      case LightingToolState.InitLight:
        this.removeTempLight();

        this.getClient().send("scene", "addLight", {
          x: this.endPoint.x,
          y: this.endPoint.y,
          range: DefaultLight.range,
          color: DefaultLight.color,
          intensity: DefaultLight.intensity,
          scene: this.getSceneState().id,
        });

        this.clearActiveToolButtons();

        return;
    }
  }

  public onMouseMove(pointer: any) {
    // TODO change
    switch (this.state) {
      case LightingToolState.Idle: {
        return;
      }

      case LightingToolState.DrawingWall: {
        this.endPoint = this.getStage().toLocalPosition(pointer.x, pointer.y);
        this.drawCurrentWall();
        return;
      }

      case LightingToolState.DrawingDoor: {
        this.endPoint = this.getStage().toLocalPosition(pointer.x, pointer.y);
        this.drawCurrentDoor();
        return;
      }

      case LightingToolState.InitLight: {
        this.endPoint = this.getStage().toLocalPosition(pointer.x, pointer.y);
        this.drawCurrentLight();
        return;
      }

      case LightingToolState.Simulating: {
        const pos: Konva.Vector2d = this.getStage().toLocalPosition(
          pointer.x,
          pointer.y
        );
        this.getLightingState().setSimulatingPosition(pos.x, pos.y);
        this.getBoard().updateVisibility();

        return;
      }
    }
  }

  public onMouseUp(pointer: any) {
    // todo change also
    switch (this.state) {
      case LightingToolState.DrawingWall:
        this.getBoard().getDynamicLighting().clearTools();

        this.getClient().send("scene", "addWall", {
          x1: this.startPoint.x,
          y1: this.startPoint.y,
          x2: this.endPoint.x,
          y2: this.endPoint.y,
          scene: this.getSceneState().id,
        });

        if (this.shiftDown) {
          this.startPoint = {
            x: this.endPoint.x,
            y: this.endPoint.y,
          };

          this.state = LightingToolState.DrawingWall;

          return;
        } else {
          this.clearActiveToolButtons();
        }

        break;

      case LightingToolState.DrawingDoor:
        this.getBoard().getDynamicLighting().clearTools();

        this.getClient().send("scene", "addDoor", {
          x1: this.startPoint.x,
          y1: this.startPoint.y,
          x2: this.endPoint.x,
          y2: this.endPoint.y,
          scene: this.getSceneState().id,
        });

        this.clearActiveToolButtons();

        break;
    }

    this.startPoint = null;
    this.endPoint = null;

    if (this.state !== LightingToolState.Simulating) {
      this.state = LightingToolState.Idle;
    }
  }

  public isDrawing(): boolean {
    switch (this.state) {
      case LightingToolState.DrawingDoor:
      case LightingToolState.DrawingWall:
      case LightingToolState.InitWall:
      case LightingToolState.InitDoor:
        return true;

      default:
        return false;
    }
  }

  protected removeTempLight() {
    const scene: Scene = this.getSceneState().scene;
    const lights: SceneLightingLight[] = scene.data.lighting.lights;

    for (const i in lights) {
      if (lights[i].id == DynamicLightingView.TemporaryLightId) {
        lights.splice(Number(i), 1);
        break;
      }
    }

    this.getBoard().getDynamicLighting().displayLights(scene.data);
    this.getBoard().updateVisibility();

    this.currentLight = null;
  }

  protected drawCurrentLight() {
    const scene: Scene = this.getSceneState().scene;

    if (!scene.data.lighting) {
      scene.data.lighting = JSON.parse(JSON.stringify(DefaultLighting));
    }

    if (!scene.data.lighting.lights) {
      scene.data.lighting.lights = [];
    }

    if (!this.currentLight) {
      this.currentLight = {
        id: DynamicLightingView.TemporaryLightId,
        x: this.endPoint.x,
        y: this.endPoint.y,
        range: DefaultLight.range,
        color: DefaultLight.color,
        intensity: DefaultLight.intensity,
      };

      scene.data.lighting.lights.push(this.currentLight);

      this.getBoard().getDynamicLighting().displayLights(scene.data);
    }

    this.currentLight.x = this.endPoint.x;
    this.currentLight.y = this.endPoint.y;

    this.getBoard()
      .getDynamicLighting()
      .updateLight(
        DynamicLightingView.TemporaryLightId,
        this.currentLight,
        scene.data,
        true
      );

    this.getBoard().updateVisibility();
  }

  protected drawCurrentWall() {
    if (
      this.startPoint &&
      this.endPoint &&
      this.state === LightingToolState.DrawingWall
    ) {
      this.getBoard()
        .getDynamicLighting()
        .drawToolWall(this.startPoint, this.endPoint);
    }
  }

  protected drawCurrentDoor() {
    if (
      this.startPoint &&
      this.endPoint &&
      this.state === LightingToolState.DrawingDoor
    ) {
      this.getBoard()
        .getDynamicLighting()
        .drawToolDoor(this.startPoint, this.endPoint);
    }
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }

  protected getBoard(): Board {
    if (!this.board) {
      this.board = this.getStage().getBoard();
    }

    return this.board;
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }

  protected getCharacterRepository(): CharacterRepository {
    return container.get<CharacterRepository>(Repository.CharacterRepository);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getLightingState(): LightingState {
    return container.get<LightingState>(States.Lighting);
  }
}

export enum LightingTool {
  Selection = "selection",
  Wall = "wall",
  Door = "door",
  Light = "light",
  Simulate = "simulate",
}

export enum LightingToolState {
  Idle,
  InitWall,
  DrawingWall,
  EditingWall,
  InitDoor,
  DrawingDoor,
  EditingDoor,
  InitLight,
  EditingLight,
  Simulating,
}
