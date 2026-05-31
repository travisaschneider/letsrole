import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { TableState } from "../State/TableState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";

@injectable()
export class TableController extends Controller {
  public readonly name: string = "table";

  public async load(request: BaseMessage) {
    this.getTableState().table = request.table;
  }

  protected getTableState(): TableState {
    return container.get<TableState>(States.Table);
  }
}
