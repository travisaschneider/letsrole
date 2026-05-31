import { View } from "./View";
import { injectable } from "inversify";
import {
  SceneData,
  SceneFog,
  SceneLayer,
  SceneMetrics,
  SceneMetricsBase,
  SceneMetricsType,
} from "../../shared/Scene/SceneData";
import * as ColorPicker from "bootstrap-colorpicker";
import { PopinManager } from "./Popin/PopinManager";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { SceneRepository } from "../Repository/SceneRepository";
import { Repository } from "../DependencyInjection/Repository";
import { Popin } from "./Popin/Popin";
import { SceneState } from "../State/SceneState";
import { States } from "../DependencyInjection/State";
import { Scene } from "../Entity/Scene";
import { Board } from "../Engine/Board";
import { BoardLayer } from "../Engine/Board/BoardLayer";
import { UserState } from "../State/UserState";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events, SceneAdaptEvent } from "../Event/Events";
import { Clipboard } from "../Engine/Clipboard";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { DockableView, ViewOpenMode } from "./DockableView";
import { MenuView } from "./MenuView";
import { Views } from "../DependencyInjection/Views";
import { Stage } from "../Engine/Stage";
import { FogState } from "../State/FogState";
import * as PolyBool from "polybooljs";
import { Template } from "./Template";
import { CancelState } from "../State/CancelState";
import { DrawingTool } from "../Engine/Board/DrawingTool";
import { Cdn } from "./Cdn";
import { MediaView } from "./MediaView";
import { SceneBrowserView } from "./Scene/SceneBrowser";
import { SceneImage } from "../Engine/SceneImage";

enum FogTool {
  Rectangle = "rectangle",
  Polygon = "polygon",
}

enum FogMode {
  Reveal = "reveal",
  Hide = "hide",
}

@injectable()
export class GmView extends View {
  public static readonly LayerThumbRefreshRate = 12000;
  public static readonly SceneThumbnailRefreshRate = 30000;

  protected taskBarItem: TaskBarItem;
  protected view: DockableView;
  protected fogView: DockableView;

  protected fogTool: FogTool = null;
  protected fogMode: FogMode = FogMode.Reveal;

  protected metricsNames: any;

  public init() {
    this.metricsNames = {
      [SceneMetricsType.Foot]: this.__("Foot"),
      [SceneMetricsType.Meter]: this.__("Meter"),
      [SceneMetricsType.Mile]: this.__("Mile"),
      [SceneMetricsType.Kilometer]: this.__("Kilometer"),
      [SceneMetricsType.Centimeter]: this.__("Centimeter"),
      [SceneMetricsType.Millimeter]: this.__("Millimeter"),
      [SceneMetricsType.Inch]: this.__("Inch"),
      [SceneMetricsType.Yard]: this.__("Yard"),
      [SceneMetricsType.League]: this.__("League"),
      [SceneMetricsType.NauticalMile]: this.__("Nautical Mile"),
      [SceneMetricsType.Parsec]: this.__("Parsec"),
      [SceneMetricsType.LightYear]: this.__("Light Year"),
      [SceneMetricsType.AstronomicalUnit]: this.__("Astronomical Unit"),
      [SceneMetricsType.Node]: this.__("Node"),
      [SceneMetricsType.Movement]: this.__("Movement"),
    };

    EventDispatcher.on(Events.USER_ME_LOADED, (e) => {
      if (this.getUserState().isGm()) {
        this.initialize();
      }
    });
  }

