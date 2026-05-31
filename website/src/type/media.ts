export interface Media {
  id?: string;
  path: string;
  folder_id?: number;
  user_id?: number;
  filename: string;
  size: number;
  is_avatar: boolean;
  is_token: boolean;
  mime: string;
  metadata?: any;
  type?: string;
  created_at?: string;
}
