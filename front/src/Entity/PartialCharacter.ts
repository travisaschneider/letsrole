export interface PartialCharacter {
  id: number;
  userId: number;
  name: string;
  avatar?: string;
  token?: string;
  color?: string;
  skin?: string;
  avatar_frame?: string; // path to the skin
  token_frame?: string; // path to the skin
  idle?: boolean;
}
