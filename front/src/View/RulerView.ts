import { View } from "./View";
import { injectable } from "inversify";
import { RulerState } from "../State/RulerState";
import { States } from "../DependencyInjection/State";
import { container } from "../DependencyInjection/Container";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import Konva from "konva";
import { Board } from "../Engine/Board";
import { Services } from "../DependencyInjection/Services";
import { Stage } from "../Engine/Stage";
import { SceneState } from "../State/SceneState";
import { SceneMetrics } from "../../shared/Scene/SceneData";
import { ArrayUtil } from "shared/Util/ArrayUtil";
import { CharacterState } from "../State/CharacterState";
import { UserState } from "../State/UserState";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { DockableView, ViewOpenMode } from "./DockableView";
import { MenuView } from "./MenuView";
import { Views } from "../DependencyInjection/Views";
import { Template } from "./Template";
import { Scene } from "../Entity/Scene";

@injectable()
export class RulerView extends View {
  protected static readonly SendInterval: number = 1000 / 30;

  protected map: HTMLElement;
  protected rulerType: RulerType;
  protected wayPoints: Konva.Vector2d[] = [];
  protected tooltips: Map<number, HTMLElement> = new Map<number, HTMLElement>();
  protected isMeasuring = false;
  protected shiftPressed = false;
  protected mousePressed = false;
  protected metrics = "";
  protected toolboxVisible = false;

  protected path: Konva.Vector2d[];
  protected converted: Konva.Vector2d[];

  protected taskBarItem: TaskBarItem;
  protected view: DockableView;

  protected lastSent: Date;
  protected sentTimeout: any;

  protected options = {
    share: true,
    line: {
      highlight: true,
    },
    cone: {
      size: 10,
      angle: 45,
    },
    circle: {
      size: 10,
    },
    rectangle: {
      width: 10,
      height: 10,
    },
  };

  public init() {
    super.init();

    this.taskBarItem = new TaskBarItem(
      this.__("Rulers"),
      "fas fa-ruler",
      TaskBarCategory.Tool
    );

    this.view = new DockableView({
      id: "rulers",
      title: this.__("Rulers"),
      html: Template.render("ruler/container.html.njk"),
      taskBarItem: this.taskBarItem,
      mode: ViewOpenMode.DockRight,
      icon: "fas fa-ruler",
      header: Template.render("ruler/header.html.njk"),
      defaultConfiguration: {
        index: 7,
        hidden: true,
        minimized: false,
        mode: ViewOpenMode.DockLeft,
      },
    });

    this.getUi().register(this.view);
    this.getTaskBarView().add(this.taskBarItem);

    this.view.on(DockableView.ON_CLOSE, () => {
      this.disableRuler();
    });

    this.map = document.getElementById("map");

    this.map.addEventListener("mousedown", (e) => {
      this.onMouseDown(e);
    });

    window.addEventListener("mouseup", (e) => {
      this.onMouseUp(e);
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Shift") {
        this.shiftPressed = true;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.key === "Shift" && this.shiftPressed) {
        this.onReleaseShift();
      }

      this.shiftPressed = false;
    });

    this.map.addEventListener("mousemove", (e) => {
      this.onMouseMove(e);
    });

    this.view.container
      .querySelectorAll(".ruler-btn")
      .forEach((btn: HTMLElement) => {
        btn.addEventListener("click", (e) => {
          $(this.view.container).find(".ruler-btn").removeClass("active");
          const type: RulerType = btn.dataset.type as RulerType;

          if (this.getState().active && this.rulerType === type) {
            this.disableRuler();
          } else {
            btn.classList.add("active");
            this.enableRuler(type);
          }
        });
      });

    EventDispatcher.on(Events.RULER_MOUSEDOWN, (e) => {
      this.startRuler(e.position);
    });

    EventDispatcher.on(Events.SCENE_ITEM_DROP, () => {
      this.disableRuler();
    });

    EventDispatcher.on(Events.SCENE_UPDATE_METRICS, (e) => {
      this.updateMetricsNames();
    });

    EventDispatcher.on(Events.SCENE_AFTER_LOAD, (e) => {
      this.updateMetricsNames();
    });

