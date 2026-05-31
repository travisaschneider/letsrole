import { SceneData } from "./SceneData";

export interface ScenePack {
  id: number;
  title: string;
  author?: string;
  thumb_path: string;
  url?: string;
  published_at: number;
  is_active: boolean;
  publisher_id?: number;
  added_at?: number;
  scenes?: PackScene[];
}

export interface PackScene {
  id: number;
  pack_id: number;
  title: string;
  data?: SceneData;
  position?: number;
  metadata?: PackSceneMetadata;
  thumb_path: string;
}

export interface PackSceneMetadata {
  width?: number;
  height?: number;
  lighting?: boolean;
}
