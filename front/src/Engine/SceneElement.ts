import Konva from "konva";
import { ImageItem } from "../../shared/Scene/SceneData";
import { BoardLayer } from "./Board/BoardLayer";
import { RulerState } from "../State/RulerState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { FogState } from "../State/FogState";
import { DrawingState } from "../State/DrawingState";

export class SceneElement extends Konva.Group {
  protected _item: ImageItem;
  protected _layer: BoardLayer;

  public get item(): ImageItem {
    return this._item;
  }

  public get layer(): BoardLayer {
    return this._layer;
  }

  public get isLocked(): boolean {
    return (
      this.layer.item.locked ||
      this.getRulerState().active ||
      this.getFogState().isDrawing() ||
      this.getDrawingState().isDrawing()
    );
  }

  protected getRulerState(): RulerState {
    return container.get<RulerState>(States.Ruler);
  }

  protected getFogState(): FogState {
    return container.get<FogState>(States.Fog);
  }

  protected getDrawingState(): DrawingState {
    return container.get<DrawingState>(States.Drawing);
  }
}
