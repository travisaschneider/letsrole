import { Drawing } from "./Drawing";
import { injectable } from "inversify";
import {
  DrawingItem,
  DrawingLineItem,
  DrawingPoint,
  DrawingRectItem,
  DrawingTextItem,
  DrawingToolType,
} from "../../../shared/DrawingsData";
import { BoardLayer } from "../Board/BoardLayer";
import Konva from "konva";

@injectable()
export class DrawingText extends Drawing {
  public readonly tool: DrawingToolType = DrawingToolType.Text;

  protected defaults: any = {
    color: "rgba(0, 0, 0, 255)",
    font: "Arial",
    size: 15,
    text: "Your text...",
  };

  public draw(item: DrawingTextItem, layer?: BoardLayer) {
    if (!item.width || !item.height) {
      return false;
    }

    if (!layer) {
      layer = this.getDrawingTool().getLayer();
    }

    let group: Konva.Group;
    let text: Konva.Text;
    let border: Konva.Rect;

    if (!item.node) {
      group = new Konva.Group({
        x: item.position.x,
        y: item.position.y,
      });

      text = new Konva.Text({
        width: item.width,
        height: item.height,
        text: item.text,
        fill: item.color,
        fontFamily: item.font,
        fontSize: item.size,
      });

      group.add(text);
      group.setAttr("itemText", text);

      if (item.isDrawing) {
        border = new Konva.Rect({
          x: 0,
          y: 0,
          width: item.width,
          height: item.height,
          strokeEnabled: true,
          stroke: "rgba(130,130,130)",
          strokeWidth: 4,
          dashEnabled: true,
          dash: [20, 6],
        });

        group.add(border);
        group.setAttr("itemBorder", border);
      }

      item.node = group;

      layer.addDrawing(item);
      this.getDrawingTool().initItem(item);
    } else {
      group = item.node;
      text = group.getAttr("itemText");
      border = group.getAttr("itemBorder");

      text.fill(item.color);

      group.position({
        x: item.position.x,
        y: item.position.y,
      });

      text.setSize({
        width: item.width,
        height: item.height,
      });

      text.text(item.text);
      text.fontFamily(item.font);
      text.fontSize(item.size);

      if (item.isDrawing && border) {
        border.width(item.width);
        border.height(item.height);
      }

      if (!item.isDrawing && border) {
        border.remove();
      }
    }
  }

  public init(position: DrawingPoint): DrawingItem {
    const defaults: any = this.getDefaults();

    const item: DrawingTextItem = this.createItem<DrawingTextItem>({
      type: DrawingToolType.Text,
      position: position,
      color: defaults.color,
      size: defaults.size,
      font: defaults.font,
      text: defaults.text,
      isDrawing: true,
    });

    return item;
  }

  public move(item: DrawingTextItem, position: DrawingPoint) {
    const w: number = position.x - item.position.x;
    const h: number = position.y - item.position.y;

    item.height = h;
    item.width = w;
    item.isDrawing = true;
  }

  public close(item: DrawingTextItem, position: DrawingPoint): boolean {
    this.move(item, position);
    item.isDrawing = false;

    return true;
  }

  public shouldSelectAfterDraw(): boolean {
    return true;
  }
}
