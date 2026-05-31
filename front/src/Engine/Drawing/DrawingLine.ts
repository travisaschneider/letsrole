import { Drawing } from "./Drawing";
import { injectable } from "inversify";
import {
  DrawingFreePolygonItem,
  DrawingItem,
  DrawingLineItem,
  DrawingPoint,
  DrawingToolType,
} from "../../../shared/DrawingsData";
import { BoardLayer } from "../Board/BoardLayer";
import Konva from "konva";

@injectable()
export class DrawingLine extends Drawing {
  public readonly tool: DrawingToolType = DrawingToolType.Line;

  protected defaults: any = {
    color: "rgba(0, 0, 0, 255)",
    weight: 3,
  };

  public draw(item: DrawingLineItem, layer?: BoardLayer) {
    if (!item.to) {
      return false;
    }

    if (!layer) {
      layer = this.getDrawingTool().getLayer();
    }

    let line: Konva.Line;

    if (!item.node) {
      line = new Konva.Line({
        stroke: item.color,
        strokeWidth: item.weight,
        points: [0, 0, item.to.x, item.to.y],
        x: item.position.x,
        y: item.position.y,
      });

      item.node = line;

      layer.addDrawing(item);
      this.getDrawingTool().initItem(item);
    } else {
      line = item.node;

      line.stroke(item.color);
      line.strokeWidth(item.weight);
      line.points([0, 0, item.to.x, item.to.y]);
      line.position({
        x: item.position.x,
        y: item.position.y,
      });
    }
  }

  public init(position: DrawingPoint): DrawingItem {
    const defaults: any = this.getDefaults();

    const item: DrawingLineItem = this.createItem<DrawingLineItem>({
      type: DrawingToolType.Line,
      position: position,
      color: defaults.color,
      weight: defaults.weight,
    });

    return item;
  }

  public move(item: DrawingLineItem, position: DrawingPoint) {
    item.to = {
      x: position.x - item.position.x,
      y: position.y - item.position.y,
    };
  }

  public close(item: DrawingLineItem, position: DrawingPoint): boolean {
    this.move(item, position);

    return true;
  }

  public shouldSelectAfterDraw(): boolean {
    return false;
  }
}
