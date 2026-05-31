export interface BasicUser {
  id: number;
  chatname: string;
  role: ClientRole;
  username: string;
  characters?: BasicCharacter[];
}

export interface BasicCharacter {
  id: number;
  name: string;
  avatar?: string;
}

export enum ClientRole {
  Player = "player",
  Gm = "gm",
  Observer = "observer",
  Builder = "builder",
}
