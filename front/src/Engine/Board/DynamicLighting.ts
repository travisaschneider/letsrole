import {
  DefaultLighting,
  LightTemplate,
  SceneData,
  SceneLighting,
  SceneLightingDoor,
  SceneLightingLight,
  SceneLightingWall,
  TokenItem,
} from "../../../shared/Scene/SceneData";
import { Board } from "../Board";
import { container } from "../../DependencyInjection/Container";
import { Services } from "../../DependencyInjection/Services";
import { Stage } from "../Stage";
import { EventDispatcher } from "../../Event/EventDispatcher";
import { Events } from "../../Event/Events";
import { Light } from "./DynamicLighting/Light/Light";
import { getLightClass } from "./DynamicLighting/Light/LightTemplates";
import { Door, DoorAction } from "./DynamicLighting/Door";
import { UserState } from "../../State/UserState";
import { States } from "../../DependencyInjection/State";
import { VisibilityPolygon } from "./DynamicLighting/VisibilityPolygon";
import { SceneImage } from "../SceneImage";
import Konva from "konva";
import { View } from "../../View/View";
import { Collision } from "./DynamicLighting/Collision";

export class DynamicLighting extends Konva.Group {
  protected static readonly WallColor: string = "#222222";

  public overlayAlpha = 0.75;

  public shadowLayer: Konva.Layer;

  protected locked = false;
  protected doorsLocked = false;
  public selectedLight: Light;

  protected overlay: Konva.Group;
  protected overlayRange: Konva.Group;

  protected range: Konva.Group;
  protected shadowLayerRange: Konva.Group;
  protected walls: Konva.Group;

  protected shadow: Konva.Group;

  protected lightsContainer: Konva.Group;
  protected lights: Light[] = [];

  protected doorsContainer: Konva.Group;
  protected topDoorsContainer: Konva.Group;
  protected doors: Door[] = [];

  protected board: Board; // cache
  protected stage: Stage; // cache

  protected tools: Konva.Group;

  protected lightAddedTime: number;

  public init(isGm = false) {
    if (!isGm) {
      this.overlayAlpha = 1;
    }
  }

  protected initTools() {
    if (!this.tools) {
      this.tools = new Konva.Group();
      this.add(this.tools);
    }
  }

  public unselect() {
    this.selectedLight = null;

    this.clearTools();
  }

  public clearTools() {
    this.initTools();

    this.tools.removeChildren();
  }

  public highlightLight(light: Light) {
    this.clearTools();

    this.tools.add(
      new Konva.Circle({
        x: light.configuration.x,
        y: light.configuration.y,
        radius: light.configuration.range / 2,
        stroke: View.getPrimarySkinColor(),
        strokeWidth: 5,
        strokeEnabled: true,
        listening: false,
      })
    );
  }

  public addDoor(door: SceneLightingDoor) {
    if (!door.knob || !door.knob.x || !door.knob.y) {
      door.knob = {
        x: (door.x1 + door.x2) / 2,
        y: (door.y1 + door.y2) / 2,
      };
    }

    const doorObject: Door = new Door({
      x: door.knob.x,
      y: door.knob.y,
    });
    doorObject.init(door, this.isUserGm());

    this.doorsContainer.add(doorObject);
    this.doors.push(doorObject);
  }

  public removeDoor(doorId: string) {
    for (const i in this.doors) {
      if (this.doors[i].doorId === doorId) {
        this.doors[i].destroy();
        this.doors.splice(Number(i), 1);
        return;
      }
    }
  }

  public clear() {
    this.clearTools();
    this.clearLightsCache();

    if (this.shadow) this.shadow.destroy();
    if (this.range) this.range.destroy();
    if (this.overlay) this.overlay.destroy();
    if (this.overlayRange) this.overlayRange.destroy();
    if (this.shadowLayerRange) this.shadowLayerRange.destroy();
    if (this.shadowLayer) this.shadowLayer.destroy();

    this.shadow = null;
    this.range = null;
    this.overlay = null;
    this.overlayRange = null;
    this.shadowLayer = null;
    this.shadowLayerRange = null;
  }

  public selectLight(light: Light) {
    this.selectedLight = light;
    this.displayLightSelection();
  }

