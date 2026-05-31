import {
  SceneData,
  SceneLightingLight,
} from "../../../../../shared/Scene/SceneData";
import { LightAttribute } from "./LightAttribute";
import { DynamicLighting, VisibilitySource } from "../../DynamicLighting";
import Konva from "konva";
import Context = Konva.Context;
import { VisibilityPolygon } from "../VisibilityPolygon";
import { EventDispatcher } from "../../../../Event/EventDispatcher";
import { Events } from "../../../../Event/Events";
import KonvaEventObject = Konva.KonvaEventObject;

export abstract class Light {
  public static readonly key: string;
  public readonly attributes: LightAttribute[] = [];

  public id: string;
  public content: Konva.Group;
  public mask: any;
  public configuration: SceneLightingLight;
  public isTokenLight = false;

  public asGm = false;

  protected isLoaded = false;
  protected isDeleted = false;
  protected lighting: DynamicLighting;
  protected image: Konva.Image;

  protected isDragging = false;
  protected dragInterval: any;

  public static getDisplayName(): string {
    return "?";
  }

  public constructor(
    lighting: DynamicLighting,
    configuration: SceneLightingLight,
    tokenLight = false
  ) {
    this.lighting = lighting;
    this.configuration = configuration;
    this.id = this.configuration.id;
    this.isTokenLight = tokenLight;
  }

  public setPosition(position: Konva.Vector2d) {
    this.configuration.x = position.x;
    this.configuration.y = position.y;
    this.content.setPosition(position);
  }

  public abstract update();

  public disable() {
    this.content.listening(false);
  }

  protected setupShadows(sceneData: SceneData) {
    if (!sceneData.segments) {
      return;
    }

    this.content.clipFunc((ctx: CanvasRenderingContext2D) => {
      const position: number[] = [this.configuration.x, this.configuration.y];
      const visibility: number[][] = VisibilityPolygon.compute(
        position,
        sceneData.segments
      );

      const dec: Konva.Vector2d = {
        x: -this.configuration.x + this.configuration.range / 2,
        y: -this.configuration.y + this.configuration.range / 2,
      };

      ctx.beginPath();
      ctx.moveTo(visibility[0][0] + dec.x, visibility[0][1] + dec.y);

      for (let n = 0; n < visibility.length; n += 1) {
        ctx.lineTo(visibility[n][0] + dec.x, visibility[n][1] + dec.y);
      }

      ctx.closePath();
    });
  }

  /*protected startDrag() {
        this.isDragging = true;

        this.dragInterval = setInterval(() => {
            const position: Vector2Like = this.lighting.getStage().toLocalPosition(
                this.getScene().input.x,
                this.getScene().input.y
            );

            if (position.x === this.configuration.x && position.y === this.configuration.y) {
                return;
            }

            this.setPosition(position);

            EventDispatcher.emit(Events.LIGHTING_MOVE_LIGHT, {
                light: this
            });
        }, 1000/30);
    }

    protected stopDrag() {
        clearInterval(this.dragInterval);
        this.isDragging = false;
    }*/

  protected initEvents() {
    if (!this.asGm) {
      return;
    }

    if (this.isTokenLight) {
      return;
    }

    this.content.listening(true);
    this.content.draggable(true);

    //const r: number = this.configuration.range;

    /*this.image.hitFunc(function (context: Context) {
            context.beginPath();
            context.arc(0, 0, r + 10, 0, Math.PI * 2, true);
            context.closePath();
            context.fillStrokeShape(this);
        });*/

    this.content.on("mouseenter", (event) => {
      this.lighting.highlightLight(this);
      document.body.style.cursor = "pointer";
    });

    this.content.on("mouseleave", (event) => {
      this.lighting.clearTools();
      document.body.style.cursor = "default";
    });

    this.content.on("mousedown", (evt) => {
      evt.cancelBubble = true;
      /*
            if (this === this.lighting.selectedLight) {
                this.content.draggable(true);
                this.content.startDrag(evt);
            } else {

            }
             */

      EventDispatcher.emit(Events.LIGHTING_SELECT_LIGHT, {
        light: this,
      });
    });

    this.content.on("dragstart", (evt: KonvaEventObject<DragEvent>) => {
      EventDispatcher.emit(Events.LIGHTING_LIGHT_START_DRAG, {
        light: this,
      });
    });

    this.content.on("dragmove", (evt: KonvaEventObject<any>) => {
      this.configuration.x = this.content.x();
      this.configuration.y = this.content.y();

      EventDispatcher.emit(Events.LIGHTING_MOVE_LIGHT, {
        light: this,
      });
    });

    this.content.on("dragend", (evt: KonvaEventObject<DragEvent>) => {
      EventDispatcher.emit(Events.LIGHTING_LIGHT_END_DRAG, {
        light: this,
      });
    });

    /*element.on('pointerdown', (pointer: Pointer, localX: number, localY: number, event: any) => {
            event.stopPropagation();

            if (this === this.lighting.selectedLight) {
                this.startDrag();

                document.addEventListener('mouseup', () => {
                    this.stopDrag();
                }, {
                    once: true
                });
            } else {
                EventDispatcher.emit(Events.LIGHTING_SELECT_LIGHT, {
                    light: this
                });
            }
        });

*/
  }

  public onMoveStart() {
    this.content.filters([]);
    this.content.clearCache();
  }

  public onMoveEnd() {
    this.applyTint();
  }

  protected applyTint() {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    };

    const rgb: any = hexToRgb(this.configuration.color);

    if (!rgb) {
      return null;
    }

    this.content.cache();
    this.content.filters([Konva.Filters.RGB]);

    this.content.red(rgb.r);
    this.content.blue(rgb.b);
    this.content.green(rgb.g);
  }

  public abstract render(
    sceneData: SceneData
  ): Promise<Konva.Image | Konva.Group>;
  protected abstract load(): Promise<void>;

  public destroy(): void {
    this.content.destroy();
    this.isDeleted = true;
  }

  public setAsGm(asGm: boolean) {
    this.asGm = asGm;
  }

  public lock() {
    this.content.listening(false);
  }

  public unlock() {
    this.content.listening(true);
  }
}
