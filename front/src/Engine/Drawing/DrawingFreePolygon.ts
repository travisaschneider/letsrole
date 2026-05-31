import { Drawing } from "./Drawing";
import { injectable } from "inversify";
import {
  DrawingArrowItem,
  DrawingFreePolygonItem,
  DrawingItem,
  DrawingLineItem,
  DrawingPoint,
  DrawingRectItem,
  DrawingToolType,
} from "../../../shared/DrawingsData";
import { BoardLayer } from "../Board/BoardLayer";
import Konva from "konva";

@injectable()
export class DrawingFreePolygon extends Drawing {
  public readonly tool: DrawingToolType = DrawingToolType.FreePolygon;
  public readonly doubleClickToEnd: boolean = true;

  protected defaults: any = {
    borderColor: "rgba(0, 0, 0, 255)",
    fillColor: "transparent",
    weight: 3,
    radius: 0,
    texture: "",
    smooth: false,
    ended: false,
  };

  public draw(item: DrawingFreePolygonItem, layer?: BoardLayer) {
    if (!layer) {
      layer = this.getDrawingTool().getLayer();
    }

    let poly: Konva.Line;

    if (!item.node) {
      poly = new Konva.Line({
        stroke: item.borderColor,
        strokeWidth: item.weight,
        points: item.points,
        fill: item.texture ? null : item.fillColor,
        strokeEnabled: item.weight > 0,
        x: item.position.x,
        y: item.position.y,
        closed: true,
        listening: item.ended,
      });

      item.node = poly;

      if (item.texture) {
        this.getDrawingTool().applyTexture(item.node, item.texture);
      }

      layer.addDrawing(item);
      this.getDrawingTool().initItem(item);
    } else {
      poly = item.node;

      if (item.texture) {
        this.getDrawingTool().applyTexture(item.node, item.texture);
      } else {
        poly.fill(item.fillColor);
      }

      if (item.weight == 0) {
        poly.strokeEnabled(false);
      } else {
        poly.strokeEnabled(true);
        poly.stroke(item.borderColor);
        poly.strokeWidth(item.weight);
      }

      poly.points(item.points);
      poly.listening(item.ended);
    }
  }

  public init(position: DrawingPoint): DrawingItem {
    const defaults: any = this.getDefaults();

    const item: DrawingFreePolygonItem =
      this.createItem<DrawingFreePolygonItem>({
        type: DrawingToolType.FreePolygon,
        position: position,
        fillColor: defaults.fillColor,
        borderColor: defaults.borderColor,
        weight: defaults.weight,
        texture: defaults.texture,
        smooth: defaults.smooth,
        points: [0, 0, 0, 0],
        ended: false,
      });

    return item;
  }

  public move(item: DrawingFreePolygonItem, position: DrawingPoint) {
    const x: number = position.x - item.position.x;
    const y: number = position.y - item.position.y;

    item.points[item.points.length - 2] = x;
    item.points[item.points.length - 1] = y;
  }

  public close(item: DrawingFreePolygonItem, position: DrawingPoint) {
    const x: number = position.x - item.position.x;
    const y: number = position.y - item.position.y;

    item.points.push(x);
    item.points.push(y);

    return false;
  }

  public doubleClick(item: DrawingFreePolygonItem, position: DrawingPoint) {
    item.ended = true;
    this.move(item, position);
  }

  public shouldSelectAfterDraw(): boolean {
    return false;
  }
}
