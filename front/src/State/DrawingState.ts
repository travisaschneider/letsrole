import { injectable } from "inversify";
import { ToolState, ToolType } from "./ToolState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";

@injectable()
export class DrawingState {
  protected drawing = false;

  public setIsDrawing(drawing: boolean) {
    this.drawing = drawing;

    if (drawing) {
      this.getToolState().enable(ToolType.Drawing);
    } else {
      this.getToolState().disable();
    }
  }

  public isDrawing(): boolean {
    return this.drawing;
  }

  protected getToolState(): ToolState {
    return container.get<ToolState>(States.Tool);
  }
}
