export interface DiceRoller {
  visibility: DiceRollerVisibility;
  [DiceRollerSide.Base]: DiceRollerItems;
  comparison?: DiceRollerComparison;
  [DiceRollerSide.Right]?: DiceRollerItems;
}

export type DiceRollerItems = Array<DiceRollerItemDice | DiceRollerItemNumber>;

export interface DiceRollerItem {
  type: DiceRollerItemType;
  operator?: DiceRollerOperator;
}

export interface DiceRollerItemDice extends DiceRollerItem {
  readonly type: DiceRollerItemType.Dice;
  count: number;
  dimension: DiceDimension;
  func?: DiceRollFunction;
}

export interface DiceRollerItemNumber extends DiceRollerItem {
  readonly type: DiceRollerItemType.Number;
  value: number;
}

export enum DiceRollerSide {
  Base = "base",
  Right = "right",
}

export enum DiceRollerOperator {
  Plus = "plus",
  Minus = "minus",
}

export enum DiceRollerComparison {
  Superior = ">",
  Inferior = "<",
}

export enum DiceRollerItemType {
  Dice = "dice",
  Number = "number",
}

export enum DiceRollFunction {
  Advantage = "adv",
  Disadvantage = "disadv",
  Explosive = "expl",
  ExplosiveAdd = "expladd",
}

export enum DiceRollerVisibility {
  Visible = "visible",
  Gm = "gm",
  GmOnly = "gmonly",
}

export type DiceDimension = 4 | 6 | 8 | 10 | 12 | 20 | 100;
