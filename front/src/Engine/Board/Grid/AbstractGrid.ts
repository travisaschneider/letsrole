import Konva from "konva";
import { EventDispatcher } from "../../../Event/EventDispatcher";
import { Events } from "../../../Event/Events";
import { GridMetrics } from "./GridMetrics";
import { Dimension } from "../../../Math/Dimension";
import { injectable } from "inversify";
import { BoardLayer } from "../BoardLayer";
import Duration = JQuery.Duration;
import { GridError } from "./GridError";
import { ChatView } from "../../../View/ChatView";
import { container } from "../../../DependencyInjection/Container";
import { Views } from "../../../DependencyInjection/Views";
import { Shape } from "konva/lib/Shape";
import Line = Konva.Line;
import Vector2d = Konva.Vector2d;

export interface Highlight {
  group: Konva.Group;
  points: any[];
}

export interface HighlightNodes {
  [id: string]: Highlight;
}

@injectable()
export abstract class AbstractGrid {
  protected static readonly MaxShape: number = 8000;

  public node: Konva.Group;
  public layer: BoardLayer;
  public metrics: GridMetrics;
  public dimensions: Dimension;
  public highlightNodes: HighlightNodes = {};

  public isSnap = false;

  protected boardScale = 1.0;

  public constructor() {
    this.node = new Konva.Group();
  }

  protected checkMaxShape(count: number) {
    if (count > AbstractGrid.MaxShape) {
      throw new GridError("Too many shapes to draw");
    }
  }

  public updateLineScale(boardScale: Vector2d) {
    this.boardScale = boardScale.x;

    const width: number = this.getStrokeWidth();

    this.node.children.forEach((child: Line) => {
      child.strokeWidth(width);
    });

    this.node.clearCache();
    this.node.draw();
  }

  protected getStrokeWidth(): number {
    return this.metrics.strokeWidth * (1 / this.boardScale);
  }

  public getMetrics(): GridMetrics {
    if (this.metrics === undefined) {
      this.metrics = {
        colWidth: 50,
        rowHeight: 50,
      };
    }

    this.metrics.color = this.metrics.color || "black";
    this.metrics.strokeWidth = this.metrics.strokeWidth || 1;
    this.metrics.opacity = this.metrics.opacity || 0.3;

    return this.metrics;
  }

  public clearAllHighlights() {
    for (const i in this.highlightNodes) {
      this.highlightNodes[i].group.removeChildren();
      this.highlightNodes[i].group.clearCache();
      this.highlightNodes[i].points = [];
    }

    this.highlightNodes = {};
  }

  public remove() {
    if (this.layer) {
      this.layer.removeGrid();
    }
  }

  public getDimensions(): Dimension {
    if (this.dimensions === undefined) {
      this.dimensions = {
        width: 1000,
        height: 1000,
      };
    }

    return this.dimensions;
  }

  protected getChatView(): ChatView {
    return container.get<ChatView>(Views.Chat);
  }

  public abstract clearHighlight(id: string): void;

  public abstract convertToCell(points: Konva.Vector2d[]): any[];

  public abstract highlight(points: any[], id: string, color: string): void;

  public abstract render(): void;

  public abstract snapPosition(position: Konva.Vector2d): Konva.Vector2d;

  public abstract snapDimension(dimension: Dimension): Dimension;
}
