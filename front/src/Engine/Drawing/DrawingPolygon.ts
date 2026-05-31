import { Drawing } from "./Drawing";
import { injectable } from "inversify";
import {
  DrawingCircleItem,
  DrawingItem,
  DrawingPoIItem,
  DrawingPoint,
  DrawingPolygonItem,
  DrawingToolType,
} from "../../../shared/DrawingsData";
import { BoardLayer } from "../Board/BoardLayer";
import Konva from "konva";

@injectable()
export class DrawingPolygon extends Drawing {
  public readonly tool: DrawingToolType = DrawingToolType.Polygon;

  protected defaults: any = {
    borderColor: "rgba(0, 0, 0, 255)",
    fillColor: "transparent",
    weight: 3,
    sides: 6,
    texture: "",
  };

  public draw(item: DrawingPolygonItem, layer?: BoardLayer) {
    if (!item.radius) {
      return false;
    }

    if (!layer) {
      layer = this.getDrawingTool().getLayer();
    }

    let poly: Konva.RegularPolygon;

    if (!item.node) {
      poly = new Konva.RegularPolygon({
        stroke: item.borderColor,
        strokeWidth: item.weight,
        x: item.position.x,
        y: item.position.y,
        fill: item.fillColor,
        strokeEnabled: item.weight > 0,
        radius: item.radius,
        sides: item.sides,
        rotation: item.rotation,
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
      poly.position({
        x: item.position.x,
        y: item.position.y,
      });

      poly.radius(item.radius);
      poly.sides(item.sides);
      poly.rotation(item.rotation);
    }
  }

  public init(position: DrawingPoint): DrawingItem {
    const defaults: any = this.getDefaults();

    const item: DrawingPolygonItem = this.createItem<DrawingPolygonItem>({
      type: DrawingToolType.Polygon,
      position: position,
      fillColor: defaults.fillColor,
      borderColor: defaults.borderColor,
      weight: defaults.weight,
      sides: defaults.sides,
      rotation: 0,
      texture: defaults.texture,
    });

    return item;
  }

  public move(item: DrawingPolygonItem, position: DrawingPoint) {
    const x: number = position.x - item.position.x;
    const y: number = position.y - item.position.y;

    item.radius = Math.sqrt(Math.pow(-x, 2) + Math.pow(-y, 2));
    item.rotation = (Math.atan2(y, x) * 180) / Math.PI;
  }

  public close(item: DrawingPolygonItem, position: DrawingPoint): boolean {
    this.move(item, position);

    return true;
  }

  public shouldSelectAfterDraw(): boolean {
    return false;
  }
}
