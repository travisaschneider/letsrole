import { Drawing } from "./Drawing";
import { injectable } from "inversify";
import {
  DrawingArrowItem,
  DrawingCircleItem,
  DrawingItem,
  DrawingPoint,
  DrawingToolType,
} from "../../../shared/DrawingsData";
import { BoardLayer } from "../Board/BoardLayer";
import Konva from "konva";

@injectable()
export class DrawingCircle extends Drawing {
  public readonly tool: DrawingToolType = DrawingToolType.Circle;

  protected defaults: any = {
    borderColor: "rgba(0, 0, 0, 255)",
    fillColor: "transparent",
    weight: 3,
    radius: 0,
    texture: "",
  };

  public draw(item: DrawingCircleItem, layer?: BoardLayer) {
    if (!item.radius || !item.radius.x || !item.radius.y) {
      return false;
    }

    if (!layer) {
      layer = this.getDrawingTool().getLayer();
    }

    let circle: Konva.Ellipse;

    if (!item.node) {
      circle = new Konva.Ellipse({
        stroke: item.borderColor,
        strokeWidth: item.weight,
        x: item.position.x,
        y: item.position.y,
        fill: item.fillColor,
        strokeEnabled: item.weight > 0,
        radiusX: item.radius.x,
        radiusY: item.radius.y,
      });

      item.node = circle;

      if (item.texture) {
        this.getDrawingTool().applyTexture(item.node, item.texture);
      }

      layer.addDrawing(item);
      this.getDrawingTool().initItem(item);
    } else {
      circle = item.node;

      if (item.texture) {
        this.getDrawingTool().applyTexture(item.node, item.texture);
      } else {
        circle.fill(item.fillColor);
      }

      if (item.weight == 0) {
        circle.strokeEnabled(false);
      } else {
        circle.strokeEnabled(true);
        circle.stroke(item.borderColor);
        circle.strokeWidth(item.weight);
      }
      circle.position({
        x: item.position.x,
        y: item.position.y,
      });

      circle.radius(item.radius);
    }
  }

  public init(position: DrawingPoint): DrawingItem {
    const defaults: any = this.getDefaults();

    const item: DrawingCircleItem = this.createItem<DrawingCircleItem>({
      type: DrawingToolType.Circle,
      position: position,
      fillColor: defaults.fillColor,
      borderColor: defaults.borderColor,
      weight: defaults.weight,
      radius: {
        x: 0,
        y: 0,
      },
      texture: defaults.texture,
    });

    return item;
  }

  public move(item: DrawingCircleItem, position: DrawingPoint) {
    const w: number = position.x - item.position.x;
    const h: number = position.y - item.position.y;

    item.radius.x = Math.abs(w);
    item.radius.y = Math.abs(h);
  }
  public close(item: DrawingCircleItem, position: DrawingPoint): boolean {
    this.move(item, position);

    return true;
  }

  public shouldSelectAfterDraw(): boolean {
    return false;
  }
}
