import { View } from "./View";
import { injectable } from "inversify";
import { Board } from "../Engine/Board";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { WindowState } from "../State/WindowState";
import { States } from "../DependencyInjection/State";
import Konva from "konva";
import { SceneState } from "../State/SceneState";
import { SceneData } from "../../shared/Scene/SceneData";
import { Stage } from "../Engine/Stage";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { CharacterState } from "../State/CharacterState";

@injectable()
export class ZoomView extends View {
  protected isPinging = false;

  public init() {
    super.init();

    const mapBtn: HTMLElement = document.getElementById("zoom-map-btn");
    const inBtn: HTMLElement = document.getElementById("zoom-in-btn");
    const outBtn: HTMLElement = document.getElementById("zoom-out-btn");
    const pingBtn: HTMLElement = document.getElementById("ping-btn");

    pingBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this.isPinging = !this.isPinging;
      this.updatePing();
    });

    mapBtn.addEventListener("click", (e) => {
      e.preventDefault();

      this.zoomToMap();
    });

    inBtn.addEventListener("click", (e) => {
      e.preventDefault();

      this.zoom(1.2);
    });

    outBtn.addEventListener("click", (e) => {
      e.preventDefault();

      this.zoom(0.8);
    });

    $([pingBtn, mapBtn, inBtn, outBtn]).tooltip({
      trigger: "hover",
    });

    EventDispatcher.on(Events.SCENE_AFTER_LOAD, () => {
      this.zoomToMap(false);
    });

    this.initPing();
  }

  public startPing() {
    this.isPinging = true;
    this.updatePing();
  }

  protected initPing() {
    document.getElementById("map").addEventListener("click", (e) => {
      if (!this.isPinging) {
        return;
      }

      this.ping(e);
    });
  }

  protected updatePing() {
    const map: HTMLElement = document.getElementById("map");
    const pingBtn: HTMLElement = document.getElementById("ping-btn");

    if (this.isPinging) {
      map.classList.add("pinging");
      pingBtn.classList.add("active");
    } else {
      map.classList.remove("pinging");
      pingBtn.classList.remove("active");
    }
  }

  public ping(e: MouseEvent) {
    const position = this.getStage().toLocalPosition(e.clientX, e.clientY);

    const color: string = this.getCharacterState().color;

    this.isPinging = false;
    this.updatePing();

    EventDispatcher.emit(Events.PING, {
      position: position,
      color: color,
    });
  }

  public zoom(ratio) {
    const board: Board = this.getBoard();
    const windowMap = this.getWindowState().getMap();

    const scale = board.getComputedScale();

    const pointerPosition = {
      x: windowMap.w / 2,
      y: windowMap.h / 2,
    };

    const targetScale = {
      x: scale.x * ratio,
      y: scale.y * ratio,
    };

    if (targetScale.x > Board.MAX_SCALE) {
      targetScale.x = Board.MAX_SCALE;
      targetScale.y = Board.MAX_SCALE;
    } else if (targetScale.x < Board.MIN_SCALE) {
      targetScale.x = Board.MIN_SCALE;
      targetScale.y = Board.MIN_SCALE;
    }

    const mousePointTo = {
      x: pointerPosition.x / scale.x - board.node.x() / scale.x,
      y: pointerPosition.y / scale.y - board.node.y() / scale.y,
    };

    const targetPosition = {
      x: -(mousePointTo.x - pointerPosition.x / targetScale.x) * targetScale.x,
      y: -(mousePointTo.y - pointerPosition.y / targetScale.y) * targetScale.y,
    };

    this.animate(targetScale, targetPosition, 10);
  }

  public zoomToMap(animate = true) {
    const scene: SceneData = this.getSceneState().scene.data;

    const boardSize = {
      width: scene.width,
      height: scene.height,
    };

    const windowSize = this.getWindowState().getMap();

    const scaleX = windowSize.w / boardSize.width;
    const scaleY = windowSize.h / boardSize.height;

    let scale = Math.min(scaleY, scaleX);
    scale *= 0.95;

    const x: number = (windowSize.w - boardSize.width * scale) / 2;
    const y: number = (windowSize.h - boardSize.height * scale) / 2;

    const targetScale = {
      x: scale,
      y: scale,
    };

    const targetPosition = {
      x: x,
      y: y,
    };

    if (animate) {
      this.animate(targetScale, targetPosition, 15);
    } else {
      const board: Board = this.getBoard();
      board.setComputedScale(targetScale);
      board.setComputedPosition(targetPosition);
      board.applyComputed();
    }
  }

  public animate(
    scale: Konva.Vector2d,
    position: Konva.Vector2d,
    frames: number
  ) {
    const board: Board = this.getBoard();
    let frame = 0;

    const baseScale = board.getComputedScale();
    const basePosition = board.getComputedPosition();

    const run = () => {
      const animatedScale = {
        x: (frame / frames) * (scale.x - baseScale.x) + baseScale.x,
        y: (frame / frames) * (scale.y - baseScale.y) + baseScale.y,
      };

      const animatedPosition = {
        x: (frame / frames) * (position.x - basePosition.x) + basePosition.x,
        y: (frame / frames) * (position.y - basePosition.y) + basePosition.y,
      };

      board.setComputedScale(animatedScale);
      board.setComputedPosition(animatedPosition);

      board.applyComputed();
      frame++;

      if (frame <= frames) {
        requestAnimationFrame(run);
      }
    };

    requestAnimationFrame(run);
  }

  protected getBoard(): Board {
    return container.get<Board>(Services.Board);
  }

  protected getWindowState(): WindowState {
    return container.get<WindowState>(States.Window);
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
}
