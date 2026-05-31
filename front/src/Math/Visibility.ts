interface Point {
  x: number;
  y: number;
}

interface EndPoint extends Point {
  begin: boolean;
  segment: Segment;
  angle: number;
  visualize: boolean;
}

interface Segment {
  p1: EndPoint;
  p2: EndPoint;
  d: number;
}

export class Visibility {
  public segments: Segment[] = [];
  public endpoints: EndPoint[] = [];
  public center: Point = {
    x: 0,
    y: 0,
  };

  public open: Segment[] = [];
  public output: Point[] = [];
  public intersections: Point[][] = [];
  public maxVisibility = 10000;

  public addWall(x1: number, y1: number, x2: number, y2: number) {
    const p1: EndPoint = {
      x: x1,
      y: y1,
      segment: null,
      visualize: true,
      begin: false,
      angle: 0,
    };

    const p2: EndPoint = {
      x: x2,
      y: y2,
      segment: null,
      visualize: false,
      begin: false,
      angle: 0,
    };

    const segment: Segment = {
      p1: p1,
      p2: p2,
      d: 0,
    };

    p1.segment = segment;
    p2.segment = segment;

    this.segments.push(segment);
    this.endpoints.push(p1);
    this.endpoints.push(p2);
  }

  public setLightLocation(x: number, y: number) {
    this.center.x = x;
    this.center.y = y;

    for (const i in this.segments) {
      const segment = this.segments[i];

      const dx = 0.5 * (segment.p1.x + segment.p2.x) - x;
      const dy = 0.5 * (segment.p1.y + segment.p2.y) - y;

      segment.d = dx * dx + dy * dy;
      segment.p1.angle = Math.atan2(segment.p1.y - y, segment.p1.x - x);
      segment.p2.angle = Math.atan2(segment.p2.y - y, segment.p2.x - x);

      let da = segment.p2.angle - segment.p1.angle;

      if (da <= -Math.PI) {
        da += 2 * Math.PI;
      } else if (da > Math.PI) {
        da -= 2 * Math.PI;
      }

      segment.p1.begin = da > 0.0;
      segment.p2.begin = !segment.p1.begin;
    }
  }

  protected compare(a: EndPoint, b: EndPoint): number {
    if (a.angle > b.angle) {
      return 1;
    }

    if (a.angle < b.angle) {
      return -1;
    }

    if (!a.begin && b.begin) {
      return 1;
    }

    if (a.begin && !b.begin) {
      return -1;
    }

    return 0;
  }

  protected leftOf(s: Segment, p: Point): boolean {
    const cross =
      (s.p2.x - s.p1.x) * (p.y - s.p1.y) - (s.p2.y - s.p1.y) * (p.x - s.p1.x);

    return cross < 0;
  }

  protected interpolate(p: Point, q: Point, f: number): Point {
    return {
      x: p.x * (1 - f) + q.x * f,
      y: p.y * (1 - f) + q.y * f,
    };
  }

  protected inFrontOf(a: Segment, b: Segment, relativeTo: Point): boolean {
    const a1 = this.leftOf(a, this.interpolate(b.p1, b.p2, 0.01));
    const a2 = this.leftOf(a, this.interpolate(b.p2, b.p1, 0.01));
    const a3 = this.leftOf(a, relativeTo);

    const b1 = this.leftOf(b, this.interpolate(a.p1, a.p2, 0.01));
    const b2 = this.leftOf(b, this.interpolate(a.p2, a.p1, 0.01));
    const b3 = this.leftOf(b, relativeTo);

    if (b1 === b2 && b2 !== b3) {
      return true;
    }

    if (a1 === a2 && a2 === a3) {
      return true;
    }

    if (a1 === a2 && a2 != a3) {
      return false;
    }

    if (b1 === b2 && b2 === b3) {
      return false;
    }

    this.intersections.push([a.p1, a.p2, b.p1, b.p2]);

    return false;
  }

  public sweep() {
    this.output = [];
    this.intersections = [];
    this.endpoints.sort(this.compare);
    this.open = [];

    let beginAngle = 0.0;

    for (let pass = 0; pass < 2; pass++) {
      for (const i in this.endpoints) {
        const p = this.endpoints[i];
        const currentOld = this.open.length > 0 ? this.open[0] : null;

        if (p.begin) {
          let node: Segment = null;

          for (const j in this.open) {
            node = this.open[j];

            if (!this.inFrontOf(p.segment, node, this.center)) {
              break;
            }
          }

          if (node === null) {
            this.open.push(p.segment);
          } else {
            this.insertBefore(this.open, node, p.segment);
          }
        } else {
          this.removeElement(this.open, p.segment);
        }

        const currentNew = this.open.length > 0 ? this.open[0] : null;

        if (currentOld !== currentNew) {
          if (pass === 1) {
            this.addTriangle(beginAngle, p.angle, currentOld);
          }

          beginAngle = p.angle;
        }
      }
    }

    return this.output;
  }

  public lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point {
    const s: number =
      ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) /
      ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y));

    return {
      x: p1.x + s * (p2.x - p1.x),
      y: p1.y + s * (p2.y - p1.y),
    };
  }

  protected addTriangle(angle1: number, angle2: number, segment?: Segment) {
    const p1: Point = this.center;
    const p2: Point = {
      x: this.center.x + Math.cos(angle1),
      y: this.center.y + Math.sin(angle1),
    };
    const p3: Point = {
      x: 0,
      y: 0,
    };
    const p4: Point = {
      x: 0,
      y: 0,
    };

    if (segment !== null) {
      p3.x = segment.p1.x;
      p3.y = segment.p1.y;
      p4.x = segment.p2.x;
      p4.y = segment.p2.y;
    } else {
      p3.x = this.center.x + Math.cos(angle1) * this.maxVisibility;
      p3.y = this.center.y + Math.sin(angle1) * this.maxVisibility;
      p4.x = this.center.x + Math.cos(angle2) * this.maxVisibility;
      p4.y = this.center.y + Math.sin(angle2) * this.maxVisibility;
    }

    const begin = this.lineIntersection(p3, p4, p1, p2);
    p2.x = this.center.x + Math.cos(angle2);
    p2.y = this.center.y + Math.sin(angle2);

    const end = this.lineIntersection(p3, p4, p1, p2);

    this.output.push(begin);
    this.output.push(end);
  }

  protected insertBefore(arr: any[], node: any, entry) {
    const index = arr.indexOf(node);
    arr.splice(index, 0, entry);
  }

  protected removeElement(arr: any[], node: any) {
    const index = arr.indexOf(node);

    if (index > -1) {
      arr.splice(index, 1);
    }
  }
}
