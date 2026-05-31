import {
  DrawingItem,
  DrawingPoint,
  DrawingToolType,
} from "../../../shared/DrawingsData";
import { injectable } from "inversify";
import { BoardLayer } from "../Board/BoardLayer";
import { DrawingTool } from "../Board/DrawingTool";
import { container } from "../../DependencyInjection/Container";
import { Services } from "../../DependencyInjection/Services";
import { UserState } from "../../State/UserState";
import { States } from "../../DependencyInjection/State";

@injectable()
export abstract class Drawing {
  public readonly tool: DrawingToolType;
  public readonly doubleClickToEnd: boolean = false;

  protected defaults: any;

  protected createItem<T>(item: any): T {
    return {
      ...{
        zIndex: 0,
        key: this.generateRandomString(16),
        userId: this.getUserState().id,
      },
      ...item,
    };
  }

  public abstract shouldSelectAfterDraw(): boolean;

  public abstract draw(item: DrawingItem, layer?: BoardLayer);
  public abstract init(position: DrawingPoint): DrawingItem;
  public abstract move(item: DrawingItem, position: DrawingPoint);
  public abstract close(item: DrawingItem, position: DrawingPoint): boolean;

  public doubleClick(item: DrawingItem, position: DrawingPoint): void {
    return;
  }

  public onItemClick(item: DrawingItem, layer: BoardLayer | boolean): boolean {
    return false;
  }

  public setDefault(spec: string, value: any) {
    this.defaults[spec] = value;
  }

  public getDefaults(): any {
    return this.defaults;
  }

  protected getDrawingTool(): DrawingTool {
    return container.get<DrawingTool>(Services.DrawingTool);
  }

  protected generateRandomString(length: number) {
    return Math.random().toString(36).replace("0.", "").slice(-length);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }
}
