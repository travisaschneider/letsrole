import { SceneLightingDoor } from "../../../../shared/Scene/SceneData";
import { ImageLoader } from "../../../Loader/ImageLoader";
import { EventDispatcher } from "../../../Event/EventDispatcher";
import { Events } from "../../../Event/Events";
import Konva from "konva";
import { View } from "../../../View/View";

export class Door extends Konva.Group {
  protected static closedLoaded = false;
  protected static openLoaded = false;
  protected static editLoaded = false;

  protected static openImage: Konva.Image;
  protected static closedImage: Konva.Image;
  protected static editImage: Konva.Image;

  protected static ratio = 1;

  protected configuration: SceneLightingDoor;
  protected circle: Konva.Circle;
  protected knob: Konva.Image;

  protected editCircle: Konva.Circle;
  protected editButton: Konva.Image;

  public doorId: string;

  public init(configuration: SceneLightingDoor, asGm: boolean) {
    this.configuration = configuration;
    this.doorId = configuration.id;

    Door.load().then(() => {
      if (!this.shouldDisplayKnob(asGm)) {
        return;
      }

      const image: Konva.Image = this.configuration.closed
        ? Door.closedImage
        : Door.openImage;

      const radius = this.getRatioedSize(42, 10, 42);
      const knobSize = this.getRatioedSize(64, 16, 64);

      this.circle = new Konva.Circle({
        x: 0,
        y: 0,
        radius: radius,
        fill: "rgba(0, 0, 0, 0.3)",
        listening: true,
        perfectDrawEnabled: false,
      });

      this.knob = image.clone();
      this.knob.size({
        width: knobSize,
        height: knobSize,
      });
      this.knob.offset({
        x: knobSize / 2,
        y: knobSize / 2,
      });

      this.add(this.circle);
      this.add(this.knob);

      this.knob.on("mouseenter", () => {
        document.body.style.cursor = "pointer";
        this.circle.fill(View.getPrimarySkinColor());
      });

      this.knob.on("mouseleave", () => {
        document.body.style.cursor = "default";
        this.circle.fill("rgba(0, 0, 0, 0.3)");
      });

      this.knob.on("mouseup", () => {
        EventDispatcher.emit(Events.LIGHTING_DOOR_ACTION, {
          action: this.configuration.closed
            ? DoorAction.Open
            : DoorAction.Close,
          door: this.configuration,
        });
      });

      if (asGm) {
        this.addEditButton();
      }
    });
  }

  protected addEditButton() {
    const offset: Konva.Vector2d = {
      x: this.getRatioedSize(45, 20, 45),
      y: this.getRatioedSize(35, 15, 35),
    };

    const size = this.getRatioedSize(25, 12, 25);

    this.editCircle = new Konva.Circle({
      x: offset.x,
      y: offset.y,
      radius: size,
      fill: "rgba(0, 0, 0, 0.3)",
      listening: true,
    });

    this.editButton = Door.editImage.clone();

    this.editButton.listening(false);
    this.editButton.setSize({
      width: size,
      height: size,
    });

    this.editButton.setPosition({
      x: offset.x,
      y: offset.y,
    });

    this.editButton.offset({
      x: size / 2,
      y: size / 2,
    });

    this.add(this.editCircle);
    this.add(this.editButton);

    this.editCircle.on("mouseenter", () => {
      document.body.style.cursor = "pointer";
      this.editCircle.fill(View.getPrimarySkinColor());
    });

    this.editCircle.on("mouseleave", () => {
      document.body.style.cursor = "default";
      this.editCircle.fill("rgba(0, 0, 0, 0.3)");
    });

    this.editCircle.on("mouseup", () => {
      EventDispatcher.emit(Events.LIGHTING_SELECT_DOOR, {
        door: this.configuration,
      });
    });
  }

  protected shouldDisplayKnob(asGm: boolean): boolean {
    if (!this.configuration.gm) {
      return true;
    }

    return this.configuration.gm && asGm;
  }

  public open() {
    this.configuration.closed = false;

    if (this.knob) {
      this.knob.image(Door.openImage.image());
    }
  }

  public close() {
    this.configuration.closed = true;

    if (this.knob) {
      this.knob.image(Door.closedImage.image());
    }
  }

  public static setMapWidth(width: number) {
    this.ratio = width / 3500;
  }

  protected getRatioedSize(size, min, max) {
    let ratioed: number = size * Door.ratio;
    if (ratioed > max) ratioed = max;
    if (ratioed < min) ratioed = min;

    return ratioed;
  }

  protected static load(): Promise<void> {
    if (Door.closedLoaded && Door.openLoaded && Door.editLoaded) {
      return Promise.resolve();
    }

    return new Promise((resolve: Function, reject: Function) => {
      ImageLoader.load(this.getDoorImageUrl(), {}, (image: Konva.Image) => {
        Door.openLoaded = true;
        Door.openImage = image;

        if (Door.closedLoaded && Door.editLoaded) {
          return resolve();
        }
      });

      ImageLoader.load(
        this.getClosedDoorImageUrl(),
        {},
        (image: Konva.Image) => {
          Door.closedLoaded = true;
          Door.closedImage = image;

          if (Door.editLoaded && Door.openLoaded) {
            return resolve();
          }
        }
      );

      ImageLoader.load(
        "/assets/img/door-edit.png",
        {},
        (image: Konva.Image) => {
          Door.editLoaded = true;
          Door.editImage = image;

          if (Door.closedLoaded && Door.openLoaded) {
            return resolve();
          }
        }
      );
    });
  }

  protected static getDoorImageUrl(): string {
    return this.getCssUrl("--opened-door-url");
  }

  protected static getClosedDoorImageUrl(): string {
    return this.getCssUrl("--closed-door-url");
  }

  protected static getCssUrl(variable: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .replace('url("', "")
      .replace('")', "");
  }
}

export enum DoorAction {
  Open = "open",
  Close = "close",
}
