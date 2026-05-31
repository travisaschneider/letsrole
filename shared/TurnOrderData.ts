export interface TurnOrderData {
  open: boolean;
  direction: TurnOrderDirection;
  items: TurnOrderItem[];
}

export enum TurnOrderDirection {
  Asc = "asc",
  Desc = "desc",
  Unknow = "unknow",
}

export interface TurnOrderItem {
  name: string;
  value: number;
  gm: boolean;
  character?: number;
  craft?: number;
  token?: string;
  avatar?: string;
  color?: string;
}

export const DefaultTurnOrderData: TurnOrderData = {
  direction: TurnOrderDirection.Unknow,
  open: false,
  items: [],
};

export const DefaultTurnOrderItem: TurnOrderItem = {
  name: "Name",
  value: 0,
  gm: false,
};