  public displayLightSelection() {
    this.clearTools();

    this.tools.add(
      new Konva.Circle({
        x: this.selectedLight.configuration.x,
        y: this.selectedLight.configuration.y,
        radius: this.selectedLight.configuration.range / 2,
        strokeEnabled: true,
        stroke: View.getPrimarySkinColor(),
        strokeWidth: 5,
        listening: false,
      })
    );
  }

  public getLightInstance(id: string): Light {
    for (const light of this.lights) {
      if (light.id === id) {
        return light;
      }
    }

    return null;
  }

  protected selectItem(item: SceneLightingWall | SceneLightingDoor) {
    this.clearTools();

    this.tools.add(
      new Konva.Line({
        points: [item.x1, item.y1, item.x2, item.y2],
        strokeEnabled: true,
        listening: false,
        perfectDrawEnabled: false,
        strokeWidth: 10,
        stroke: View.getPrimarySkinColor(),
      })
    );
  }

  public selectWall(wall: SceneLightingWall) {
    this.unselect();
    this.selectItem(wall);
  }

  public selectDoor(door: SceneLightingDoor) {
    this.unselect();
    this.selectItem(door);
  }

  public drawToolDoor(from: Konva.Vector2d, to: Konva.Vector2d) {
    this.clearTools();

    this.tools.add(
      new Konva.Line({
        points: [from.x, from.y, to.x, to.y],
        strokeEnabled: true,
        listening: false,
        perfectDrawEnabled: false,
        strokeWidth: 5,
        stroke: View.getPrimarySkinColor(),
      })
    );
  }

  public drawToolWall(from: Konva.Vector2d, to: Konva.Vector2d) {
    this.clearTools();

    this.tools.add(
      new Konva.Line({
        points: [from.x, from.y, to.x, to.y],
        strokeEnabled: true,
        listening: false,
        perfectDrawEnabled: false,
        strokeWidth: 5,
        stroke: View.getPrimarySkinColor(),
      })
    );
  }

  public async updateTokenLight(
    sceneData: SceneData,
    token: TokenItem
  ): Promise<Light> {
    if (!sceneData.lighting || !sceneData.lighting.enabled) {
      return;
    }

    const lightId: string = "token-light-" + token.id.toString(10);

    if (!token.emitsLight) {
      for (const i in this.lights) {
        const light: Light = this.lights[i];

        if (light.id === lightId) {
          light.content.destroy();
          this.lights.splice(Number(i), 1);

          return Promise.resolve(null);
        }
      }

      return Promise.resolve(null);
    }

    const node: SceneImage = token.node;

    if (!node || !node.isInit) {
      return Promise.resolve(null);
    }

    let light: Light = this.getTokenLight(token);
    const center: Konva.Vector2d = node.getCenter();

    if (!light) {
      const LightClass: typeof Light | any = getLightClass(
        LightTemplate.Default
      );

      const configuration: SceneLightingLight = {
        x: token.x + center.x,
        y: token.y + center.y,
        template: LightTemplate.Default,
        id: lightId,
        range: this.getTokenVisionRange(sceneData, token),
        color: token.emittedLightColor ? token.emittedLightColor : null,
        intensity: 0.3,
      };

      light = new LightClass(this, configuration, true);

      return new Promise((resolve: Function, reject: Function) => {
        light.render(sceneData).then((content: Konva.Group | Konva.Image) => {
          if (this.getTokenLight(token)) {
            light.destroy();
            return resolve(null);
          }

          this.lightsContainer.add(content);
          this.lights.push(light);

          resolve(light);
        });
      });
    } else {
      light.configuration.x = token.x + center.x;
      light.configuration.y = token.y + center.y;
      light.configuration.range = this.getTokenVisionRange(sceneData, token);
      light.configuration.color = token.emittedLightColor
        ? token.emittedLightColor
        : null;

      this.updateLight(lightId, light.configuration, sceneData);

      return Promise.resolve(light);
    }
  }

  protected getTokenLight(token: TokenItem): Light {
    const id: string = "token-light-" + token.id.toString(10);

    for (const light of this.lights) {
      if (light.id === id) {
        return light;
      }
    }

    return null;
  }

