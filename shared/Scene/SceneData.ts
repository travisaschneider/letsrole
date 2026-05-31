import {DrawingItem} from "../DrawingsData";
import {JournalIcon} from "../Journal";

export const CharacterColors = {
  red: "#c61b09",
  orange: "#fa6900",
  yellow: "#f8ca00",
  green: "#7ab317",
  cyan: "#00b4ff",
  lightblue: "#1869d2",
  blue: "#0b2e59",
  magenta: "#bd1550",
  pink: "#fe6196",
};

export interface SceneData {
  width: number;
  height: number;
  backgroundColor: string;
  layers: SceneLayers;
  grid: SceneGrid;
  metrics: SceneMetrics;
  fog?: SceneFog;
  lighting?: SceneLighting;
  playlistId?: number;
  segments?: number[][][]; // computed
  segmentsUpdated?: boolean; // computed
}

export interface SceneMetrics {
  baseCount: number;
  baseType: SceneMetricsBase;
  equalCount: number;
  equalType: SceneMetricsType;
  customType?: string;
}

export enum SceneMetricsBase {
  Unit = "unit",
  Pixel = "pixel",
}

export enum SceneMetricsType {
  Foot = "ft",
  Meter = "m",
  Mile = "mile",
  Millimeter = "mm",
  Kilometer = "km",
  Centimeter = "cm",
  Inch = "in",
  Yard = "yd",
  Parsec = "parsec",
  NauticalMile = "nmile",
  LightYear = "ly",
  AstronomicalUnit = "au",
  Node = "node",
  Custom = "custom",
  League = "lea",
  Movement = "mov",
}

export interface SceneFog {
  enabled: boolean;
  points: any[];
}

export interface SceneLighting {
  enabled: boolean;
  collisionsEnabled: boolean;
  characterRange: number;
  walls?: SceneLightingWall[];
  lights?: SceneLightingLight[];
  doors?: SceneLightingDoor[];
}

export interface SceneLightingWall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SceneLightingLight {
  id: string;
  x: number;
  y: number;
  range?: number;
  intensity?: number;
  color?: string;
  template?: LightTemplate;
  options?: {
    [attribute: string]: string | number | boolean;
  };
}

export enum LightTemplate {
  Default = "default",
  Fire = "fire",
  Emergency = "emergency",
  Party = "party",
  Alert = "alert",
}

export interface SceneLightingDoor {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  closed: boolean;
  gm: boolean;
  knob?: {
    x: number;
    y: number;
  };
}

export enum SceneGridType {
  Square = "square",
  Hex = "hex",
}

export interface SceneGrid {
  enabled: boolean;
  type: SceneGridType;
  size: number;
  color: string;
  opacity: number;
  snap: boolean;
}

export const DefaultSceneGrid: SceneGrid = {
  enabled: false,
  type: SceneGridType.Square,
  size: 100,
  color: "#000000",
  opacity: 0.7,
  snap: true,
};

export const DefaultSceneMetrics: SceneMetrics = {
  baseCount: 1,
  baseType: SceneMetricsBase.Unit,
  equalCount: 5,
  equalType: SceneMetricsType.Foot,
};

export const DefaultSceneFog: SceneFog = {
  enabled: false,
  points: [],
};

export const DefaultSceneData: SceneData = {
  width: 1920,
  height: 1080,
  backgroundColor: "#ffffff",
  layers: {},
  grid: DefaultSceneGrid,
  metrics: DefaultSceneMetrics,
  fog: DefaultSceneFog,
};

export const DefaultLighting: SceneLighting = {
  characterRange: 1200,
  lights: [],
  doors: [],
  walls: [],
  enabled: true,
  collisionsEnabled: false
};

export const DefaultLight: Partial<SceneLightingLight> = {
  color: "#eedd82",
  range: 450,
  intensity: 0.8,
};

interface SceneLayers {
  [key: string]: SceneLayer;
}

export interface LayerDrawingItems {
  [items: string]: DrawingItem;
}

export interface SceneLayer {
  key: string;
  name: string;
  locked: boolean;
  token: boolean;
  visible: boolean;
  gm: boolean;
  lighting: boolean;
  drawings?: boolean;
  position: number;
  items: LayerItems;
  drawingItems?: LayerDrawingItems;
}

export const DefaultSceneLayer: SceneLayer = {
  key: "",
  name: "New layer",
  locked: false,
  token: false,
  gm: false,
  lighting: false,
  visible: true,
  items: null,
  position: 0,
};

export const TokenAuraColors = [
  "#424242",
  "#a81e14",
  "#e0810d",
  "#d6d315",
  "#52d615",
  "#149694",
  "#2b38cc",
  "#83179c",
  "#d914b1",
  "#db8686",
  "#cadb86",
  "#86dbb9",
  "#86cadb",
  "#ab86db",
  "#db86c7",
  "#ffffff",
];

export const TokenBarColors = [
  "#a81e14",
  "#e0810d",
  "#d6d315",
  "#23b923",
  "#149694",
  "#2b38cc",
  "#83179c",
  "#d914b1",
  "#ffffff",
];

interface LayerItems {
  [key: string]: LayerItem;
}

export enum LayerItemType {
  Image = "image",
  Token = "token",
  Craft = "craft",
  Journal = "journal",
}

export interface LayerItem {
  type: LayerItemType;
  key: string;
  name?: string;
  x: number;
  y: number;
  zIndex: number;
  controls?: number[]; // array of users ids
  userId?: number; // user who added the element
  node?: any;
}

export interface ImageItem extends LayerItem {
  path: string;
  id: any;
  width: number;
  height: number;
  partner?: boolean;
  unlocked?: boolean;
  transformation?: Transformation;
}

export interface TokenItem extends ImageItem {
  character: TokenItemCharacter;
  frame?: string;
  color?: string;
  aura?: TokenAura;
  bars?: TokenBars;
  visionRange?: number;
  emitsLight?: boolean;
  emittedLightColor?: string;
}

export interface CraftItem extends ImageItem {
  craft: TokenItemCraft;
  color?: string;
  aura?: TokenAura;
  bars?: TokenBars;
  data?: any;
}

export interface JournalItem extends ImageItem {
  keyid: string;
  icon?: JournalIcon;
}

export interface TokenItemCharacter {
  id: number;
  name: string;
}

export interface TokenItemCraft {
  id: number;
  keyid: string;
  name: string;
}

export interface TokenAuraIcon {
  pack: string;
  path: string;
}

export interface TokenAura {
  text: string;
  color?: string;
  icons?: TokenAuraIcon[];
  shared?: boolean;
}

export interface TokenBars {
  bar1?: TokenBar;
  bar2?: TokenBar;
}

export interface TokenBar {
  enabled: boolean;
  shared: boolean;
  valueType: TokenBarType;
  value: any;
  maxType: TokenBarType;
  max: any;
  color: string;
  connected: boolean;
  connectedId: string;
  connectedValue: string;
  connectedMax: string;
}

export enum TokenBarType {
  Custom = "custom",
  Linked = "linked",
}

export interface Transformation {
  scale: number;
  rotation: number;
  x: number;
  y: number;
}

export interface PersistedToken {
  aura?: TokenAura;
  bars?: TokenBars;
}
