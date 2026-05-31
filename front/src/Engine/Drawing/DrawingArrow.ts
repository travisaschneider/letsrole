import { Drawing } from "./Drawing";
import { injectable } from "inversify";
import {
  DrawingArrowItem,
  DrawingItem,
  DrawingLineItem,
  DrawingPoint,
  DrawingToolType,
} from "../../../shared/DrawingsData";
import { BoardLayer } from "../Board/BoardLayer";
import Konva from "konva";

@injectable()
export class DrawingArrow extends Drawing {
  public readonly tool: DrawingToolType = DrawingToolType.Arrow;

  protected defaults: any = {
    color: "rgba(0, 0, 0, 255)",
    weight: 3,
    arrowSize: 10,
    begin: false,
  };

  public draw(item: DrawingArrowItem, layer?: BoardLayer) {
    if (!item.to) {
      return false;
    }

    if (!layer) {
      layer = this.getDrawingTool().getLayer();
    }

    let arrow: Konva.Arrow;

    if (!item.node) {
      arrow = new Konva.Arrow({
        stroke: item.color,
        strokeWidth: item.weight,
        points: [0, 0, item.to.x, item.to.y],
        x: item.position.x,
        y: item.position.y,
        pointerLength: item.arrowSize,
        pointerWidth: item.arrowSize,
        pointerAtBeginning: item.begin,
        fill: item.color,
      });

      item.node = arrow;

      layer.addDrawing(item);
      this.getDrawingTool().initItem(item);
    } else {
      arrow = item.node;

      arrow.stroke(item.color);
      arrow.fill(item.color);
      arrow.strokeWidth(item.weight);
      arrow.points([0, 0, item.to.x, item.to.y]);
      arrow.position({
        x: item.position.x,
        y: item.position.y,
      });

      arrow.pointerLength(item.arrowSize);
      arrow.pointerWidth(item.arrowSize);
      arrow.pointerAtBeginning(item.begin);
    }
  }

  public init(position: DrawingPoint): DrawingItem {
    const defaults: any = this.getDefaults();

    const item: DrawingArrowItem = this.createItem<DrawingArrowItem>({
      type: DrawingToolType.Arrow,
      position: position,
      color: defaults.color,
      weight: defaults.weight,
      arrowSize: defaults.arrowSize,
      begin: defaults.begin,
    });

    return item;
  }

  public move(item: DrawingArrowItem, position: DrawingPoint) {
    item.to = {
      x: position.x - item.position.x,
      y: position.y - item.position.y,
    };
  }

  public close(item: DrawingArrowItem, position: DrawingPoint): boolean {
    this.move(item, position);

    return true;
  }

  public shouldSelectAfterDraw(): boolean {
    return false;
  }
}
