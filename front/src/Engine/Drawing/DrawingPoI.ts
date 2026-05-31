import { Drawing } from "./Drawing";
import { injectable } from "inversify";
import {
  DrawingCircleItem,
  DrawingItem,
  DrawingLineItem,
  DrawingPoIColor,
  DrawingPoIItem,
  DrawingPoint,
  DrawingToolType,
} from "../../../shared/DrawingsData";
import { BoardLayer } from "../Board/BoardLayer";
import Konva from "konva";
import { Stage } from "../Stage";
import { container } from "../../DependencyInjection/Container";
import { Services } from "../../DependencyInjection/Services";
import { EventDispatcher } from "../../Event/EventDispatcher";
import { Events } from "../../Event/Events";

interface PinImage {
  loaded: boolean;
  img: HTMLImageElement;
}

interface PinImages {
  [color: string]: PinImage;
}

@injectable()
export class DrawingPoI extends Drawing {
  public readonly tool: DrawingToolType = DrawingToolType.PoI;

  protected pinImages: PinImages = {};
  protected selectedItem: DrawingPoIItem;
  protected selectedPoILink: HTMLElement;

  protected defaults: any = {
    color: DrawingPoIColor.Red,
    title: "Point of Interest",
    description: "",
  };

  public constructor() {
    super();

    EventDispatcher.on(Events.BOARD_SCALE_CHANGE, () => {
      this.updatePopovers();
    });

    EventDispatcher.on(Events.BOARD_UNSELECT, () => {
      this.clearPopovers();
    });
  }

  public draw(item: DrawingPoIItem, layer?: BoardLayer) {
    if (!layer) {
      layer = this.getDrawingTool().getLayer();
    }

    let poi: Konva.Group;

    if (!item.node) {
      poi = new Konva.Group({
        x: item.position.x,
        y: item.position.y,
        width: 25,
        height: 44,
      });

      this.attachImage(item.color, (img: HTMLImageElement) => {
        const pin: Konva.Image = new Konva.Image({
          x: -12,
          y: -44,
          width: 25,
          height: 44,
          image: img,
        });

        poi.setAttr("pin", pin);
        poi.add(pin);
      });

      const text = new Konva.Text({
        x: -40,
        y: 10,
        width: 80,
        height: 30,
        text: item.title,
        fill: "#fff",
        align: "center",
        strokeEnabled: true,
        strokeWidth: 2,
        stroke: "#000",
      });

      poi.add(text);
      poi.setAttr("textItem", text);

      item.node = poi;

      layer.addDrawing(item);
      this.getDrawingTool().initItem(item);
    } else {
      poi = item.node;

      poi.position({
        x: item.position.x,
        y: item.position.y,
      });

      this.attachImage(item.color, (img: HTMLImageElement) => {
        const pin: Konva.Image = poi.getAttr("pin");
        pin.image(img);
      });

      const text: Konva.Text = poi.getAttr("textItem");
      text.text(item.title);
    }
  }

  public onItemClick(item: DrawingPoIItem, layer: BoardLayer | boolean) {
    super.onItemClick(item, layer);

    const stage: Stage = this.getStage();

    const container: HTMLElement = document.getElementById("poi");
    const popoverLink: HTMLElement = document.createElement("span");
    popoverLink.classList.add("poi-link");

    const position = stage.toGlobalPosition(item.position.x, item.position.y);

    popoverLink.style.left = (position.x - 4).toString(10) + "px";
    popoverLink.style.top = (position.y - 10).toString(10) + "px";

    container.innerHTML = "";
    container.appendChild(popoverLink);

    $(popoverLink).popover({
      content: item.description,
      placement: "top",
      title: item.title,
      container: container,
    });

    $(popoverLink).popover("show");

    this.selectedItem = item;
    this.selectedPoILink = popoverLink;

    return true;
  }

  public updatePopovers() {
    if (!this.selectedItem) {
      return;
    }

    const item: DrawingPoIItem = this.selectedItem;
    const link: HTMLElement = this.selectedPoILink;

    if (!link) {
      return;
    }

    const stage: Stage = this.getStage();

    const position = stage.toGlobalPosition(item.position.x, item.position.y);

    link.style.left = (position.x - 5).toString(10) + "px";
    link.style.top = (position.y - 10).toString(10) + "px";

    $(link).popover("update");
  }

  public clearPopovers() {
    document.getElementById("poi").innerHTML = "";
    this.selectedPoILink = null;
    this.selectedItem = null;
  }

  protected attachImage(color: DrawingPoIColor, callback: Function) {
    if (!this.pinImages[color]) {
      const img = document.createElement("img") as HTMLImageElement;
      img.setAttribute("crossOrigin", "Anonymous");

      this.pinImages[color] = {
        loaded: false,
        img: img,
      };

      img.addEventListener("load", () => {
        this.pinImages[color].loaded = true;
        callback(img);
      });

      img.src =
        window["configuration"]["cdnReadUrl"] +
        "/static/pin/pin-" +
        color +
        ".png";

      return;
    }

    if (this.pinImages[color].loaded) {
      callback(this.pinImages[color].img);
    } else {
      this.pinImages[color].img.addEventListener("load", () => {
        this.pinImages[color].loaded = true;
        callback(this.pinImages[color].img);
      });
    }
  }

  public init(position: DrawingPoint): DrawingPoIItem {
    const defaults: any = this.getDefaults();

    const item: DrawingPoIItem = this.createItem<DrawingPoIItem>({
      type: DrawingToolType.PoI,
      position: position,
      color: defaults.color,
      title: defaults.title,
      description: defaults.description,
    });

    return item;
  }

  public move(item: DrawingPoIItem, position: DrawingPoint) {
    item.position.x = position.x;
    item.position.y = position.y;
  }

  public close(item: DrawingPoIItem, position: DrawingPoint): boolean {
    this.move(item, position);
    return true;
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }

  public shouldSelectAfterDraw(): boolean {
    return true;
  }
}
