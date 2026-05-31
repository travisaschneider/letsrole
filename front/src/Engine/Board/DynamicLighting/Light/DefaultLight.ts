import { Light } from "./Light";
import {
  DefaultLighting,
  LightTemplate,
  SceneData,
} from "../../../../../shared/Scene/SceneData";
import { Template } from "../../../../View/Template";
import { LightAttribute } from "./LightAttribute";
import { ImageLoader } from "../../../../Loader/ImageLoader";
import Konva from "konva";

export class DefaultLight extends Light {
  public static readonly key: string = LightTemplate.Default;
  protected static Image: Konva.Image;

  public readonly attributes: LightAttribute[] = [
    LightAttribute.Range,
    LightAttribute.Intensity,
    LightAttribute.Color,
  ];

  public static getDisplayName(): string {
    return Template.__("Default");
  }

  public update() {
    this.image.setSize({
      width: this.configuration.range,
      height: this.configuration.range,
    });

    this.content.offset({
      x: this.image.width() / 2,
      y: this.image.height() / 2,
    });

    this.content.globalCompositeOperation("hard-light");

    if (this.configuration.intensity) {
      this.content.opacity(this.configuration.intensity);
    }
  }

  public render(sceneData: SceneData): Promise<Konva.Image | Konva.Group> {
    return this.load()
      .then(() => {
        this.content = new Konva.Group();
        this.image = DefaultLight.Image.clone();
        this.image.perfectDrawEnabled(false);
        this.image.listening(true);

        this.content.add(this.image);

        this.content.setPosition({
          x: this.configuration.x,
          y: this.configuration.y,
        });

        this.update();
        this.setupShadows(sceneData);
        this.applyTint();
        this.initEvents();
      })
      .then(() => {
        return this.content;
      });
  }

  protected load(): Promise<void> {
    if (DefaultLight.Image) {
      return Promise.resolve();
    }

    return new Promise((resolve: Function, reject: Function) => {
      ImageLoader.load("/assets/img/light.png", {}, (image: Konva.Image) => {
        DefaultLight.Image = image;

        return resolve();
      });
    });
  }
}
