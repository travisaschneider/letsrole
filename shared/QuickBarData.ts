import { JournalIcon } from "./Journal";

export interface QuickBarIcon {
  pack: string;
  id?: string;
  path?: string;
}

export interface QuickBarSound {
  id: number;
  path: string;
  title: string;
}

export interface QuickBarItem {
  id: string;
  position: number;
  icon?: QuickBarIcon;
  sound?: QuickBarSound;
}

export enum CustomActionType {
  Normal = "visible",
  Gm = "gm",
  GmOnly = "gmonly",
}

export interface QuickBarJournalItem extends QuickBarItem {
  journalKey: string;
  title: string;
  journalIcon?: JournalIcon;
}

export type QuickBarSoundItem = QuickBarItem;

export interface QuickBarSheetItem extends QuickBarItem {
  path: string;
  characterId?: number;
  craftId?: number;
}

export interface QuickBarCustomItem extends QuickBarItem {
  title: string;
  formula: string;
  type: CustomActionType;
}

export interface QuickBarItemList {
  [id: string]: QuickBarCustomItem | QuickBarSheetItem | QuickBarSoundItem;
}