    this.initOptions();
  }

  protected getTooltip(id: number): HTMLElement {
    if (this.tooltips.has(id)) {
      return this.tooltips.get(id);
    }

    const tooltip = document.createElement("div");
    tooltip.classList.add("ruler-tooltip");

    document.getElementById("app").appendChild(tooltip);

    this.tooltips.set(id, tooltip);
  }

  protected removeTooltip(id: number) {
    if (!this.tooltips.has(id)) {
      return;
    }

    const tooltip = this.tooltips.get(id);
    tooltip.remove();
    this.tooltips.delete(id);
  }

  protected updateMetricsNames() {
    if (!this.getSceneState().scene) {
      return;
    }

    const type: string = this.getSceneState().scene.data.metrics.equalType;

    this.view.container
      .querySelectorAll(".metrics-name")
      .forEach((name: HTMLElement) => {
        name.innerText = type;
      });
  }

  protected initOptions() {
    const $box = $(this.view.container);

    $(this.view.header)
      .find("#ruler-share")
      .on("change", (e) => {
        const checkbox: HTMLInputElement = e.currentTarget as HTMLInputElement;
        this.options.share = !!checkbox.checked;
      })
      .trigger("change");

    $box
      .find("#line-ruler-highlight")
      .on("change", (e) => {
        const checkbox: HTMLInputElement = e.currentTarget as HTMLInputElement;
        this.options.line.highlight = !!checkbox.checked;
      })
      .trigger("change");

    $box
      .find("#cone-ruler-angle")
      .on("change", (e) => {
        const angleInput: HTMLInputElement =
          e.currentTarget as HTMLInputElement;
        this.options.cone.angle = parseFloat(angleInput.value);
      })
      .trigger("change");

    $box
      .find("#cone-ruler-size")
      .on("change", (e) => {
        const sizeInput: HTMLInputElement = e.currentTarget as HTMLInputElement;
        this.options.cone.size = parseFloat(sizeInput.value);
      })
      .trigger("change");

    $box
      .find("#circle-ruler-size")
      .on("change", (e) => {
        const sizeInput: HTMLInputElement = e.currentTarget as HTMLInputElement;
        this.options.circle.size = parseFloat(sizeInput.value);
      })
      .trigger("change");

    $box
      .find("#rectangle-ruler-width")
      .on("change", (e) => {
        const widthInput: HTMLInputElement =
          e.currentTarget as HTMLInputElement;
        this.options.rectangle.width = parseFloat(widthInput.value);
      })
      .trigger("change");

    $box
      .find("#rectangle-ruler-height")
      .on("change", (e) => {
        const heightInput: HTMLInputElement =
          e.currentTarget as HTMLInputElement;
        this.options.rectangle.height = parseFloat(heightInput.value);
      })
      .trigger("change");
  }

  public disableRuler() {
    this.rulerType = null;
    this.map.classList.remove("ruler-enabled");
    this.getState().active = false;

    this.view.container
      .querySelectorAll(".ruler-btn")
      .forEach((btn: HTMLElement) => {
        btn.classList.remove("active");
      });

    this.view.container
      .querySelectorAll(".ruler-option")
      .forEach((options: HTMLElement) => {
        options.classList.add("d-none");
      });
  }

  public enableRuler(type: RulerType) {
    this.rulerType = type;
    this.map.classList.add("ruler-enabled");
    this.getState().active = true;

    this.view.container
      .querySelectorAll(".ruler-option")
      .forEach((options: HTMLElement) => {
        options.classList.add("d-none");
      });

    this.view.container
      .querySelector(".option-" + this.rulerType)
      .classList.remove("d-none");
  }

  public clear() {
    const board: Board = this.getBoard();
    const id: string = this.getUserState().id.toString(10);

    if (board.getGrid()) {
      board.getGrid().clearHighlight(id);
    }

    board.getToolLayer().empty(0);
    this.removeTooltip(0);
    this.wayPoints = [];
    this.isMeasuring = false;

    this.getClient().send("ruler", "clear", {});
  }

  public detach(id: number) {
    const board: Board = this.getBoard();

    if (board.getGrid()) {
      board.getGrid().clearHighlight(id.toString(10));
    }

    board.getToolLayer().empty(id);
    this.removeTooltip(id);
  }

  protected onReleaseShift() {
    if (!this.mousePressed) {
      this.clear();
    }
  }

  protected onMouseUp(e: MouseEvent) {
    this.mousePressed = false;

    if (this.rulerType === RulerType.Line && this.shiftPressed) {
      if (this.wayPoints.length >= 15) {
        return;
      }

      this.wayPoints.push(
        this.getStage().toLocalPosition(e.clientX, e.clientY)
      );
    } else {
      if (this.isMeasuring) {
        this.isMeasuring = false;
        this.clear();
      }
    }
  }

  protected onMouseDown(e: MouseEvent) {
    if (!this.getState().active) {
      return;
    }

    this.isMeasuring = true;
    this.mousePressed = true;

    if (!this.wayPoints.length || !this.shiftPressed) {
      this.startRuler({
        x: e.clientX,
        y: e.clientY,
      });
    }

    this.onMouseMove(e);
  }

  protected onMouseMove(e: MouseEvent) {
    if (
      !this.isMeasuring ||
      !this.getState().active ||
      this.wayPoints.length === 0
    ) {
      return;
    }

    let tooltip: HTMLElement;

    const stage = this.getStage();
    const localPosition = stage.toLocalPosition(e.clientX, e.clientY);
    const userid = this.getUserState().id;

    const payload: any = {
      type: this.rulerType,
      color: this.getCharacterState().color,
    };

    if (this.rulerType === RulerType.Line) {
      tooltip = this.getTooltip(0);

      tooltip.style.left = (e.clientX + 10).toString() + "px";
      tooltip.style.top = (e.clientY + 10).toString() + "px";

      const points: number[] = [];
      this.path = [];

      this.wayPoints.forEach((point: Konva.Vector2d) => {
        points.push(point.x);
        points.push(point.y);
        this.path.push(point);
      });

      points.push(localPosition.x);
      points.push(localPosition.y);

      this.path.push({
        x: localPosition.x,
        y: localPosition.y,
      });

      if (this.getBoard().getGrid()) {
        const converted = this.getBoard().getGrid().convertToCell(this.path);

        if (!ArrayUtil.equals(converted, this.converted)) {
          this.converted = converted;

          if (
            this.rulerType === RulerType.Line &&
            this.options.line.highlight
          ) {
            this.hightlightGrid(
              this.converted,
              userid.toString(10),
              payload.color
            );
          }
        }
      } else {
        this.converted = null;
      }

      payload.path = this.path;
      payload.highlight = this.options.line.highlight;

      this.getBoard().getToolLayer().drawArrows(0, points, payload.color);
    } else if (this.rulerType === RulerType.Cone) {
      const p0 = this.wayPoints[0];
      const p1 = localPosition;
      const angle: number = this.options.cone.angle;
      const units: number = this.options.cone.size;
      const rotation: number =
        (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI - angle / 2;
      const radius: number =
        this.getSceneState().scene.convertUnitToPixel(units);

      this.getBoard()
        .getToolLayer()
        .drawWedge(
          0,
          this.wayPoints[0],
          angle,
          radius,
          rotation,
          payload.color
        );

      payload.angle = angle;
      payload.radius = radius;
      payload.rotation = rotation;
      payload.position = p0;
    } else if (this.rulerType === RulerType.Circle) {
      const units: number = this.options.circle.size;
      const radius: number =
        this.getSceneState().scene.convertUnitToPixel(units);

      this.getBoard()
        .getToolLayer()
        .drawCircle(0, localPosition, radius, payload.color);

      payload.radius = radius;
      payload.position = localPosition;
    } else if (this.rulerType === RulerType.Rectangle) {
      const widthUnits: number = parseInt(
        (
          this.view.container.querySelector(
            "#rectangle-ruler-width"
          ) as HTMLInputElement
        ).value,
        10
      );
      const heightUnits: number = parseInt(
        (
          this.view.container.querySelector(
            "#rectangle-ruler-height"
          ) as HTMLInputElement
        ).value,
        10
      );
      const width: number =
        this.getSceneState().scene.convertUnitToPixel(widthUnits);
      const height: number =
        this.getSceneState().scene.convertUnitToPixel(heightUnits);

      this.getBoard()
        .getToolLayer()
        .drawRectangle(0, localPosition, width, height, payload.color);

      payload.position = localPosition;
      payload.width = width;
      payload.height = height;
    }

    this.metrics = this.computeMetrics();
    payload.metrics = this.metrics;

    this.dispatchRuler(payload);

    if (this.metrics !== "" && tooltip) {
      tooltip.innerText = this.metrics;
    } else {
      this.removeTooltip(0);
    }
  }

  protected dispatchRuler(payload) {
    if (!this.options.share) {
      return;
    }

    const send = () => {
      this.getClient().send("ruler", "share", {
        payload: payload,
      });

      this.lastSent = new Date();
      clearTimeout(this.sentTimeout);
    };

    const now: Date = new Date();
    clearTimeout(this.sentTimeout);

    if (!this.lastSent) {
      return send();
    }

    if (now.getTime() - this.lastSent.getTime() > RulerView.SendInterval) {
      send();
    } else {
      this.sentTimeout = setTimeout(() => {
        send();
      }, RulerView.SendInterval);
    }
  }

  public display(userid: number, name: string, payload: any) {
    const board: Board = this.getBoard();
    const tooltip = this.getTooltip(userid);

    const tooltipName: HTMLElement = document.createElement("strong");
    tooltipName.innerText = payload.metrics == "" ? name : payload.metrics;

    const tooltipMetrics: Text = document.createTextNode(name);

    tooltip.innerHTML = "";
    tooltip.appendChild(tooltipName);

    if (payload.metrics !== "") {
      tooltip.appendChild(tooltipMetrics);
    }

    if (payload.type === RulerType.Line) {
      const points: number[] = [];

      payload.path.forEach((entry: any) => {
        points.push(entry.x, entry.y);
      });

      board.getToolLayer().drawArrows(userid, points, payload.color);

      if (payload.highlight) {
        const converted = board.getGrid().convertToCell(payload.path);
        this.hightlightGrid(converted, userid.toString(10), payload.color);
      }

      const last: any = payload.path[payload.path.length - 1];
      const global: any = this.getStage().toGlobalPosition(last.x, last.y);

      tooltip.style.left = (global.x + 10).toString() + "px";
      tooltip.style.top = (global.y + 10).toString() + "px";
    } else if (payload.type === RulerType.Cone) {
      board
        .getToolLayer()
        .drawWedge(
          userid,
          payload.position,
          payload.angle,
          payload.radius,
          payload.rotation,
          payload.color
        );

      const global: any = this.getStage().toGlobalPosition(
        payload.position.x,
        payload.position.y
      );
      tooltip.style.left =
        (global.x + -($(tooltip).width() / 2)).toString() + "px";
      tooltip.style.top = (global.y + 15).toString() + "px";
    } else if (payload.type === RulerType.Circle) {
      board
        .getToolLayer()
        .drawCircle(userid, payload.position, payload.radius, payload.color);

      const global: any = this.getStage().toGlobalPosition(
        payload.position.x,
        payload.position.y
      );
      tooltip.style.left =
        (global.x + -($(tooltip).width() / 2)).toString() + "px";
      tooltip.style.top = (global.y + 15).toString() + "px";
    } else if (payload.type === RulerType.Rectangle) {
      board
        .getToolLayer()
        .drawRectangle(
          userid,
          payload.position,
          payload.width,
          payload.height,
          payload.color
        );

      const global: any = this.getStage().toGlobalPosition(
        payload.position.x,
        payload.position.y
      );
      tooltip.style.left =
        (global.x + -($(tooltip).width() / 2)).toString() + "px";
      tooltip.style.top = (global.y + 15).toString() + "px";
    }
  }

  protected hightlightGrid(
    points: Konva.Vector2d[],
    userid: string,
    color: string
  ) {
    if (!this.getSceneState().scene.data.grid.enabled) {
      return;
    }

    this.getBoard().getGrid().highlight(points, userid, color);
  }

  protected computeMetrics(): string {
    if (this.rulerType !== RulerType.Line) {
      return "";
    }

    const scene: Scene = this.getSceneState().scene;
    const metrics: SceneMetrics = scene.data.metrics;
    let distance: number;

    if (this.converted) {
      distance =
        (metrics.equalCount * (this.converted.length - 1)) / metrics.baseCount;
    } else {
      distance = 0;

      for (let i = 0; i < this.path.length - 1; i++) {
        distance += Math.sqrt(
          Math.pow(this.path[i].x - this.path[i + 1].x, 2) +
            Math.pow(this.path[i].y - this.path[i + 1].y, 2)
        );
      }

      distance = scene.convertPixelToUnit(distance);
    }

    return (
      (Math.round(distance * 100) / 100).toString() + " " + metrics.equalType
    );
  }

  public startRuler(position: Konva.Vector2d) {
    this.wayPoints = [];
    this.wayPoints.push(
      this.getStage().toLocalPosition(position.x, position.y)
    );
  }

  protected getBoard(): Board {
    return container.get<Board>(Services.Board);
  }

  protected getState(): RulerState {
    return container.get<RulerState>(States.Ruler);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }

  protected getCharacterState(): CharacterState {
    return container.get<CharacterState>(States.Character);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }
}

export enum RulerType {
  Line = "line",
  Cone = "cone",
  Circle = "circle",
  Rectangle = "rectangle",
}
