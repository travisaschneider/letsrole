import { SceneImage } from "../Engine/SceneImage";
import { CustomActionType } from "../../shared/QuickBarData";
import { QuickBarIcon } from "../../shared/QuickBarData";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { DiceIcon } from "../../shared/DiceData";

export class Events {
  public static readonly WINDOW_RESIZE = "window-resize";
  public static readonly WINDOW_BLUR = "window-blur";
  public static readonly WINDOW_FOCUS = "window-focus";

  public static readonly BOARD_CHANGE = "board-change";
  public static readonly BOARD_CLICK = "board-click";
  public static readonly BOARD_UNSELECT = "board-unselect";
  public static readonly BOARD_SCALE_CHANGE = "board-scale-change";
  public static readonly BOARD_IS_ANIMATED = "board-animated";

  public static readonly RULER_MOUSEDOWN = "ruler-mousedown";
  public static readonly PING = "ping";

  public static readonly SCENE_ITEM_DROP = "scene-item-add";
  public static readonly SCENE_ITEM_DRAGSTART = "scene-item-dragstart";
  public static readonly SCENE_ITEM_DRAGMOVE = "scene-item-dragmove";
  public static readonly SCENE_ITEM_MOVE = "scene-item-move";
  public static readonly SCENE_ITEM_MULTI_MOVE = "scene-item-multi-move";
  public static readonly SCENE_ITEM_DRAGEND = "scene-item-dragend";
  public static readonly SCENE_ITEM_SELECT = "scene-item-select";
  public static readonly SCENE_ITEM_GROUP_SELECT = "scene-item-group-select";
  public static readonly SCENE_ITEM_DELETE = "scene-item-delete";
  public static readonly SCENE_ITEM_MULTI_DELETE = "scene-item-multi-delete";
  public static readonly SCENE_ITEM_ZINDEX = "scene-item-zindex";
  public static readonly SCENE_ITEM_TRANSFORM = "scene-item-transform";
  public static readonly SCENE_ITEM_TRANSFORM_END = "scene-item-transform-end";
  public static readonly SCENE_ITEM_INITIALIZED = "scene-item-initialized";
  public static readonly SCENE_ITEM_PASTE = "scene-item-paste";
  public static readonly SCENE_ITEM_CONTROL = "scene-item-control";
  public static readonly SCENE_ITEM_ADAPT = "scene-item-adapt";
  public static readonly SCENE_ITEM_IMAGE_ADAPT = "scene-item-image-adapt";
  public static readonly SCENE_ITEM_BAR_VALUE = "scene-item-bar-value";
  public static readonly SCENE_ITEM_BAR_SET_VALUE = "scene-item-bar-set-value";
  public static readonly SCENE_ITEM_CHANGE_LAYER = "scene-item-change-layer";
  public static readonly SCENE_ITEM_MULTI_CHANGE_LAYER =
    "scene-item-multi-change-layer";

  public static readonly SCENE_UPDATE_METRICS = "scene-update-metrics";
  public static readonly SCENE_AFTER_LOAD = "scene-after-load";
  public static readonly SCENE_UPDATE_FOG = "scene-update-fog";

  public static readonly LIGHTING_READY = "lighting-ready";
  public static readonly LIGHTING_SELECT_WALL = "lighting-select-wall";
  public static readonly LIGHTING_SELECT_DOOR = "lighting-select-door";
  public static readonly LIGHTING_SELECT_LIGHT = "lighting-select-light";
  public static readonly LIGHTING_MOVE_LIGHT = "light-move-light";
  public static readonly LIGHTING_LIGHT_START_DRAG = "light-light-start-drag";
  public static readonly LIGHTING_LIGHT_END_DRAG = "light-light-end-drag";
  public static readonly LIGHTING_DOOR_ACTION = "lighting-door-action";

  public static readonly DRAWING_DRAGMOVE = "drawing-dragmove";
  public static readonly DRAWING_DRAGEND = "drawing-dragend";
  public static readonly DRAWING_TRANSFORM_START = "drawing-transform-start";
  public static readonly DRAWING_TRANSFORM_END = "drawing-transform-end";
  public static readonly DRAWING_TRANSFORM = "drawing-transform";
  public static readonly DRAWING_SELECT = "drawing-select";
  public static readonly DRAWING_DELETE = "drawing-delete";
  public static readonly DRAWING_ZINDEX = "drawing-zindex";
  public static readonly DRAWING_CONTROL = "drawing-control";

  public static readonly TOKEN_SELECTED = "token-selected";
  public static readonly TOKEN_OPEN_AURA = "token-open-aura";
  public static readonly TOKEN_OPEN_BARS = "token-open-bars";

  public static readonly USER_ME_LOADED = "user-me-loaded";
  public static readonly CHARACTER_SHEET_LOADED = "character-sheet-loaded";

  public static readonly JOURNAL_OPEN = "journal-open";

  public static readonly LOADING_START = "loading-start";
  public static readonly LOADING_END = "loading-end";

  public static readonly CHAT_SAY = "chat-say";
  public static readonly CHAT_ADDED = "chat-add";
  public static readonly TABLE_RANDOM = "table-random";

  public static readonly CHARACTER_PERSIST = "character-persist";
  public static readonly CHARACTER_MULTI_PERSIST = "character-multi-persist";
  public static readonly CHARACTER_OPEN_SHEET = "character-open-sheet";
  public static readonly CHARACTER_COLOR_CHANGED = "character-color-changed";
  public static readonly CHARACTER_PROMPT = "character-prompt";
  public static readonly CHARACTER_SKIN = "character-skin";
  public static readonly CHARACTER_LOADED = "character-loaded";
  public static readonly CHARACTER_RELOAD_SHEET = "character-reload-sheet";

  public static readonly CRAFT_PERSIST = "craft-persist";
  public static readonly CRAFT_MULTI_PERSIST = "craft-multi-persist";
  public static readonly CRAFT_OPEN_SHEET = "craft-open-sheet";
  public static readonly CRAFT_SKIN = "craft-skin";

  public static readonly MEDIA_RELOAD = "media-reload";

  public static readonly MENU_UPDATE = "menu-update";

  public static readonly SOUND_PLAYLIST_RELOAD = "sound-playlist-reload";
}

export interface BoardEvent {
  item: SceneImage;
}

export interface SceneItemMultiDeleteEvent {
  items: Set<SceneImage>;
}

export interface SceneItemMultiMoveEvent {
  items: Array<{
    item: SceneImage;
    x: number;
    y: number;
  }>;
}

export interface SceneItemMultiChangeLayerEvent {
  layerKey: string;
  items: Set<SceneImage>;
}

export interface SceneItemDragMoveEvent extends BoardEvent {
  x: number;
  y: number;
  diffX?: number;
  diffY?: number;
}

export interface RollEvent {
  expression: string;
  sheet?: CharacterSheet;
  title?: string;
  visibility?: CustomActionType;
  cid?: number;
  icon?: DiceIcon;
  actions?: any;
}

export interface SceneAdaptEvent {
  item: SceneImage;
}