  public updateLights(sceneData: SceneData) {
    if (!sceneData.lighting || !sceneData.lighting.enabled) {
      return;
    }

    const room: Konva.RectConfig = {
      x: 0,
      y: 0,
      width: sceneData.width,
      height: sceneData.height,
    };

    for (const light of this.lights) {
      if (light.content) {
        //light.content.active = true;
      }

      const source: VisibilitySource = {
        x: light.configuration.x,
        y: light.configuration.y,
        hasRange: true,
        range: light.configuration.range,
      };

      //this.drawVisibility([source], room, sceneData, light.shadow);
    }
  }

  public updateLight(
    id: string,
    light: SceneLightingLight,
    sceneData: SceneData,
    disabled = false
  ) {
    const room: Konva.RectConfig = {
      x: 0,
      y: 0,
      width: sceneData.width,
      height: sceneData.height,
    };

    for (const mapLight of this.lights) {
      if (mapLight.id === id) {
        mapLight.setPosition({
          x: light.x,
          y: light.y,
        });

        mapLight.update();

        if (disabled) {
          mapLight.disable();
        }

        if (mapLight === this.selectedLight) {
          this.displayLightSelection();
        }

        return;
      }
    }
  }

  public async displayLights(sceneData: SceneData): Promise<Light[]> {
    this.lightAddedTime = +new Date();
    const addedAt: number = this.lightAddedTime;

    const clear = () => {
      if (this.lightsContainer) {
        this.lightsContainer.destroy();

        for (const light of this.lights) {
          light.destroy();
        }

        this.lights = [];

        this.lightsContainer = null;
      }
    };

    if (
      !sceneData.lighting ||
      !sceneData.lighting.enabled ||
      !sceneData.lighting.lights
    ) {
      clear();
      return;
    }

    if (!this.lightsContainer) {
      this.lightsContainer = new Konva.Group();
      this.add(this.lightsContainer);
    }

    this.lightsContainer.removeChildren();

    for (const light of this.lights) {
      light.destroy();
    }

    this.lights = [];

    const added: Promise<Light>[] = [];

    for (const lightConfiguration of sceneData.lighting.lights) {
      const LightClass: typeof Light | any = getLightClass(
        lightConfiguration.template
      );

      const light: Light = new LightClass(this, lightConfiguration);
      light.setAsGm(this.isUserGm());

      const promise: Promise<Light> = new Promise<Light>(
        (resolve: Function, reject: Function) => {
          light
            .render(sceneData)
            .then((content: Konva.Image | Konva.Group) => {
              if (this.lightAddedTime !== addedAt) {
                light.destroy();
                return resolve(light);
              }

              this.lightsContainer.add(content);
              this.lights.push(light);

              return resolve(light);
            })
            .catch((e) => {
              return reject(e);
            });
        }
      );

      added.push(promise);
    }

    return Promise.all(added).then((lights: Light[]) => {
      this.enableLightsCache();

      return lights;
    });
  }

  public clearLightsCache() {
    //this.lightsContainer.clearCache();
  }

  public enableLightsCache() {
    if (!this.isUserGm()) {
      this.lightsContainer.listening(false);
    }
    //this.lightsContainer.cache();
  }

  public displayWalls(sceneData: SceneData) {
    if (!this.isUserGm()) {
      return;
    }

    const clear = () => {
      if (this.walls) {
        this.walls.destroy();
        this.walls = null;
      }
    };

    if (
      !sceneData.lighting ||
      !sceneData.lighting.enabled ||
      !sceneData.lighting.walls
    ) {
      clear();
      return;
    }

    if (!this.walls) {
      this.walls = new Konva.Group();
      this.add(this.walls);

      if (this.locked) {
        this.walls.listening(false);
      }
    }

    this.walls.removeChildren();

    const walls: SceneLightingWall[] = sceneData.lighting.walls;
    const doors: SceneLightingDoor[] = sceneData.lighting.doors;

    const segments: (SceneLightingDoor | SceneLightingWall)[] =
      walls.concat(doors);

    const weight = 5;
    const hitWidth = 40;

    for (const wall of segments) {
      const line: Konva.Line = new Konva.Line({
        x: 0,
        y: 0,
        points: [wall.x1, wall.y1, wall.x2, wall.y2],
        strokeWidth: weight,
        strokeEnabled: true,
        stroke: DynamicLighting.WallColor,
        hitStrokeWidth: hitWidth * 2,
        listening: true,
      });

      this.walls.add(line);

      line.on("mouseenter", () => {
        if (this.locked) {
          return;
        }

        line.stroke(View.getPrimarySkinColor());
        document.body.style.cursor = "pointer";
      });

      line.on("mouseleave", () => {
        if (this.locked) {
          return;
        }

        line.stroke(DynamicLighting.WallColor);
        document.body.style.cursor = "default";
      });

      line.on("mousedown", (event: any) => {
        if (this.locked) {
          return;
        }

        event.cancelBubble = true;

        if (wall.hasOwnProperty("closed")) {
          EventDispatcher.emit(Events.LIGHTING_SELECT_DOOR, {
            door: wall,
          });
        } else {
          EventDispatcher.emit(Events.LIGHTING_SELECT_WALL, {
            wall: wall,
          });
        }
      });
    }
  }

