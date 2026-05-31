import { Drawing } from "./Drawing";
import { injectable } from "inversify";
import {
  DrawingItem,
  DrawingLineItem,
  DrawingPoint,
  DrawingPolygonItem,
  DrawingRectItem,
  DrawingToolType,
} from "../../../shared/DrawingsData";
import { BoardLayer } from "../Board/BoardLayer";
import Konva from "konva";

@injectable()
export class DrawingRect extends Drawing {
  public readonly tool: DrawingToolType = DrawingToolType.Rect;

  protected defaults: any = {
    borderColor: "rgba(0, 0, 0, 255)",
    fillColor: "transparent",
    weight: 3,
    radius: 0,
    texture: "",
  };

  public draw(item: DrawingRectItem, layer?: BoardLayer) {
    if (!item.width || !item.height) {
      return false;
    }

    if (!layer) {
      layer = this.getDrawingTool().getLayer();
    }

    let rect: Konva.Rect;
    let w: number, h: number, x: number, y: number;

    if (item.width < 0) {
      x = item.position.x + item.width;
      w = -item.width;
    } else {
      x = item.position.x;
      w = item.width;
    }

    if (item.height < 0) {
      y = item.position.y + item.height;
      h = -item.height;
    } else {
      y = item.position.y;
      h = item.height;
    }

    if (!item.node) {
      rect = new Konva.Rect({
        stroke: item.borderColor,
        strokeWidth: item.weight,
        cornerRadius: item.radius,
        x: x,
        y: y,
        width: w,
        height: h,
        fill: item.texture ? null : item.fillColor,
        strokeEnabled: item.weight > 0,
      });

      item.node = rect;

      if (item.texture) {
        this.getDrawingTool().applyTexture(item.node, item.texture);
      }

      layer.addDrawing(item);
      this.getDrawingTool().initItem(item);
    } else {
      rect = item.node;

      if (item.texture) {
        this.getDrawingTool().applyTexture(item.node, item.texture);
      } else {
        rect.fill(item.fillColor);
      }

      if (item.weight == 0) {
        rect.strokeEnabled(false);
      } else {
        rect.strokeEnabled(true);
        rect.stroke(item.borderColor);
        rect.strokeWidth(item.weight);
      }
      rect.position({
        x: x,
        y: y,
      });
      rect.setSize({
        width: w,
        height: h,
      });
      rect.cornerRadius(item.radius);
      rect.cache();
    }
  }

  public init(position: DrawingPoint): DrawingItem {
    const defaults: any = this.getDefaults();

    const item: DrawingRectItem = this.createItem<DrawingRectItem>({
      type: DrawingToolType.Rect,
      position: position,
      fillColor: defaults.fillColor,
      borderColor: defaults.borderColor,
      radius: defaults.radius,
      weight: defaults.weight,
      texture: defaults.texture,
    });

    return item;
  }

  public move(item: DrawingRectItem, position: DrawingPoint) {
    const w: number = position.x - item.position.x;
    const h: number = position.y - item.position.y;

    item.height = h;
    item.width = w;
  }

  public close(item: DrawingRectItem, position: DrawingPoint): boolean {
    this.move(item, position);

    return true;
  }

  public shouldSelectAfterDraw(): boolean {
    return false;
  }
}
