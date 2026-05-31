import { AbstractGrid } from "./AbstractGrid";
import Konva from "konva";
import { injectable } from "inversify";
import { Point, Layout, Hex } from "./HexLib";
import { Dimension } from "../../../Math/Dimension";
import { GridError } from "./GridError";
import { ChatSystemUser } from "../../../View/ChatView";
import { CharacterColors } from "../../../../shared/Scene/SceneData";

@injectable()
export class HexGrid extends AbstractGrid {
  protected layout: Layout;

  public render(): void {
    this.node.clearCache();
    this.node.removeChildren();

    let n = 0;

    const metrics = this.getMetrics();
    const size = this.getDimensions();

    let width;
    const height = (width = metrics.colWidth);

    this.layout = new Layout(
      Layout.flat,
      new Point(width, height),
      new Point(0, 0)
    );

    const mapHeight = Math.ceil(size.height / height);
    const mapWidth = Math.ceil(size.width / width);

    try {
      for (let q = 0; q < mapWidth; q++) {
        const qOffset = q >> 1;

        for (let r = -qOffset; r < mapHeight - qOffset; r++) {
          const hex = new Hex(q, r, -q - r);
          const lines = this.layout.polygonCorners(hex);

          const points: number[] = [];

          for (const i in lines) {
            points.push(lines[i].x, lines[i].y);
          }

          const line = new Konva.Line({
            points: points,
            stroke: metrics.color,
            strokeWidth: metrics.strokeWidth,
            listening: false,
          });

          this.node.add(line);

          this.checkMaxShape(n++);
        }
      }
    } catch (e) {
      if (e instanceof GridError) {
        this.getChatView().add({
          from: ChatSystemUser.Error,
          message: "Unable to draw hex grid : " + e.message,
        });
      }
    }

    this.node.opacity(metrics.opacity);
    this.node.cache();
  }

  public updateLineScale(boardScale: Konva.Vector2d) {
    // disabled
  }

  public snapPosition(position: Konva.Vector2d): Konva.Vector2d {
    return position;
  }

  public snapDimension(dimension: Dimension): Dimension {
    return dimension;
  }

  public clearHighlight(id: string): void {
    if (!this.highlightNodes[id]) {
      return;
    }

    this.highlightNodes[id].group.removeChildren();
    this.highlightNodes[id].group.clearCache();
    this.highlightNodes[id].points = [];
  }

  public convertToCell(points: Konva.Vector2d[]): any[] {
    let index = 0;
    let last: Hex = null;
    let lastIndex: number = null;
    const result: any[] = [];

    while (index < points.length - 1) {
      const source = this.layout.pixelToHex(points[index]).round();
      const dest = this.layout.pixelToHex(points[index + 1]).round();
      const line = source.linedraw(dest);

      for (const i in line) {
        result.push(line[i]);
      }

      if (line.length === 0) {
        index++;

        if (result.length > 0) {
          last = result[result.length - 1];
        }

        continue;
      }

      if (last !== null) {
        const start: Hex = result[lastIndex];

        if (start.r === last.r && start.q === last.q && start.s === last.s) {
          result.splice(lastIndex, 1);
        }
      }

      last = result[result.length - 1];
      lastIndex = result.length - 1;

      index++;
    }

    return result;
  }

  public highlight(points: any[], id: string, color: string): void {
    if (points.length === 0) {
      return;
    }

    if (this.highlightNodes[id]) {
      let same = true;

      if (points.length !== this.highlightNodes[id].points.length) {
        same = false;
      } else {
        for (let i = 0; i < points.length; i++) {
          const current = this.highlightNodes[id].points[i];
          const point = points[i];

          if (!current) {
            same = false;
            break;
          }

          if (
            current.q !== point.q ||
            current.r !== point.r ||
            current.s !== point.s
          ) {
            same = false;
            break;
          }
        }
      }

      if (same) {
        return;
      }
    }

    if (!this.highlightNodes[id]) {
      this.highlightNodes[id] = {
        group: new Konva.Group(),
        points: points,
      };

      this.layer.node.add(this.highlightNodes[id].group);
    } else {
      this.clearHighlight(id);
    }

    const colorItem: string = CharacterColors[color];
    const group: Konva.Group = this.highlightNodes[id].group;
    group.clearCache();
    this.highlightNodes[id].points = points;

    for (const i in points) {
      const lines = this.layout.polygonCorners(points[i]);

      const dots: number[] = [];

      for (const i in lines) {
        dots.push(lines[i].x, lines[i].y);
      }

      const line = new Konva.Line({
        points: dots,
        stroke: colorItem,
        strokeWidth: 3,
        closed: true,
        fill: colorItem,
      });

      group.add(line);
    }

    group.opacity(0.3);
    group.cache();
  }
}
