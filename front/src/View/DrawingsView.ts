import { View } from "./View";
import { injectable } from "inversify";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { DockableView, ViewOpenMode } from "./DockableView";
import { Template } from "./Template";
import { MenuView } from "./MenuView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import {
  DrawingItem,
  DrawingPoint,
  DrawingToolType,
} from "../../shared/DrawingsData";
import { Stage } from "../Engine/Stage";
import { Services } from "../DependencyInjection/Services";
import { DrawingTool } from "../Engine/Board/DrawingTool";
import { DrawingState } from "../State/DrawingState";
import { States } from "../DependencyInjection/State";
import { BoardLayer } from "../Engine/Board/BoardLayer";
import { SceneState } from "../State/SceneState";
import Konva from "konva";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { Drawing } from "../Engine/Drawing/Drawing";

@injectable()
export class DrawingsView extends View {
  protected toolType: DrawingToolType;
  protected taskBarItem: TaskBarItem;
  protected view: DockableView;
  protected map: HTMLElement;

  protected currentItem: DrawingItem;
  protected isEditing = false;
  protected isCreating = false;
  protected isContinious = false;

  public init() {
    super.init();

    this.taskBarItem = new TaskBarItem(
      this.__("Drawings"),
      "fas fa-paint-brush-alt",
      TaskBarCategory.Tool
    );

    this.view = new DockableView({
      id: "drawings",
      title: this.__("Drawings"),
      html: Template.render("drawings/view.html.njk"),
      taskBarItem: this.taskBarItem,
      mode: ViewOpenMode.DockRight,
      icon: "fas fa-paint-brush-alt",
      defaultConfiguration: {
        index: 10,
        hidden: true,
        minimized: false,
        mode: ViewOpenMode.DockLeft,
      },
    });

    this.getUi().register(this.view);
    this.getTaskBarView().add(this.taskBarItem);

    this.initView();
  }

