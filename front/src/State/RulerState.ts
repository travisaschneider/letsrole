import { injectable } from "inversify";
import { ToolState, ToolType } from "./ToolState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";

@injectable()
export class RulerState {
  protected _active = false;

  public get active(): boolean {
    return this._active;
  }

  public set active(active: boolean) {
    this._active = active;

    if (active) {
      this.getToolState().enable(ToolType.Ruler);
    } else {
      this.getToolState().disable();
    }
  }

  protected getToolState(): ToolState {
    return container.get<ToolState>(States.Tool);
  }
}
