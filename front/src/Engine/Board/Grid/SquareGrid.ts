import { AbstractGrid } from "./AbstractGrid";
import Konva from "konva";
import { injectable } from "inversify";
import { Dimension } from "../../../Math/Dimension";
import { GridError } from "./GridError";
import { ChatMessage, ChatSystemUser } from "../../../View/ChatView";
import { CharacterColors } from "../../../../shared/Scene/SceneData";

@injectable()
export class SquareGrid extends AbstractGrid {
  public render(): void {
    this.node.removeChildren();
    this.clearAllHighlights();

    let n = 0;

    const metrics = this.getMetrics();
    const size = this.getDimensions();
    const width: number = this.getStrokeWidth();

    const horizontalCount: number = Math.ceil(size.width / metrics.colWidth);
    const verticalCount: number = Math.ceil(size.height / metrics.rowHeight);

    try {
      for (let i = 0; i < horizontalCount; i++) {
        const line = new Konva.Line({
          points: [i * metrics.colWidth, 0, i * metrics.colWidth, size.height],
          stroke: metrics.color,
          strokeWidth: width,
          listening: false,
        });

        this.node.add(line);
        this.checkMaxShape(n++);
      }

      for (let i = 0; i < verticalCount; i++) {
        const line = new Konva.Line({
          points: [0, i * metrics.rowHeight, size.width, i * metrics.rowHeight],
          stroke: metrics.color,
          strokeWidth: width,
          listening: false,
        });

        this.node.add(line);
        this.checkMaxShape(n++);
      }
    } catch (e) {
      if (e instanceof GridError) {
        this.getChatView().add({
          from: ChatSystemUser.Error,
          message: "Unable to draw grid : " + e.message,
        });
      }
    }

    this.node.opacity(metrics.opacity);
  }

  public snapDimension(dimension: Dimension): Dimension {
    const metrics = this.getMetrics();

    let countX = Math.round(dimension.width / metrics.colWidth);
    let countY = Math.round(dimension.height / metrics.rowHeight);

    if (countX <= 0) countX = 1;
    if (countY <= 0) countY = 1;

    return {
      width: countX * metrics.colWidth,
      height: countY * metrics.rowHeight,
    };
  }

  public snapPosition(position: Konva.Vector2d): Konva.Vector2d {
    const metrics = this.getMetrics();

    return {
      x: Math.round(position.x / metrics.colWidth) * metrics.colWidth,
      y: Math.round(position.y / metrics.rowHeight) * metrics.rowHeight,
    };
  }

  public convertToCell(points: Konva.Vector2d[]): Konva.Vector2d[] {
    const convertToLocal = (p: Konva.Vector2d): Konva.Vector2d => {
      return {
        x: Math.floor(p.x / this.getMetrics().colWidth),
        y: Math.floor(p.y / this.getMetrics().rowHeight),
      };
    };

    const diagonalDistance = (p0: Konva.Vector2d, p1: Konva.Vector2d) => {
      const dx: number = p1.x - p0.x;
      const dy: number = p1.y - p0.y;

      return Math.max(Math.abs(dx), Math.abs(dy));
    };

    const roundPoint = (p: Konva.Vector2d): Konva.Vector2d => {
      return {
        x: Math.round(p.x),
        y: Math.round(p.y),
      };
    };

    const lerpPoint = (
      p0: Konva.Vector2d,
      p1: Konva.Vector2d,
      t: number
    ): Konva.Vector2d => {
      return {
        x: lerp(p0.x, p1.x, t),
        y: lerp(p0.y, p1.y, t),
      };
    };

    const lerp = (start: number, end: number, t: number) => {
      return start + t * (end - start);
    };

    let index = 0;
    let last: Konva.Vector2d = null;
    let lastIndex: number = null;
    const result: Konva.Vector2d[] = [];

    while (index < points.length - 1) {
      const p0 = convertToLocal(points[index]);
      const p1 = convertToLocal(points[index + 1]);

      const n: number = diagonalDistance(p0, p1);
      let count = 0;

      for (let step = 0; step <= n; step++) {
        const t = n == 0 ? 0.0 : step / n;
        result.push(roundPoint(lerpPoint(p0, p1, t)));
        count++;
      }

      if (count === 0) {
        index++;

        if (result.length > 0) {
          last = result[result.length - 1];
        }

        continue;
      }

      if (last !== null) {
        const start: Konva.Vector2d = result[lastIndex];

        if (last.x === start.x && last.y === start.y) {
          result.splice(lastIndex, 1);
        }
      }

      last = result[result.length - 1];

      index++;
      lastIndex = result.length - 1;
    }

    return result;
  }

  public clearHighlight(id: string): void {
    if (!this.highlightNodes[id]) {
      return;
    }

    this.highlightNodes[id].group.removeChildren();
    this.highlightNodes[id].group.clearCache();
    this.highlightNodes[id].points = [];
  }

  public highlight(points: Konva.Vector2d[], id: string, color: string): void {
    const uniq: Konva.Vector2d[] = Object.assign([], points);

    // remove duplicates
    for (const i in uniq) {
      for (const j in uniq) {
        if (i !== j && uniq[i] && uniq[j]) {
          if (uniq[i].x === uniq[j].x && uniq[i].y === uniq[j].y) {
            uniq.splice(parseInt(i, 10), 1);
          }
        }
      }
    }

    if (uniq.length === 0) {
      return;
    }

    if (this.highlightNodes[id]) {
      let same = true;

      if (uniq.length !== this.highlightNodes[id].points.length) {
        same = false;
      } else {
        for (let i = 0; i < uniq.length; i++) {
          const current = this.highlightNodes[id].points[i];
          const point = uniq[i];

          if (!current) {
            same = false;
            break;
          }

          if (current.x !== point.x || current.y !== point.y) {
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
        points: uniq,
      };

      this.layer.node.add(this.highlightNodes[id].group);
    } else {
      this.clearHighlight(id);
    }

    const group: Konva.Group = this.highlightNodes[id].group;
    this.highlightNodes[id].points = points;
    group.clearCache();

    const metrics = this.getMetrics();
    const colorItem: string = CharacterColors[color];

    uniq.forEach((point: Konva.Vector2d) => {
      group.add(
        new Konva.Rect({
          x: point.x * metrics.colWidth,
          y: point.y * metrics.rowHeight,
          width: metrics.colWidth,
          height: metrics.rowHeight,
          stroke: colorItem,
          strokeWidth: 3,
          fill: colorItem,
          opacity: 0.3,
        })
      );
    });

    group.cache();
  }
}