  protected findDoor(id: string): Door {
    for (const door of this.doors) {
      if (door.doorId === id) {
        return door;
      }
    }

    return null;
  }

  public doorAction(sceneData: SceneData, doorId: string, action: DoorAction) {
    const door: Door = this.findDoor(doorId);

    if (!door) {
      return;
    }

    if (action === DoorAction.Open) {
      door.open();
    } else {
      door.close();
    }
  }

  public displayDoors(sceneData: SceneData) {
    const clear = () => {
      if (this.doorsContainer) {
        this.doorsContainer.destroy();
        this.doors = [];
        this.doorsContainer = null;
      }
    };

    if (
      !sceneData.lighting ||
      !sceneData.lighting.enabled ||
      !sceneData.lighting.doors
    ) {
      clear();
      return;
    }

    Door.setMapWidth(sceneData.width);

    if (!this.doorsContainer) {
      this.doorsContainer = new Konva.Group();
      this.add(this.doorsContainer);

      if (this.doorsLocked) {
        this.doorsContainer.listening(false);
      }
    }

    if (!this.topDoorsContainer) {
      this.topDoorsContainer = new Konva.Group();
      this.add(this.topDoorsContainer);
    }

    this.topDoorsContainer.moveToTop();

    const doors: SceneLightingDoor[] = sceneData.lighting.doors;
    this.doors = [];

    for (const door of doors) {
      this.addDoor(door);
    }
  }

