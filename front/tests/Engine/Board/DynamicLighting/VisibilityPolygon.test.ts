import { VisibilityPolygon } from "../../../../src/Engine/Board/DynamicLighting/VisibilityPolygon";

describe("Segment intersections", () => {
    test("Simple intersection", () => {
        const a = { x: 0, y: 0 };
        const b = { x: 1, y: 1 };
        const c = { x: 0, y: 1 };
        const d = { x: 1, y: 0 };

        const intersection = VisibilityPolygon.doLineSegmentsIntersect(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
        expect(intersection).toStrictEqual(true);
    });

    test("No intersection", () => {
        const a = { x: 0, y: 0 };
        const b = { x: 0, y: 1 };
        const c = { x: 1, y: 0 };
        const d = { x: 1, y: 1 };

        const intersection = VisibilityPolygon.doLineSegmentsIntersect(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y);
        expect(intersection).toStrictEqual(false);
    });
});