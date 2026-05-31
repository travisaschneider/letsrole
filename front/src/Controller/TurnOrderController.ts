import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { TableState } from "../State/TableState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { TurnOrderView } from "../View/TurnOrderView";
import { Views } from "../DependencyInjection/Views";

@injectable()
export class TurnOrderController extends Controller {
  public readonly name: string = "turn-order";

  public async updateItem(message: BaseMessage) {
    this.getTableState().turnOrder.items[message.index] = message.item;

    this.getView().update();
  }

  public async update(message: BaseMessage) {
    this.getTableState().turnOrder = message.turnOrder;

    this.getView().update();
  }

  protected getTableState(): TableState {
    return container.get<TableState>(States.Table);
  }

  protected getView(): TurnOrderView {
    return container.get<TurnOrderView>(Views.TurnOrder);
  }
}
