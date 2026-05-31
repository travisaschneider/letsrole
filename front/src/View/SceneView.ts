import { View } from "./View";
import { injectable } from "inversify";
import { Stage } from "../Engine/Stage";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { GmView } from "./GmView";
import { Views } from "../DependencyInjection/Views";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { SceneState } from "../State/SceneState";
import { States } from "../DependencyInjection/State";
import { Board } from "../Engine/Board";
import { CancelState } from "../State/CancelState";
import { LayerItem } from "../../shared/Scene/SceneData";
import { SceneImage } from "../Engine/SceneImage";
import { ZoomView } from "./ZoomView";
import { PopinManager } from "./Popin/PopinManager";
import { ToolState, ToolType } from "../State/ToolState";
import { Media } from "../../shared/Media";
import Konva from "konva";
import { Dimension } from "../Math/Dimension";
import { JournalIcon } from "../../shared/Journal";
import Vector2d = Konva.Vector2d;

@injectable()
export class SceneView extends View {
  public init() {
    const map: HTMLElement = document.getElementById("map");

    map.addEventListener("dragenter", (e: DragEvent) => {
      e.preventDefault();
    });

    map.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
    });

    map.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();

      if (e.dataTransfer.items || e.dataTransfer.files) {
        const isUpload: boolean = this.uploadFiles(e);

        if (isUpload) {
          return;
        }
      }

      const type: string = e.dataTransfer.getData("type");
      const id: string = e.dataTransfer.getData("id");
      const partnerId: string = e.dataTransfer.getData("partnerId");
      const unlockedId: string = e.dataTransfer.getData("unlockedId");

      switch (type) {
        case "image":
          if (unlockedId) {
            this.dropImage(
              unlockedId,
              e.clientX,
              e.clientY,
              ImageDropMode.Unlocked
            );
          } else if (partnerId) {
            this.dropImage(
              partnerId,
              e.clientX,
              e.clientY,
              ImageDropMode.Partner
            );
          } else {
            this.dropImage(id, e.clientX, e.clientY, ImageDropMode.Normal);
          }

          break;

        case "token":
          this.dropToken(id, e.clientX, e.clientY);
          break;

        case "craft":
          this.dropCraft(id, e.clientX, e.clientY);
          break;

        case "page": {
          const keyid: string = e.dataTransfer.getData("keyid");
          const icon: JournalIcon = e.dataTransfer.getData(
            "icon"
          ) as JournalIcon;

          this.dropJournal(keyid, e.clientX, e.clientY, icon);
          break;
        }

        case "book-craft":
          this.dropBookCraft(id, e.clientX, e.clientY);
          break;
      }
    });

    this.initShortcuts();
  }

  protected uploadFiles(event: DragEvent) {
    const files: File[] = [];

    if (event.dataTransfer.items) {
      [...event.dataTransfer.items].forEach((item, i) => {
        if (item.kind === "file") {
          const file = item.getAsFile();
          files.push(file);
        }
      });
    } else {
      [...event.dataTransfer.files].forEach((file, i) => {
        files.push(file);
      });
    }

    if (!files.length) {
      return false;
    }

    this.getToolState().enable(ToolType.Upload);

    const formData: FormData = new FormData();

    files.forEach((file: File) => {
      formData.append("media[]", file);
    });

    const url = window["configuration"]["cdnUrl"] + "/upload";

    $.ajax({
      url: url,
      type: "POST",
      data: formData,
      cache: false,
      contentType: false,
      processData: false,
      xhrFields: {
        withCredentials: true,
      },
      crossDomain: true,
      success: (data: any) => {
        this.getToolState().disable();

        const medias: Media[] = JSON.parse(data);

        for (const media of medias) {
          this.dropImage(media.id, event.clientX, event.clientY);
        }
      },
      error: (jqXHR, textStatus, errorThrown) => {
        this.getToolState().disable();
      },
    });

    return true;
  }

  protected initShortcuts() {
    const board: Board = this.getBoard();

    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement.tagName !== "BODY") {
          return; // user is focused in another input or no selected item
        }

        if (board.isMultipleSelect()) {
          const sources: Set<SceneImage> = board.getAllSelectedItems();

          EventDispatcher.emit(Events.SCENE_ITEM_MULTI_DELETE, {
            items: sources,
          });

          this.getBoard().clearGroupSelect();
        } else if (board.selectedItem) {
          const source: SceneImage = board.selectedItem;

          EventDispatcher.emit(Events.SCENE_ITEM_DELETE, {
            item: source,
          });

          this.getCancelState().add(() => {
            const state: SceneState = this.getSceneState();
            const scale: number = source.getImage().scaleX();
            const rotation: number = source.getImage().rotation();
            const x: number = source.getImage().x();
            const y: number = source.getImage().y();

            this.getClient().get(
              "scene",
              "addImage",
              {
                id: source.item.id,
                x: source.x(),
                y: source.y(),
                scene: state.id,
                layer: source.layer.item.key,
              },
              (response) => {
                const layer = board.getLayer(response.layerKey);

                if (!layer) {
                  return;
                }

                const item: LayerItem = layer.item.items[response.itemKey];

                if (!item) {
                  return;
                }

                const node: SceneImage = item.node;

                if (!node) {
                  return;
                }

                const applyTransformBack = () => {
                  node.getImage().scale({
                    x: scale,
                    y: scale,
                  });

                  node.getImage().rotation(rotation);
                  node.getImage().x(x);
                  node.getImage().y(y);

                  EventDispatcher.emit(Events.SCENE_ITEM_TRANSFORM, {
                    item: node,
                    scale: scale,
                    rotation: rotation,
                    x: x,
                    y: y,
                  });
                };

                if (node.isInit) {
                  applyTransformBack();
                } else {
                  node.on("initialized", applyTransformBack);
                }
              }
            );
          });
        }

        if (board.selectedDrawingItem) {
          EventDispatcher.emit(Events.DRAWING_DELETE, {
            item: board.selectedDrawingItem,
          });
        }

        return;
      }

      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        if (document.activeElement.tagName !== "BODY") {
          return;
        }

        this.getCancelState().cancel();

        return;
      }

      if (e.key === "p") {
        if (document.activeElement.tagName !== "BODY") {
          return; // user is focused in another input or no selected item
        }

        this.getZoomView().startPing();
        return;
      }

      if (e.key === "m") {
        if (document.activeElement.tagName !== "BODY") {
          return; // user is focused in another input or no selected item
        }

        this.getZoomView().zoomToMap(true);
        return;
      }
    });
  }

  public dropImage(
    id: string,
    x: number,
    y: number,
    mode: ImageDropMode = ImageDropMode.Normal
  ) {
    const position = this.getStage().toLocalPosition(x, y);
    const state: SceneState = this.getSceneState();

    const data: any = {
      x: Math.round(position.x),
      y: Math.round(position.y),
      scene: state.id,
      layer: state.layerKey,
    };

    switch (mode) {
      case ImageDropMode.Normal:
        data.id = id;
        break;

      case ImageDropMode.Partner:
        data.partnerId = parseInt(id, 10);
        break;

      case ImageDropMode.Unlocked:
        data.unlockedId = parseInt(id, 10);
        break;
    }

    this.getClient().get("scene", "addImage", data, (response) => {
      this.getCancelState().add(() => {
        const board: Board = this.getBoard();

        const layer = board.getLayer(response.layerKey);

        if (!layer) {
          return;
        }

        const item: LayerItem = layer.item.items[response.itemKey];

        if (!item) {
          return;
        }

        EventDispatcher.emit(Events.SCENE_ITEM_DELETE, {
          item: item.node,
        });
      });
    });

    EventDispatcher.emit(Events.SCENE_ITEM_DROP, {
      id: id,
      mode: mode,
    });
  }

  public dropJournal(keyid: string, x: number, y: number, icon?: JournalIcon) {
    const stage: Stage = this.getStage();

    const position: Vector2d = stage.toLocalPosition(x, y);
    position.x -= 50;
    position.y -= 50;

    const dimension: Dimension = stage.snapDimension({
      width: 50,
      height: 50,
    });

    const state: SceneState = this.getSceneState();

    if (!icon) {
      icon = JournalIcon.Page;
    }

    this.getClient().send("scene", "addJournal", {
      keyid: keyid,
      x: Math.round(position.x),
      y: Math.round(position.y),
      width: dimension.width,
      height: dimension.height,
      scene: state.id,
      icon: icon,
    });

    EventDispatcher.emit(Events.SCENE_ITEM_DROP, {
      id: keyid,
      mode: ImageDropMode.Normal,
    });
  }

  public dropToken(id: any, x: number, y: number) {
    const stage: Stage = this.getStage();

    let position = stage.toLocalPosition(x, y);
    position.x -= 75;
    position.y -= 75;

    position = stage.snapPosition(position);

    const dimension = stage.snapDimension({
      width: 150,
      height: 150,
    });

    const state: SceneState = this.getSceneState();

    this.getClient().send("scene", "addToken", {
      id: parseInt(id, 10),
      x: Math.round(position.x),
      y: Math.round(position.y),
      width: dimension.width,
      height: dimension.height,
      scene: state.id,
    });

    EventDispatcher.emit(Events.SCENE_ITEM_DROP, {
      id: id,
      mode: ImageDropMode.Normal,
    });
  }

  public dropCraft(id: any, x: number, y: number) {
    const stage: Stage = this.getStage();

    let position = stage.toLocalPosition(x, y);
    position.x -= 75;
    position.y -= 75;

    position = stage.snapPosition(position);

    const dimension = stage.snapDimension({
      width: 150,
      height: 150,
    });

    const state: SceneState = this.getSceneState();

    console.log(id, x, y);

    this.getClient().send("scene", "addCraft", {
      id: parseInt(id, 10),
      x: Math.round(position.x),
      y: Math.round(position.y),
      width: dimension.width,
      height: dimension.height,
      scene: state.id,
    });
  }

  public dropBookCraft(id: any, x: number, y: number) {
    const stage: Stage = this.getStage();

    let position = stage.toLocalPosition(x, y);
    position.x -= 75;
    position.y -= 75;

    position = stage.snapPosition(position);

    const dimension = stage.snapDimension({
      width: 150,
      height: 150,
    });

    const state: SceneState = this.getSceneState();

    this.getClient().get(
      "book",
      "cloneCraft",
      {
        id: parseInt(id, 10),
      },
      (response) => {
        this.getClient().send("scene", "addCraft", {
          id: response.id,
          x: Math.round(position.x),
          y: Math.round(position.y),
          width: dimension.width,
          height: dimension.height,
          scene: state.id,
        });

        const popin = this.getPopinManager().get("book-craft-" + id);

        if (popin) {
          popin.close();
        }
      }
    );
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }

  protected getGmView(): GmView {
    return container.get<GmView>(Views.Gm);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }

  protected getBoard(): Board {
    return container.get<Board>(Services.Board);
  }

  protected getCancelState(): CancelState {
    return container.get<CancelState>(States.Cancel);
  }

  protected getZoomView(): ZoomView {
    return container.get<ZoomView>(Views.Zoom);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getToolState(): ToolState {
    return container.get<ToolState>(States.Tool);
  }
}

export enum ImageDropMode {
  Normal = "normal",
  Partner = "partner",
  Unlocked = "unlocked",
}
