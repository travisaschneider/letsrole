export interface FolderData {
  id: number;
  parent_id: number | null;
  user_id: number;
  name: string | null;
  sharing: JournalSharing;
  folders?: FolderData[];
  pages?: PageData[];
}

export interface PageData {
  id: number;
  author_id: number;
  folder_id: number | null;
  title: string;
  tags: string[];
  created_at: number;
  keyid: string;
  content?: string;
  sharing: JournalSharing;
  type: JournalType;
  icon: JournalIcon;
  media?: {
    id: string;
    path: string;
  };
}

export enum JournalIcon {
  Page = "page",
  Note = "note",
  Person = "person",
  Place = "place",
  Clue = "clue",
}

export enum JournalType {
  Editor = "editor",
  Pdf = "pdf",
}

export enum JournalPermission {
  Read = "r",
  Write = "w",
  None = "n",
}

export interface JournalSharing {
  table?: JournalPermission;
  users?: {
    [userId: number]: JournalPermission;
  };
}