  public display(
    sources: VisibilitySource[],
    sceneData: SceneData,
    displayRange = true
  ) {
    if (!sceneData.lighting) {
      this.clear();
      return;
    }

    if (!sceneData.lighting.enabled) {
      this.clear();
      return;
    }

    if (!this.shadowLayer) {
      this.shadowLayer = new Konva.Layer();
      this.getBoard().addLightingShadow(this.shadowLayer);

      this.shadowLayer.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width: sceneData.width,
          height: sceneData.height,
          fill: "black",
          opacity: this.isUserGm() ? this.overlayAlpha : 1,
          listening: false,
        })
      );
    }

    if (!this.shadow) {
      this.shadow = new Konva.Group({
        globalCompositeOperation: "destination-out",
        listening: false,
      });

      this.shadowLayer.add(this.shadow);
    }

    if (!this.shadowLayerRange) {
      this.shadowLayerRange = new Konva.Group({
        listening: false,
        globalCompositeOperation: "destination-in",
      });

      this.shadowLayer.add(this.shadowLayerRange);
    }

    if (!this.range) {
      this.range = new Konva.Group({
        listening: false,
        globalCompositeOperation: "destination-in",
      });

      this.add(this.range);
    }

    if (this.topDoorsContainer) {
      this.topDoorsContainer.moveToTop();
    }

    this.range.removeChildren();
    this.shadowLayerRange.removeChildren();

    if (displayRange) {
      let n = 0;

      for (const source of sources) {
        if (source.hasRange) {
          const circle: Konva.Circle = new Konva.Circle({
            x: source.x,
            y: source.y,
            radius: source.range,
            fill: "#000000",
          });

          this.range.add(circle);
          this.shadowLayerRange.add(circle.clone());

          n++;
        }
      }

      if (n > 1) {
        this.range.cache({
          pixelRatio: 0.2,
          imageSmoothingEnabled: false,
        });

        this.shadowLayerRange.cache({
          pixelRatio: 0.2,
          imageSmoothingEnabled: false,
        });
      } else {
        this.range.clearCache();
        this.shadowLayerRange.clearCache();
      }
    }

    this.drawVisibility(sources, sceneData, this.shadow);
  }

  public prepareSegments(sceneData: SceneData): number[][][] {
    const lighting: SceneLighting = sceneData.lighting;

    if (!lighting) {
      return [];
    }

    let segments: number[][][] = [];

    if (lighting.walls && lighting.walls.length) {
      for (const wall of lighting.walls) {
        segments.push([
          [wall.x1, wall.y1],
          [wall.x2, wall.y2],
        ]);
      }
    }

    if (lighting.doors && lighting.doors.length) {
      for (const door of lighting.doors) {
        if (door.closed) {
          segments.push([
            [door.x1, door.y1],
            [door.x2, door.y2],
          ]);
        }
      }
    }

    // scene borders
    segments.push([
      [0, 0],
      [sceneData.width, 0],
    ]);
    segments.push([
      [sceneData.width, 0],
      [sceneData.width, sceneData.height],
    ]);
    segments.push([
      [0, sceneData.height],
      [sceneData.width, sceneData.height],
    ]);
    segments.push([
      [0, 0],
      [0, sceneData.height],
    ]);

    segments = VisibilityPolygon.breakIntersections(segments);

    sceneData.segments = segments;
    sceneData.segmentsUpdated = false;

    this.getCollision().setSegments(segments);

    return segments;
  }

  public drawVisibility(
    sources: VisibilitySource[],
    sceneData: SceneData,
    element: Konva.Group
  ) {
    if (!element) {
      return;
    }

    if (sceneData.segmentsUpdated) {
      this.prepareSegments(sceneData);
    }

    element.removeChildren();

    for (const source of sources) {
      const position: number[] = [source.x, source.y];
      const visibility: number[][] = VisibilityPolygon.compute(
        position,
        sceneData.segments
      );

      const points: number[] = [];
      points.push(visibility[0][0], visibility[0][1]);

      for (let n = 0; n < visibility.length; n += 1) {
        points.push(visibility[n][0], visibility[n][1]);
      }

      const path: Konva.Line = new Konva.Line({
        points: points,
        fillEnabled: true,
        fill: "white",
        closed: true,
        perfectDrawEnabled: false,
        listening: false,
      });

      this.shadow.add(path);
    }
  }

  public getTokenVisionRange(sceneData: SceneData, token: TokenItem): number {
    let range: number = DefaultLighting.characterRange;

    if (sceneData.lighting && sceneData.lighting.characterRange) {
      range = sceneData.lighting.characterRange;
    }

    if (token.visionRange) {
      range = token.visionRange;
    }

    return range;
  }

  public getBoard(): Board {
    if (!this.board) {
      this.board = container.get<Board>(Services.Board);
    }

    return this.board;
  }

  public getEngineStage(): Stage {
    if (!this.stage) {
      this.stage = container.get<Stage>(Services.Stage);
    }

    return this.stage;
  }

  public lock() {
    this.locked = true;

    if (this.walls) {
      this.walls.listening(false);
    }

    for (const light of this.lights) {
      light.lock();
    }
  }

  public unlock() {
    this.locked = false;

    if (this.walls) {
      this.walls.listening(true);
    }

    for (const light of this.lights) {
      light.unlock();
    }
  }

  public isLocked(): boolean {
    return this.locked;
  }

  public lockDoors() {
    this.doorsLocked = true;

    if (this.doorsContainer) {
      this.doorsContainer.listening(false);
    }
  }

  public unlockDoors() {
    this.doorsLocked = false;

    if (this.doorsContainer) {
      this.doorsContainer.listening(true);
    }
  }

  public isDoorsLocked(): boolean {
    return this.doorsLocked;
  }

  public isCollisionsEnabled(): boolean {
    return this.getCollision().isEnabled();
  }

  public enableCollisions() {
    this.getCollision().setEnabled(true);
  }

  public disableCollisions() {
    this.getCollision().setEnabled(false);
  }

  protected isUserGm(): boolean {
    return container.get<UserState>(States.User).isGm();
  }

  protected getCollision(): Collision {
    return container.get<Collision>(Services.Collision);
  }
}

export interface VisibilitySource {
  x: number;
  y: number;
  range: number;
  hasRange: boolean;
}

/*export interface CollisionLine {
    from: Vector2Like,
    to: Vector2Like
}*/
