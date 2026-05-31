import { CharacterColors } from "../../../shared/Scene/SceneData";
import Konva from "konva";

export class ToolLayer extends Konva.Group {
  protected groups: Map<number, Konva.Group> = new Map<number, Konva.Group>();

  public constructor(props?) {
    super(props);
  }

  protected getGroup(id: number): Konva.Group {
    if (this.groups.has(id)) {
      return this.groups.get(id);
    }

    const group = new Konva.Group({
      listening: false,
    });
    this.add(group);
    this.groups.set(id, group);

    return group;
  }

  public ping(position: Konva.Vector2d, user: string, color: string) {
    const group: Konva.Group = this.getGroup(-1);
    const colorItem: string = CharacterColors[color];
    const waves = 4;
    const waveDuration = 2000;
    const spacing: number = waveDuration / waves;
    const width = 125;
    const weight = 5;
    const totalDuration = 5000;
    const fadeoutAfter = 4000;
    const fadeInterval = totalDuration - fadeoutAfter;
    const starts: number[] = [];

    let circles: Konva.Circle[] = [];
    let globalFade = 0;

    const removeCircles = () => {
      circles.forEach((circle: Konva.Circle) => circle.remove());
      circles = [];
    };

    const animate = (time: number) => {
      if (!starts[0]) {
        starts[0] = time;
      }

      const t = time - starts[0];
      const step = t % waveDuration;
      const alpha = Math.max(
        (waveDuration - step) / waveDuration - globalFade,
        0
      );

      removeCircles();

      const circle = new Konva.Circle({
        strokeEnabled: true,
        strokeWidth: weight - (step / waveDuration) * weight,
        stroke: colorItem,
        x: position.x,
        y: position.y,
        radius: step / (waveDuration / width),
        opacity: alpha,
      });

      group.add(circle);
      circles.push(circle);

      for (let i = 1; i < waves + 1; i++) {
        if (step > spacing * i) {
          if (!starts[i]) {
            starts[i] = time;
          }
        }

        if (starts[i] > 0) {
          const subT = time - starts[i];
          const subStep = subT % waveDuration;

          if (subStep > 0) {
            const alpha = Math.max(
              (waveDuration - subStep) / waveDuration - globalFade,
              0
            );

            const circle = new Konva.Circle({
              strokeEnabled: true,
              strokeWidth: weight - (subStep / waveDuration) * weight,
              stroke: colorItem,
              opacity: alpha,
              x: position.x,
              y: position.y,
              radius: subStep / (waveDuration / width),
            });

            group.add(circle);
            circles.push(circle);
          }

          if (subT > waveDuration) {
            starts[i] = 0;
          }
        }
      }

      if (t > fadeoutAfter) {
        globalFade = 1 - (fadeInterval - (t - fadeoutAfter)) / fadeInterval;
      }

      if (t < totalDuration) {
        requestAnimationFrame(animate);
      } else {
        removeCircles();
      }
    };

    requestAnimationFrame(animate);
  }

  public getColorItem(name: string): string {
    return CharacterColors[name];
  }

  public empty(id: number): void {
    const group: Konva.Group = this.getGroup(id);
    group.setAttr("drawing", null);
    group.removeChildren();
    group.clearCache();
  }

  public drawArrows(id: number, points: number[], color: string) {
    const group: Konva.Group = this.getGroup(id);
    const colorItem: string = this.getColorItem(color);

    let arrow: Konva.Arrow = group.getAttr("drawing");

    if (!arrow) {
      arrow = new Konva.Arrow({
        points: points,
        stroke: colorItem,
        strokeWidth: 5,
      });

      group.add(arrow);
      group.setAttr("drawing", arrow);
    } else {
      arrow.points(points);
      arrow.stroke(colorItem);
    }
  }

  public drawWedge(
    id: number,
    position: Konva.Vector2d,
    angle: number,
    radius: number,
    rotation: number,
    color: string
  ) {
    const group: Konva.Group = this.getGroup(id);
    const colorItem: string = this.getColorItem(color);
    group.removeChildren();

    group.add(
      new Konva.Wedge({
        x: position.x,
        y: position.y,
        radius: radius,
        angle: angle,
        rotation: rotation,
        fill: colorItem,
        stroke: colorItem,
        strokeWidth: 3,
        opacity: 0.3,
      })
    );
  }

  public drawCircle(
    id: number,
    position: Konva.Vector2d,
    radius: number,
    color: string
  ) {
    const group: Konva.Group = this.getGroup(id);
    const colorItem: string = this.getColorItem(color);
    group.removeChildren();

    group.add(
      new Konva.Circle({
        x: position.x,
        y: position.y,
        radius: radius,
        fill: colorItem,
        stroke: colorItem,
        strokeWidth: 3,
        opacity: 0.3,
      })
    );
  }

  public drawRectangle(
    id: number,
    position: Konva.Vector2d,
    width: number,
    height: number,
    color: string
  ) {
    const group: Konva.Group = this.getGroup(id);
    const colorItem: string = this.getColorItem(color);
    group.removeChildren();

    group.add(
      new Konva.Rect({
        x: position.x,
        y: position.y,
        width: width,
        height: height,
        fill: colorItem,
        stroke: colorItem,
        strokeWidth: 3,
        opacity: 0.3,
        offset: {
          x: width / 2,
          y: height / 2,
        },
      })
    );
  }
}
