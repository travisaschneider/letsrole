export enum DiceType {
  Number = "number",
  Dice = "dice",
  Comparison = "comparison",
}

export interface DiceIcon {
  pack: string;
  path: string;
}

export enum DiceVisibility {
  Normal = "visible",
  Gm = "gm",
  GmOnly = "gmonly",
}

export interface SingleDiceResult {
  dimension: number;
  value: number;
  discarded: boolean;
}

export interface RawDiceResult {
  type: DiceType;
  total: number;
  tags: string[];
  children: RawDiceResult[];
  size?: number; // dice type
  dimension?: number; // dice type
  values?: number[]; // dice type
  discarded?: number[]; // dice type
  left?: RawDiceResult; // comparison type
  right?: RawDiceResult; // comparison type
  success?: number; // comparison type
  failure?: number; // comparison type
}