  protected initialize() {
    this.taskBarItem = new TaskBarItem(
      this.__("Scene"),
      "fas fa-archway",
      TaskBarCategory.Main
    );

    this.view = new DockableView({
      id: "scene",
      title: this.__("Scene"),
      html: Template.render("gm/scene/view.html.njk"),
      mode: ViewOpenMode.DockRight,
      fixed: false,
      icon: "fas fa-mountains",
      header: Template.render("gm/scene/view-header.html.njk"),
      taskBarItem: this.taskBarItem,
      defaultConfiguration: {
        index: 0,
        hidden: false,
        minimized: false,
        mode: ViewOpenMode.DockRight,
      },
    });

    this.fogView = new DockableView({
      id: "fog",
      title: this.__("Fog of War"),
      html: Template.render("gm/fog-of-war.html.njk"),
      mode: ViewOpenMode.DockRight,
      fixed: false,
      icon: "fas fa-fog",
      defaultConfiguration: {
        index: 1,
        hidden: false,
        minimized: false,
        mode: ViewOpenMode.DockRight,
      },
    });

    this.getTaskBarView().add(this.taskBarItem);

    this.getUi().register(this.view);
    this.getUi().register(this.fogView);

    $["colorpicker"] = ColorPicker;

    const elt: HTMLElement = this.view.container;

    elt.querySelector("#create-layer-btn").addEventListener("click", (e) => {
      e.preventDefault();

      this.getClient().send("scene", "createLayer", {
        scene: this.getSceneState().id,
      });
    });

    elt.querySelector("#media-manager-btn").addEventListener("click", (e) => {
      e.preventDefault();

      this.getMediaView().openMediaManager();
    });

    elt.querySelector("#create-scene-btn").addEventListener("click", (e) => {
      e.preventDefault();

      this.createScene();
    });

    this.view.header
      .querySelector("#scene-explorer-btn")
      .addEventListener("click", (e) => {
        e.preventDefault();

        this.openSceneExplorer();
      });

    this.fogView.container
      .querySelector("#fog-rect")
      .addEventListener("click", (e) => {
        e.preventDefault();

        if (
          this.fogTool === FogTool.Rectangle &&
          this.fogMode === FogMode.Reveal
        ) {
          this.disableFogTool();
        } else {
          this.fogTool = FogTool.Rectangle;
          this.fogMode = FogMode.Reveal;

          this.enableRectangleFogTool();
        }
      });

    this.fogView.container
      .querySelector("#fog-poly")
      .addEventListener("click", (e) => {
        e.preventDefault();

        if (
          this.fogTool === FogTool.Polygon &&
          this.fogMode === FogMode.Reveal
        ) {
          this.disableFogTool();
        } else {
          this.fogTool = FogTool.Polygon;
          this.fogMode = FogMode.Reveal;

          this.enablePolygonFogTool();
        }
      });

    this.fogView.container
      .querySelector("#fog-reveal-all")
      .addEventListener("click", (e) => {
        e.preventDefault();

        if (confirm(this.__("Reveal the whole map?"))) {
          this.revealAll();
        }
      });

    this.fogView.container
      .querySelector("#fog-hide-all")
      .addEventListener("click", (e) => {
        e.preventDefault();

        if (confirm(this.__("Hide the whole map?"))) {
          this.hideAll();
        }
      });

    this.fogView.container
      .querySelector("#fog-hide-rect")
      .addEventListener("click", (e) => {
        e.preventDefault();

        if (
          this.fogTool === FogTool.Rectangle &&
          this.fogMode === FogMode.Hide
        ) {
          this.disableFogTool();
        } else {
          this.fogTool = FogTool.Rectangle;
          this.fogMode = FogMode.Hide;

          this.enableRectangleFogTool();
        }
      });

    this.fogView.container
      .querySelector("#fog-hide-poly")
      .addEventListener("click", (e) => {
        e.preventDefault();

        if (this.fogTool === FogTool.Polygon && this.fogMode === FogMode.Hide) {
          this.disableFogTool();
        } else {
          this.fogTool = FogTool.Polygon;
          this.fogMode = FogMode.Hide;

          this.enablePolygonFogTool();
        }
      });

    $(this.fogView.container).find("a[title]").tooltip({
      trigger: "hover",
      placement: "top",
      boundary: "window",
    });

    this.initShortcuts();

    window.addEventListener("keyup", (e: KeyboardEvent) => {
      if (this.fogTool == null) {
        return;
      }

      if (e.key === "Escape") {
        this.disableFogTool();
      }
    });

    EventDispatcher.on(Events.SCENE_AFTER_LOAD, (e) => {
      this.updateSceneBlock();
    });

    setInterval(() => {
      this.updateLayersThumbnails();
    }, GmView.LayerThumbRefreshRate);

    this.updateLayersThumbnails();
  }

