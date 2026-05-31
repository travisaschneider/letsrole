export enum DrawingToolType {
  Free = "free",
  Line = "line",
  Rect = "rect",
  Circle = "circle",
  Polygon = "polygon",
  FreePolygon = "freepolygon",
  Arrow = "arrow",
  Text = "text",
  PoI = "poi",
  Erase = "erase",
}

export const DrawingToolNames: any = {
  free: "Free Drawing",
  line: "Line",
  rect: "Rectangle",
  circle: "Circle",
  polygon: "Polygon",
  freepolygon: "Free Polygon",
  arrow: "Arrow",
  text: "Text",
  poi: "Point of Interest",
};

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingItemTransform {
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface DrawingItem {
  position: DrawingPoint;
  key: string;
  type: DrawingToolType;
  zIndex: number;
  node?: any; // runtime
  container?: any; // runtime
  userId?: number;
  controls: number[]; // array of user id
  transform?: DrawingItemTransform;
  layerKey?: string;
}

export interface DrawingLineItem extends DrawingItem {
  to?: DrawingPoint;
  color: string;
  weight: number;
}

export interface DrawingRectItem extends DrawingItem {
  width?: number;
  height?: number;
  borderColor: string;
  fillColor: string;
  weight: number;
  radius: number;
  texture: string;
}

export interface DrawingFreeItem extends DrawingItem {
  points: number[];
  weight: number;
  color: string;
}

export interface DrawingCircleItem extends DrawingItem {
  radius?: DrawingPoint;
  borderColor: string;
  fillColor: string;
  weight: number;
  texture: string;
}

export interface DrawingPolygonItem extends DrawingItem {
  borderColor: string;
  fillColor: string;
  weight: number;
  sides: number;
  radius?: number;
  rotation?: number;
  texture: string;
}

export interface DrawingArrowItem extends DrawingItem {
  to?: DrawingPoint;
  color: string;
  weight: number;
  arrowSize: number;
  begin: boolean;
}

export interface DrawingTextItem extends DrawingItem {
  width?: number;
  height?: number;
  color: string;
  font: string;
  size: number;
  text: string;
  isDrawing: boolean;
}

export interface DrawingFreePolygonItem extends DrawingItem {
  points: number[];
  borderColor: string;
  fillColor: string;
  weight: number;
  texture: string;
  smooth: boolean;
  ended: boolean;
}

export enum DrawingPoIColor {
  Red = "red",
  Pink = "pink",
  Blue = "blue",
  LightBlue = "lightblue",
  Green = "green",
  Yellow = "yellow",
  Orange = "orange",
  Grey = "grey",
}

export interface DrawingPoIItem extends DrawingItem {
  color: DrawingPoIColor;
  title: string;
  description: string;
}