  protected initView() {
    this.map = document.getElementById("map");

    this.map.addEventListener("mousemove", (e) => {
      this.onMouseMove(e);
    });

    this.map.addEventListener("mousedown", (e) => {
      this.onMouseDown(e);
    });

    this.map.addEventListener("dblclick", (e) => {
      this.onDoubleClick(e);
    });

    window.addEventListener("mouseup", (e) => {
      this.onMouseUp(e);
    });

    $(this.view.container.querySelector(".tools")).find("a[title]").tooltip({
      trigger: "hover",
      placement: "top",
      boundary: "window",
    });

    this.view.container
      .querySelectorAll(".tool-btn")
      .forEach((btn: HTMLAnchorElement) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();

          let selected = btn.dataset.tool as DrawingToolType;

          if (selected === this.toolType && this.isCreating) {
            selected = null;
          }

          this.currentItem = null;
          this.toolType = selected;

          this.onToolSelect();
        });
      });

    this.view.container
      .querySelector(".cursor")
      .addEventListener("click", () => {
        this.disable();
      });

    this.view.on(DockableView.ON_CLOSE, () => {
      this.disable();
    });

    EventDispatcher.on(Events.DRAWING_SELECT, (e) => {
      this.currentItem = e.item as DrawingItem;
      this.toolType = this.currentItem.type;
      this.isEditing = true;

      this.onDrawingSelect();
    });

    EventDispatcher.on(Events.BOARD_UNSELECT, () => {
      this.currentItem = null;
      this.isEditing = false;

      if (!this.isCreating && !this.isEditing) {
        this.removeOptions();
      }
    });
  }

  public disable() {
    this.toolType = null;
    this.currentItem = null;
    this.isCreating = false;
    this.isEditing = false;

    this.onToolSelect();
  }

  protected onMouseDown(e: MouseEvent) {
    if (!this.toolType || this.isEditing || !this.isCreating) {
      return;
    }

    const position: DrawingPoint = this.getStage().toLocalPosition(
      e.clientX,
      e.clientY
    );
    const tool: Drawing = this.getDrawingTool().getTool(this.toolType);

    if (tool.doubleClickToEnd) {
      if (this.isContinious) {
        this.onMouseUp(e);
        return;
      }

      this.isContinious = true;
    }

    const item: DrawingItem = tool.init(position);
    this.getDrawingTool().addItem(item);
    this.currentItem = item;
  }

  protected onMouseMove(e: MouseEvent) {
    if (!this.toolType || this.isEditing || !this.isCreating) {
      return;
    }

    if (!this.currentItem) {
      return;
    }

    const position: DrawingPoint = this.getStage().toLocalPosition(
      e.clientX,
      e.clientY
    );

    this.getDrawingTool()
      .getTool(this.toolType)
      .move(this.currentItem, position);
    this.getDrawingTool().getTool(this.toolType).draw(this.currentItem);
  }

  protected onMouseUp(e: MouseEvent) {
    if (!this.toolType || this.isEditing || !this.isCreating) {
      return;
    }

    if (!this.currentItem) {
      return;
    }

    const position: DrawingPoint = this.getStage().toLocalPosition(
      e.clientX,
      e.clientY
    );
    const isEnded: boolean = this.getDrawingTool()
      .getTool(this.toolType)
      .close(this.currentItem, position);
    this.getDrawingTool().getTool(this.toolType).draw(this.currentItem);

    if (isEnded) {
      this.onDrawingEnded(this.currentItem);
    }
  }

  protected onDoubleClick(e: MouseEvent) {
    if (!this.toolType || this.isEditing) {
      return;
    }

    if (!this.currentItem) {
      return;
    }

    const tool: Drawing = this.getDrawingTool().getTool(this.toolType);

    if (!tool.doubleClickToEnd) {
      return;
    }

    const position: DrawingPoint = this.getStage().toLocalPosition(
      e.clientX,
      e.clientY
    );

    tool.doubleClick(this.currentItem, position);
    tool.draw(this.currentItem);

    this.onDrawingEnded(this.currentItem);
  }

  protected onDrawingEnded(item: DrawingItem) {
    this.isContinious = false;
    this.publish(item);
    this.currentItem = null;

    if (this.getDrawingTool().getTool(item.type).shouldSelectAfterDraw()) {
      if (item.node) {
        this.disable();
        (item.node as Konva.Shape).fire("mousedown", {
          evt: {
            button: 1,
          },
        });
      }
    }
  }

  protected publish(item: DrawingItem) {
    const layer: BoardLayer = this.getDrawingTool().getLayer();
    const sceneId: number = this.getSceneState().id;

    if (!layer || !sceneId) {
      return;
    }

    const node: Konva.Shape = item.node;
    item.node = null;

    this.getClient().send("drawing", "addItem", {
      layerKey: layer.item.key,
      sceneId: sceneId,
      item: item,
    });

    item.node = node;
  }

  protected generateRandomString(length: number) {
    return Math.random().toString(36).replace("0.", "").slice(-length);
  }

  protected onToolSelect() {
    this.view.container
      .querySelectorAll(".tool-btn")
      .forEach((btn: HTMLAnchorElement) => {
        btn.classList.remove("active");
      });

    if (!this.toolType) {
      this.getDrawingState().setIsDrawing(false);
      this.removeOptions();
      return;
    }

    if (this.toolType === DrawingToolType.Erase) {
      this.isEditing = false;
      this.isCreating = false;
      this.currentItem = null;
      this.getDrawingState().setIsDrawing(false);
      this.askClearDrawings();
      return;
    }

    this.getDrawingTool().refreshLayer();

    if (this.getDrawingTool().getLayer() == null) {
      this.displayNoLayerAvailable();
      return;
    }

    const btn: HTMLAnchorElement = this.view.container.querySelector(
      'a[data-tool="' + this.toolType + '"]'
    );

    btn.classList.add("active");

    this.displayOptions();

    this.getDrawingState().setIsDrawing(true);
    this.isCreating = true;
    this.isEditing = false;
  }

  protected askClearDrawings() {
    if (confirm("Are you sure you want to clear all your drawings ?")) {
      this.getClient().send("drawing", "clearMine", {
        sceneId: this.getSceneState().id,
      });
    }
  }

  protected onDrawingSelect() {
    this.view.container
      .querySelectorAll(".tool-btn")
      .forEach((btn: HTMLAnchorElement) => {
        btn.classList.remove("active");
      });

    this.getDrawingState().setIsDrawing(false);

    if (!this.toolType) {
      return;
    }

    this.isCreating = false;
    this.isEditing = true;
    this.displayOptions();
  }

  protected removeOptions() {
    const container: HTMLElement = this.view.container.querySelector(
      "#drawing-options-container"
    );
    container.innerHTML = "";
  }

  protected displayOptions() {
    if (!this.toolType) {
      return;
    }

    const item: DrawingItem = this.currentItem;

    const defaults: any = this.getDrawingTool()
      .getTool(this.toolType)
      .getDefaults();
    let options: any;

    if (item) {
      options = { ...defaults, ...item };
    } else {
      options = defaults;
    }

    options.textures = this.getDrawingTool().getTextureNames();

    const html: string = Template.render(
      "drawings/" + this.toolType + ".html.njk",
      options
    );

    const container: HTMLElement = this.view.container.querySelector(
      "#drawing-options-container"
    );
    container.innerHTML = html;

    $(container).find(".color-picker").colorpicker({
      horizontal: true,
      format: "rgb",
      useAlpha: true,
    });

    container
      .querySelectorAll(".attribute")
      .forEach((attribute: HTMLInputElement) => {
        const update = () => {
          const spec: string = attribute.dataset.bind;
          let value: any = attribute.value;

          switch (attribute.dataset.type) {
            case "float":
              value = parseFloat(value);
              break;
            case "color":
              value = value.toString();
              break;
            case "boolean":
              value = attribute.checked;
              break;
          }

          this.getDrawingTool().getTool(this.toolType).setDefault(spec, value);

          if (!item) {
            return;
          }

          if (item[spec] == value) {
            return;
          }

          item[spec] = value;
          this.getDrawingTool().draw(item);
          this.getDrawingTool().updateTransformer();

          this.getClient().send("drawing", "updateAttribute", {
            layerKey: this.getDrawingTool().getLayer().item.key,
            sceneId: this.getSceneState().id,
            itemKey: item.key,
            attribute: spec,
            value: value,
          });
        };

        if (attribute.classList.contains("color-picker")) {
          $(attribute).on(
            "colorpickerUpdate colorpickerCreate",
            (event: any) => {
              $(event.currentTarget).css(
                "background-color",
                event.color.toString()
              );
              update();
            }
          );
        } else {
          if (attribute.dataset.delay) {
            let updateTimeout: any = null;

            attribute.addEventListener("keyup", () => {
              clearTimeout(updateTimeout);

              updateTimeout = setTimeout(() => {
                update();
              }, 250);
            });
          } else {
            attribute.addEventListener("keyup", () => {
              update();
            });
          }

          attribute.addEventListener("change", () => {
            update();
          });
        }
      });
  }

  protected displayNoLayerAvailable() {
    const html: string = Template.render("drawings/no-layer.html.njk");

    const container: HTMLElement = this.view.container.querySelector(
      "#drawing-options-container"
    );
    container.innerHTML = html;
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }

  protected getDrawingTool(): DrawingTool {
    return container.get<DrawingTool>(Services.DrawingTool);
  }

  protected getDrawingState(): DrawingState {
    return container.get<DrawingState>(States.Drawing);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }
}
