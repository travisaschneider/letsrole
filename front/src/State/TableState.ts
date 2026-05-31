import { injectable } from "inversify";
import { TurnOrderData } from "../../shared/TurnOrderData";

@injectable()
export class TableState {
  protected _table: any;
  protected _turnOrder: TurnOrderData;

  public set turnOrder(turnOrder: TurnOrderData) {
    this._turnOrder = turnOrder;
  }

  public get turnOrder(): TurnOrderData {
    return this._turnOrder;
  }

  public set table(table: any) {
    this._table = table;
  }

  public get table(): any {
    return this._table;
  }
}
