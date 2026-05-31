export interface Token {
  id?: string;
  table_id: string;
  user_id: number;
  role: string;
  table_user_id: number;
  locale: string;
  character_id?: number;
  dice_skin_id?: string;
  table_skin_id?: string;
  generated_at?: number;
  dice?: {
    id: number;
    name: string;
    path: string;
  };
}
