import { Drawing } from "./Drawing";
import { injectable } from "inversify";
import {
  DrawingArrowItem,
  DrawingFreeItem,
  DrawingItem,
  DrawingPoint,
  DrawingToolType,
} from "../../../shared/DrawingsData";
import { BoardLayer } from "../Board/BoardLayer";
import Konva from "konva";
import { SimplifyAP, ISimplifyArrayPoint } from "simplify-ts";

@injectable()
export class DrawingFree extends Drawing {
  public readonly tool: DrawingToolType = DrawingToolType.Free;

  protected defaults: any = {
    color: "rgba(0, 0, 0, 255)",
    weight: 3,
  };

  public draw(item: DrawingFreeItem, layer?: BoardLayer) {
    if (!item.points || item.points.length <= 2) {
      return false;
    }

    if (!layer) {
      layer = this.getDrawingTool().getLayer();
    }

    let free: Konva.Line;

    if (!item.node) {
      free = new Konva.Line({
        stroke: item.color,
        strokeWidth: item.weight,
        points: item.points,
        x: item.position.x,
        y: item.position.y,
        tension: 0.2,
      });

      item.node = free;

      layer.addDrawing(item);
      this.getDrawingTool().initItem(item);
    } else {
      free = item.node;

      free.stroke(item.color);
      free.strokeWidth(item.weight);
      free.points(item.points);
      free.position({
        x: item.position.x,
        y: item.position.y,
      });
    }
  }

  public init(position: DrawingPoint): DrawingItem {
    const defaults: any = this.getDefaults();

    const item: DrawingFreeItem = this.createItem<DrawingFreeItem>({
      type: DrawingToolType.Free,
      position: position,
      color: defaults.color,
      weight: defaults.weight,
      points: [0, 0],
    });

    return item;
  }

  public move(item: DrawingFreeItem, position: DrawingPoint) {
    const x: number = position.x - item.position.x;
    const y: number = position.y - item.position.y;
    const lastX: number = item.points[item.points.length - 2];
    const lastY: number = item.points[item.points.length - 1];
    const distance: number = Math.sqrt(
      Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2)
    );

    if (distance > 5) {
      item.points.push(x);
      item.points.push(y);
    }
  }

  public close(item: DrawingFreeItem, position: DrawingPoint): boolean {
    const x: number = position.x - item.position.x;
    const y: number = position.y - item.position.y;

    item.points.push(x);
    item.points.push(y);

    const points: ISimplifyArrayPoint[] = this.convertToPairs(item.points);
    const simplified = SimplifyAP(points, 2.5);

    item.points = this.convertToLinear(simplified);

    return true;
  }

  protected convertToLinear(points: ISimplifyArrayPoint[]): number[] {
    const linear: number[] = [];

    points.forEach((point: ISimplifyArrayPoint) => {
      linear.push(point[0]);
      linear.push(point[1]);
    });

    return linear;
  }

  protected convertToPairs(points: number[]): ISimplifyArrayPoint[] {
    const pairs = [];

    for (let i = 0; i < points.length; i += 2) {
      pairs.push([points[i], points[i + 1]]);
    }

    return pairs;
  }

  public shouldSelectAfterDraw(): boolean {
    return false;
  }
}