  public updateSceneBlock() {
    const scene: any = this.getSceneRepository().get(this.getSceneState().id);

    const infosHtml: string = Template.render("gm/scene/info-block.html.njk", {
      scene: scene,
      same: this.getSceneState().same,
    });

    const infosBlock = document.getElementById("scene-infos");

    infosBlock.innerHTML = infosHtml;

    infosBlock
      .querySelector("#edit-scene-btn")
      .addEventListener("click", (e) => {
        e.preventDefault();

        const scene: any = this.getSceneRepository().get(
          this.getSceneState().id
        );

        const popin: Popin = this.getPopinManager().create({
          id: "scene-param-" + this.getSceneState().id,
          html: Template.render("gm/scene/param.html.njk", {
            scene: scene,
            metrics: this.metricsNames,
          }),
          title: this.__("Scene parameters"),
          canMinimize: false,
          canDock: false,
          canClose: true,
        });

        popin.on("init", () => this.initScenePopin(popin));
        popin.open();
      });

    const teleportBtn: HTMLAnchorElement = infosBlock.querySelector(
      "#teleport-scene-btn"
    );

    if (teleportBtn) {
      teleportBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        this.getClient().send("scene", "load", {
          scene: this.getSceneState().id,
          toAll: true,
        });
      });
    }

    if (scene.data.fog && scene.data.fog.enabled) {
      this.fogView.show();
    } else {
      this.fogView.hide();
    }
  }

  public disableFogTool() {
    document.getElementById("map").style.cursor = null;

    this.fogTool = null;
    this.fogMode = null;

    this.getFogState().setDrawing(false);
    this.getStage().clearFogMask();

    $("#map").off("mousedown").off("click").off("mousemove");
    $(document).off("mouseup").off("dblclick");
  }

  protected revealAll() {
    const scene: SceneData = this.getSceneState().scene.data;
    const fog: SceneFog = scene.fog;

    fog.points = [
      [
        [0, 0],
        [scene.width, 0],
        [scene.width, scene.height],
        [0, scene.height],
      ],
    ];

    this.getClient().send("scene", "updateFog", {
      scene: this.getSceneState().id,
      points: fog.points,
    });
  }

  protected hideAll() {
    const scene: SceneData = this.getSceneState().scene.data;
    const fog: SceneFog = scene.fog;

    fog.points = [];

    this.getClient().send("scene", "updateFog", {
      scene: this.getSceneState().id,
      points: fog.points,
    });
  }

  protected enablePolygonFogTool() {
    this.fogTool = FogTool.Polygon;

    const map = document.getElementById("map");
    const $map = $(map);
    const stage: Stage = this.getStage();

    map.style.cursor = "crosshair";

    this.getFogState().setDrawing(true);

    let polygon: number[][] = [];

    const addWayPoint = (e: MouseEvent) => {
      const position = stage.toLocalPosition(e.clientX, e.clientY);

      polygon.push([position.x, position.y]);

      if (polygon.length > 1) {
        return;
      }

      $(map)
        .off("mousemove")
        .on("mousemove", (evt) => {
          const currentPosition = stage.toLocalPosition(
            evt.clientX,
            evt.clientY
          );
          const tempPoly: number[][] = [];

          for (const i in polygon) {
            tempPoly[i] = [];

            for (const j in polygon[i]) {
              tempPoly[i][j] = polygon[i][j];
            }
          }

          tempPoly.push([currentPosition.x, currentPosition.y]);

          stage.displayFogMask(tempPoly);
        });
    };

    const stopDrawing = (e: MouseEvent) => {
      stage.clearFogMask();
      $(map).off("mousemove");

      if (polygon.length === 0) {
        return;
      }

      const fog: SceneFog = this.getSceneState().scene.data.fog;

      let result;

      if (this.fogMode === FogMode.Reveal) {
        result = PolyBool.union(
          {
            regions: fog.points,
            inverted: false,
          },
          {
            regions: [polygon],
            inverted: false,
          }
        );
      } else {
        result = PolyBool.difference(
          {
            regions: fog.points,
            inverted: false,
          },
          {
            regions: [polygon],
            inverted: false,
          }
        );
      }

      const previous: any[] = fog.points.slice(0);

      fog.points = result.regions;

      this.getClient().send("scene", "updateFog", {
        scene: this.getSceneState().id,
        points: fog.points,
      });

      this.getCancelState().add(() => {
        this.getClient().send("scene", "updateFog", {
          scene: this.getSceneState().id,
          points: previous,
        });
      });

      polygon = [];
    };

    $map.off("click").on("click", (e) => {
      addWayPoint(e.originalEvent);
    });

    $(document)
      .off("dblclick")
      .on("dblclick", (e) => {
        stopDrawing(e.originalEvent);
      });
  }

  protected enableRectangleFogTool() {
    this.fogTool = FogTool.Rectangle;

    const map = document.getElementById("map");
    const $map = $(map);
    const stage: Stage = this.getStage();

    map.style.cursor = "crosshair";

    this.getFogState().setDrawing(true);

    let rectangle: any = {};

    const startDrawing = (e: MouseEvent) => {
      rectangle = stage.toLocalPosition(e.clientX, e.clientY);

      $(map)
        .off("mousemove")
        .on("mousemove", (evt) => {
          const currentPosition = stage.toLocalPosition(
            evt.clientX,
            evt.clientY
          );

          const position: number[][] = [
            [
              parseInt(rectangle.x.toString(10), 10),
              parseInt(rectangle.y.toString(10), 10),
            ],
            [
              parseInt(currentPosition.x.toString(10), 10),
              parseInt(rectangle.y.toString(10), 10),
            ],
            [
              parseInt(currentPosition.x.toString(10), 10),
              parseInt(currentPosition.y.toString(10), 10),
            ],
            [
              parseInt(rectangle.x.toString(10), 10),
              parseInt(currentPosition.y.toString(10), 10),
            ],
          ];

          stage.displayFogMask(position);
        });
    };

    const stopDrawing = (e: MouseEvent) => {
      stage.clearFogMask();
      $(map).off("mousemove");

      if (rectangle.x === undefined) {
        return;
      }

      const fog: SceneFog = this.getSceneState().scene.data.fog;

      rectangle.x2 = e.clientX;
      rectangle.y2 = e.clientY;

      const convertedTarget = stage.toLocalPosition(rectangle.x2, rectangle.y2);

      const cleared: number[][] = [
        [
          parseInt(rectangle.x.toString(10), 10),
          parseInt(rectangle.y.toString(10), 10),
        ],
        [
          parseInt(convertedTarget.x.toString(10), 10),
          parseInt(rectangle.y.toString(10), 10),
        ],
        [
          parseInt(convertedTarget.x.toString(10), 10),
          parseInt(convertedTarget.y.toString(10), 10),
        ],
        [
          parseInt(rectangle.x.toString(10), 10),
          parseInt(convertedTarget.y.toString(10), 10),
        ],
      ];

      let result;

      if (this.fogMode === FogMode.Reveal) {
        result = PolyBool.union(
          {
            regions: fog.points,
            inverted: false,
          },
          {
            regions: [cleared],
            inverted: false,
          }
        );
      } else {
        result = PolyBool.difference(
          {
            regions: fog.points,
            inverted: false,
          },
          {
            regions: [cleared],
            inverted: false,
          }
        );
      }

      const previous: any[] = fog.points.slice(0);

      fog.points = result.regions;

      this.getClient().send("scene", "updateFog", {
        scene: this.getSceneState().id,
        points: fog.points,
      });

      this.getCancelState().add(() => {
        this.getClient().send("scene", "updateFog", {
          scene: this.getSceneState().id,
          points: previous,
        });
      });

      rectangle = {};
    };

    $map.off("mousedown").on("mousedown", (e) => {
      startDrawing(e.originalEvent);
    });

    $(document)
      .off("mouseup")
      .on("mouseup", (e) => {
        stopDrawing(e.originalEvent);
      });
  }

  protected openSceneExplorer(): Popin {
    return this.getSceneBrowserView().open();
  }

  public createScene() {
    this.updateSceneThumbnail();

    this.getClient().get("scene", "create", {}, (response) => {
      this.getClient().send("scene", "load", {
        scene: response.scene.id,
        toAll: false,
      });
    });
  }

  protected initShortcuts() {
    const board: Board = this.getBoard();

    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (document.activeElement.tagName !== "BODY" || !board.selectedItem) {
          return; // user is focused in another input or no selected item
        }

        this.getClipboard().copy(board.selectedItem);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        if (document.activeElement.tagName !== "BODY" || !board.selectedItem) {
          return; // user is focused in another input or no selected item
        }

        this.getClipboard().cut(board.selectedItem);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (document.activeElement.tagName !== "BODY") {
          return; // user is focused in another input
        }

        this.getClipboard().paste();
      }
    });
  }

  protected updateLayersThumbnails() {
    const scene: Scene = this.getSceneState().scene;

    if (scene === undefined) {
      return;
    }

    if (!this.getUserState().isGm()) {
      return;
    }

    const board: Board = this.getBoard();

    board.getLayers().forEach((layer: BoardLayer) => {
      const path: string = layer.getFirstImageUrl();
      const key: string = layer.item.key;

      if (path === null) {
        return;
      }

      const preview: HTMLElement = $(
        '#layers [data-key="' + key + '"] .preview'
      )[0] as HTMLElement;

      if (!preview) {
        return;
      }

      const img: HTMLImageElement = preview.querySelector("img");

      if (img) {
        if (img.src != Cdn.toUrl(path)) {
          img.src = Cdn.toUrl(path);
        }
      } else {
        preview.innerHTML = '<img src="' + Cdn.toUrl(path) + '" />';
      }
    });
  }

  protected initScenePopin(popin: Popin) {
    const $element = popin.getjQueryElement();

    const displayGrid = () => {
      const gridEnabler = $element[0].querySelector("#grid-enabled");

      if (gridEnabler.checked) {
        $element.find(".grid-container").removeClass("d-none");
      } else {
        $element.find(".grid-container").addClass("d-none");
      }
    };

    this.getClient().get(
      "music",
      "listPlaylist",
      {
        q: null,
      },
      (response) => {
        const $list = $element.find(".playlist-list");

        $list.html(
          Template.render("gm/scene/playlists.html.njk", {
            playlists: response.playlists,
            current: this.getSceneState().scene.data.playlistId,
          })
        );
      }
    );

    $element.find(".playlist-list").on("change", (e) => {
      this.getClient().send("scene", "changePlaylist", {
        playlistId: parseInt(e.currentTarget.value, 10),
        scene: this.getSceneState().id,
      });
    });

    $element.find('[name="name"]').on("change", (e) => {
      this.getClient().send("scene", "changeName", {
        name: e.currentTarget.value,
        scene: this.getSceneState().id,
      });
    });

    $element.find("#grid-enabled").on("change", (e) => {
      displayGrid();

      this.getClient().send("scene", "changeGridEnabled", {
        enabled: e.currentTarget.checked,
        scene: this.getSceneState().id,
      });
    });

    displayGrid();

    $element.find("#grid-type").on("change", (e) => {
      this.getClient().send("scene", "changeGridType", {
        type: $element.find("#grid-type").val(),
        scene: this.getSceneState().id,
      });
    });

    $element.find("#grid-snap").on("change", (e) => {
      this.getClient().send("scene", "changeGridSnap", {
        snap: $element.find("#grid-snap").is(":checked"),
        scene: this.getSceneState().id,
      });
    });

    $element.find("#grid-opacity").on("change", (e) => {
      this.getClient().send("scene", "changeGridOpacity", {
        opacity: parseFloat($element.find("#grid-opacity").val()),
        scene: this.getSceneState().id,
      });
    });

    $element.find("#grid-size").on("change", (e) => {
      this.getClient().send("scene", "changeGridSize", {
        size: parseInt($element.find("#grid-size").val(), 10),
        scene: this.getSceneState().id,
      });
    });

    $element.find('[name="width"]').on("change", (e) => {
      const width: number = parseInt(e.currentTarget.value, 10);

      this.getClient().send("scene", "changeWidth", {
        width: width,
        scene: this.getSceneState().id,
      });
    });

    $element.find('[name="height"]').on("change", (e) => {
      const height: number = parseInt(e.currentTarget.value, 10);

      this.getClient().send("scene", "changeHeight", {
        height: height,
        scene: this.getSceneState().id,
      });
    });

    $element
      .find(".grid-group")
      .find("select, input")
      .on("change", (e) => {
        const values: SceneMetrics = {
          baseCount: parseInt($element.find("#metrics-base-count").val(), 10),
          baseType: SceneMetricsBase.Unit,
          equalCount: parseFloat($element.find("#metrics-equal-count").val()),
          equalType: $element.find("#metrics-equal-type").val(),
        };

        this.getClient().send("scene", "saveMetrics", {
          values: values,
          scene: this.getSceneState().id,
        });
      });

    $element.find("#fog-enabled").on("change", (e) => {
      this.getClient().send("scene", "changeFogEnabled", {
        enabled: e.currentTarget.checked,
        scene: this.getSceneState().id,
      });
    });

    $element.find("#lighting-enabled").on("change", (e) => {
      this.getClient().send("scene", "changeLightingEnabled", {
        enabled: e.currentTarget.checked,
        scene: this.getSceneState().id,
      });
    });

    const $gridColorPicker = $element.find(".grid-color-picker");

    $gridColorPicker
      .colorpicker({
        horizontal: true,
        format: "hex",
        extensions: [
          {
            name: "swatches",
            options: {
              colors: {
                white: "#ffffff",
                black: "#000000",
                grey: "#888888",
                green: "#33884b",
                danger: "#be0003",
                sky: "#2086a2",
              },
              namesAsValues: false,
            },
          },
        ],
      })
      .on("change, colorpickerHide", (e) => {
        const color = $gridColorPicker.val();

        this.getClient().send("scene", "changeGridColor", {
          color: color,
          scene: this.getSceneState().id,
        });
      });

    const $colorPicker = $element.find(".bg-color-picker");

    $colorPicker
      .colorpicker({
        horizontal: true,
        format: "hex",
        extensions: [
          {
            name: "swatches",
            options: {
              colors: {
                white: "#ffffff",
                black: "#000000",
                grey: "#888888",
                green: "#33884b",
                danger: "#be0003",
                sky: "#2086a2",
              },
              namesAsValues: false,
            },
          },
        ],
      })
      .on("change, colorpickerHide", (e) => {
        const color = $colorPicker.val();

        this.getClient().send("scene", "changeBackground", {
          color: color,
          scene: this.getSceneState().id,
        });
      });
  }

  public updateForScene(scene: Scene) {
    this.displayLayers(scene);
    this.updateLayersThumbnails();
  }

  public displayLayers(scene: Scene) {
    const $container = $("#layers");
    $container.html("");

    const layers: SceneLayer[] = scene.getOrderedLayers().reverse();

    for (const i in layers) {
      $("#layers").append(
        Template.render("gm/scene/layer.html.njk", layers[i])
      );
    }

    $container.find(".layer .title").on("click", (e) => {
      e.preventDefault();
      const key: string = $(e.currentTarget).parents(".layer").data("key");
      this.openLayerPopin(key);
    });

    $container.find(".layer .quick-lock").on("click", (e) => {
      e.preventDefault();
      const key: string = $(e.currentTarget).parents(".layer").data("key");

      const data: any = {
        locked: e.currentTarget.dataset.locked == "0",
      };

      this.getClient().send("scene", "lockLayer", {
        layer: key,
        scene: scene.id,
        values: data,
      });
    });

    $container.find(".layer .quick-visibility").on("click", (e) => {
      e.preventDefault();
      const key: string = $(e.currentTarget).parents(".layer").data("key");

      const data: any = {
        visible: e.currentTarget.dataset.visible == "0",
      };

      this.getClient().send("scene", "hideLayer", {
        layer: key,
        scene: scene.id,
        values: data,
      });
    });

    const $layers = $container.find(".layer");

    $layers.on("click", (e) => {
      const key: string = $(e.currentTarget).data("key");
      this.getSceneState().layerKey = key;
      this.highlightSelectedLayer();
      this.getDrawingTool().refreshLayer();
    });

    this.highlightSelectedLayer();
    const $separators = $container.find(".separator");
    let isDragging = false;
    let destinationPosition: number = null;

    $layers.on("dragstart", (e: any) => {
      const transfer = e.originalEvent.dataTransfer;
      transfer.setData("type", "layer");
      transfer.setData("key", $(e.currentTarget).data("key"));
      isDragging = true;
    });

    $layers.on("dragend", (e: any) => {
      $separators.removeClass("active");
      isDragging = false;
      destinationPosition = null;
    });

    $layers.on("dragover", (e) => {
      e.preventDefault();

      $separators.removeClass("active");

      if (isDragging) {
        const $layer = $(e.currentTarget);
        let $separator;
        const y = e.pageY - $layer.offset().top;

        if (y > $layer.height() / 2) {
          $separator = $layer.next(".separator");
        } else {
          $separator = $layer.prev(".separator");
        }

        $separator.addClass("active");
        destinationPosition = parseInt($separator.data("position"), 10) + 1;

        if ($layer.data("position") < destinationPosition) {
          destinationPosition -= 1;
        }
      }
    });

    $layers.on("drop", (e: any) => {
      e.preventDefault();

      const transfer = e.originalEvent.dataTransfer;
      const type = transfer.getData("type");

      if (type !== "layer") {
        return;
      }

      const key = transfer.getData("key");
      this.moveLayerToPosition(key, destinationPosition);
    });
  }

  protected moveLayerToPosition(key: string, position: number) {
    const originalPosition =
      this.getSceneState().scene.data.layers[key].position;

    if (originalPosition === position) {
      return;
    }

    const ordered = this.getSceneState().scene.getOrderedLayers();

    const newOrder: any = {};
    ordered.splice(position, 0, ordered.splice(originalPosition, 1)[0]);

    ordered.forEach((layer: SceneLayer, index: number) => {
      newOrder[layer.key] = index;
    });

    this.getClient().send("scene", "changeLayerOrder", {
      layers: newOrder,
      scene: this.getSceneState().id,
    });
  }

  protected highlightSelectedLayer() {
    const key: string = this.getSceneState().layerKey;

    if (!key) {
      return;
    }

    const $layer = $('#layers .layer[data-key="' + key + '"]');
    $("#layers .layer").removeClass("active");
    $layer.addClass("active");
  }

  public updateSceneThumbnail() {
    const url =
      window["configuration"]["cdnUrl"] +
      "/scene/" +
      this.getSceneState().id.toString();

    const board: Board = this.getBoard();

    board.isUpdated = false;

    board.getThumbnail((img: HTMLCanvasElement) => {
      const dataUrl = img.toDataURL("image/jpeg", 0.4);
      const blob = this.urlToBlob(dataUrl);

      const formData = new FormData();
      formData.append("thumbnail", blob, "scene.jpg");

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
      }).done(() => {
        return true;
      });
    });
  }

  protected openLayerPopin(key: string) {
    const scene: Scene = this.getSceneState().scene;
    const layer: SceneLayer = scene.data.layers[key];
    const html = Template.render("gm/scene/layer-edit.html.njk", layer);

    const popin = this.getPopinManager().create({
      id: "layer-edit-" + key,
      html: html,
      title: this.__("Layer %{name}", { name: layer.name }),
    });

    popin.on("init", (e) => {
      const $elt = popin.getjQueryElement();

      $elt.find('[data-toggle="tooltip"]').tooltip({
        trigger: "hover",
      });

      $elt.find(".btn-apply").on("click", (e) => {
        e.preventDefault();

        const data: any = {
          name: $elt.find('[name="name"]').val(),
          visible: $elt.find('[name="visible"]').is(":checked"),
          locked: $elt.find('[name="locked"]').is(":checked"),
          token: $elt.find('[name="token"]').is(":checked"),
          gm: $elt.find('[name="gm"]').is(":checked"),
          lighting: $elt.find('[name="lighting"]').is(":checked"),
          drawings: $elt.find('[name="drawings"]').is(":checked"),
        };

        this.getClient().send("scene", "updateLayer", {
          layer: key,
          scene: scene.id,
          values: data,
        });

        popin.close();
      });

      $elt.find(".delete-layer-btn").on("click", (e) => {
        e.preventDefault();

        this.getClient().send("scene", "deleteLayer", {
          layer: key,
          scene: scene.id,
        });

        popin.close();
      });
    });

    popin.open();
  }

  protected getThumbnailUrl(media: any) {
    if (media.poster) {
      return media.poster;
    }

    return media.path;
  }

  protected urlToBlob(url: string) {
    const binary = atob(url.split(",")[1]);
    const arr = [];
    let i = 0;

    while (i < binary.length) {
      arr.push(binary.charCodeAt(i));
      i++;
    }

    return new Blob([new Uint8Array(arr)], {
      type: "image/jpeg",
    });
  }

  protected getSceneBrowserView(): SceneBrowserView {
    return container.get<SceneBrowserView>(Views.SceneBrowser);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getSceneRepository(): SceneRepository {
    return container.get<SceneRepository>(Repository.Scene);
  }

  protected getBoard(): Board {
    return container.get<Board>(Services.Board);
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getClipboard(): Clipboard {
    return container.get<Clipboard>(Services.Clipboard);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }

  protected getFogState(): FogState {
    return container.get<FogState>(States.Fog);
  }

  protected getCancelState(): CancelState {
    return container.get<CancelState>(States.Cancel);
  }

  protected getDrawingTool(): DrawingTool {
    return container.get<DrawingTool>(Services.DrawingTool);
  }

  protected getMediaView(): MediaView {
    return container.get<MediaView>(Views.Media);
  }
}
