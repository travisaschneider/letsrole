import { injectable } from "inversify";
import { Stage } from "../../Stage";
import { container } from "../../../DependencyInjection/Container";
import { Services } from "../../../DependencyInjection/Services";

export class Vector {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export interface Segment {
  p1: Vector;
  p2: Vector;
}

@injectable()
export class Collision {
  private static readonly COLLISION_ITERATIONS = 5;

  protected segments: Segment[];
  protected stage: Stage;
  protected enabled: boolean = false;

  public constructor() {
    this.stage = container.get<Stage>(Services.Stage);
  }

  public setSegments(array: number[][][]) {
    this.segments = [];

    array.forEach((entry) => {
      this.segments.push({
        p1: new Vector(entry[0][0], entry[0][1]),
        p2: new Vector(entry[1][0], entry[1][1]),
      });
    });
  }

  public resetSegments() {
    this.segments = [];
  }

  public apply(currentPos: Vector, globalTargetPos: Vector, radius: number): Vector {
    const targetPos = this.stage.toLocalPosition(globalTargetPos.x, globalTargetPos.y);

    if (!this.segments.length || !this.enabled) {
      return targetPos;
    }

    const moveVector = new Vector(
      targetPos.x - currentPos.x,
      targetPos.y - currentPos.y
    );

    const moveDistance = Math.sqrt(
      moveVector.x * moveVector.x + moveVector.y * moveVector.y
    );

    let result: Vector = {
      x: currentPos.x,
      y: currentPos.y,
    };

    if (moveDistance > 0) {
      // Normalize the movement direction
      const moveDir = new Vector(
        moveVector.x / moveDistance,
        moveVector.y / moveDistance
      );

      // Try to move in the desired direction first
      let bestPosition = new Vector(currentPos.x, currentPos.y);
      let blockingSegment = null;

      // Find the maximum distance we can move without hitting a wall
      let maxDistance = moveDistance;

      // Check each wall segment for intersection with our movement path
      for (const segment of this.segments) {
        const steps = Math.max(
          1,
          Math.ceil(moveDistance / (radius * 0.5))
        );

        for (let step = 1; step <= steps; step++) {
          const testDistance = (step / steps) * moveDistance;
          if (testDistance >= maxDistance) break;

          const testPos = new Vector(
            currentPos.x + moveDir.x * testDistance,
            currentPos.y + moveDir.y * testDistance
          );

          const collision = this.getCollisionResponse(
            testPos,
            radius,
            segment
          );
          if (collision) {
            maxDistance = Math.max(0, testDistance - radius);
            blockingSegment = segment;
            break;
          }
        }
      }

      // Move as far as possible in the desired direction
      const actualMoveDistance = Math.min(maxDistance, moveDistance);
      bestPosition.x = currentPos.x + moveDir.x * actualMoveDistance;
      bestPosition.y = currentPos.y + moveDir.y * actualMoveDistance;

      // If we hit a wall and still have remaining movement, try sliding along it
      if (actualMoveDistance < moveDistance && blockingSegment) {
        const remainingDistance = moveDistance - actualMoveDistance;

        // Calculate the wall direction (tangent to the wall)
        const wallVector = new Vector(
          blockingSegment.p2.x - blockingSegment.p1.x,
          blockingSegment.p2.y - blockingSegment.p1.y
        );
        const wallLength = Math.sqrt(
          wallVector.x * wallVector.x + wallVector.y * wallVector.y
        );

        if (wallLength > 0) {
          // Normalize wall direction
          const wallDir = new Vector(
            wallVector.x / wallLength,
            wallVector.y / wallLength
          );

          // Project remaining movement onto the wall direction
          const slideComponent = moveDir.x * wallDir.x + moveDir.y * wallDir.y;
          const slideDir = new Vector(
            wallDir.x * slideComponent,
            wallDir.y * slideComponent
          );
          const slideLength = Math.sqrt(
            slideDir.x * slideDir.x + slideDir.y * slideDir.y
          );

          if (slideLength > 0.1) {
            // Only slide if there's meaningful movement
            // Normalize slide direction
            slideDir.x /= slideLength;
            slideDir.y /= slideLength;

            // Try sliding along the wall
            const slideDistance = remainingDistance * slideLength;
            let maxSlideDistance = slideDistance;

            // Check if sliding movement hits other walls
            for (const segment of this.segments) {
              if (segment === blockingSegment) continue;

              const slideSteps = Math.max(
                1,
                Math.ceil(slideDistance / (radius * 0.5))
              );

              for (let step = 1; step <= slideSteps; step++) {
                const testSlideDistance = (step / slideSteps) * slideDistance;
                if (testSlideDistance >= maxSlideDistance) break;

                const testPos = new Vector(
                  bestPosition.x + slideDir.x * testSlideDistance,
                  bestPosition.y + slideDir.y * testSlideDistance
                );

                const collision = this.getCollisionResponse(
                  testPos,
                  radius,
                  segment
                );
                if (collision) {
                  maxSlideDistance = Math.max(
                    0,
                    testSlideDistance - radius
                  );
                  break;
                }
              }
            }

            // Apply the sliding movement
            const actualSlideDistance = Math.min(
              maxSlideDistance,
              slideDistance
            );
            bestPosition.x += slideDir.x * actualSlideDistance;
            bestPosition.y += slideDir.y * actualSlideDistance;
          }
        }
      }

      result = {
        x: bestPosition.x,
        y: bestPosition.y,
      };

      // Apply iterative collision resolution for any remaining overlap
      for (let i = 0; i < Collision.COLLISION_ITERATIONS; i++) {
        let wasCollision = false;
        for (const segment of this.segments) {
          const lightPos = new Vector(result.x, result.y);
          const pushVector = this.getCollisionResponse(
            lightPos,
            radius,
            segment
          );

          if (pushVector) {
            result.x += pushVector.x;
            result.y += pushVector.y;
            wasCollision = true;
          }
        }
        if (!wasCollision) break;
      }
    }

    return result;
  }

  private getCollisionResponse(
    circleCenter: Vector,
    circleRadius: number,
    segment: Segment
  ) {
    const p1 = segment.p1;
    const p2 = segment.p2;
    const c = circleCenter;
    const p1c = new Vector(c.x - p1.x, c.y - p1.y);
    const p1p2 = new Vector(p2.x - p1.x, p2.y - p1.y);
    const lenSq = p1p2.x * p1p2.x + p1p2.y * p1p2.y;
    let t = 0;
    if (lenSq > 0) {
      const dot = p1c.x * p1p2.x + p1c.y * p1p2.y;
      t = Math.max(0, Math.min(1, dot / lenSq));
    }
    const closestPoint = new Vector(p1.x + t * p1p2.x, p1.y + t * p1p2.y);
    const distVec = new Vector(c.x - closestPoint.x, c.y - closestPoint.y);
    const distSq = distVec.x * distVec.x + distVec.y * distVec.y;
    if (distSq < circleRadius * circleRadius) {
      const distance = Math.sqrt(distSq);
      if (distance === 0) {
        const normal = new Vector(-(p2.y - p1.y), p2.x - p1.x);
        const mag = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        return new Vector(normal.x / mag, normal.y / mag);
      }
      const penetrationDepth = circleRadius - distance;
      const pushVector = new Vector(
        (distVec.x / distance) * penetrationDepth,
        (distVec.y / distance) * penetrationDepth
      );
      return pushVector;
    }
    return null;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled() {
    return this.enabled;
  }
}
