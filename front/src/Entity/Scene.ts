import {
  CraftItem,
  LayerItem,
  LayerItemType,
  SceneData,
  SceneLayer,
  SceneLightingDoor,
  SceneLightingLight,
  SceneLightingWall,
  TokenItem,
} from "../../shared/Scene/SceneData";
import Konva from "konva";
import Vector2d = Konva.Vector2d;

export class Scene {
  public id: number;
  public name: string;
  public data: SceneData;

  public get size(): Vector2d {
     return {
       x: this.data.width,
       y: this.data.height
     }
  }

  public convertUnitToPixel(unit: number) {
    if (this.data.grid.enabled) {
      return (this.data.grid.size * unit) / this.data.metrics.equalCount;
    } else {
      return (
        (this.data.metrics.baseCount * this.data.grid.size * unit) /
        this.data.metrics.equalCount
      );
    }
  }

  public convertPixelToUnit(pixels: number) {
    return (pixels / this.data.grid.size) * this.data.metrics.equalCount;
  }

  public findDoor(id: string): SceneLightingDoor {
    if (!this.data.lighting) {
      return null;
    }

    if (!this.data.lighting.doors) {
      return null;
    }

    for (const door of this.data.lighting.doors) {
      if (door.id === id) {
        return door;
      }
    }

    return null;
  }

  public findWall(id: string): SceneLightingWall {
    if (!this.data.lighting) {
      return null;
    }

    if (!this.data.lighting.walls) {
      return null;
    }

    for (const wall of this.data.lighting.walls) {
      if (wall.id === id) {
        return wall;
      }
    }

    return null;
  }

  public findLight(id: string): SceneLightingLight {
    if (!this.data.lighting) {
      return null;
    }

    if (!this.data.lighting.lights) {
      return null;
    }

    for (const light of this.data.lighting.lights) {
      if (light.id === id) {
        return light;
      }
    }

    return null;
  }

  public findByKey(key: string): LayerItem {
    for (const i in this.data.layers) {
      const layer: SceneLayer = this.data.layers[i];

      for (const j in layer.items) {
        if (layer.items[j].key === key) {
          return layer.items[j];
        }
      }
    }

    return null;
  }

  public findCharacterTokens(cid: number = null): TokenItem[] {
    const tokens: TokenItem[] = [];

    for (const i in this.data.layers) {
      const layer: SceneLayer = this.data.layers[i];

      for (const j in layer.items) {
        if (layer.items[j].type === LayerItemType.Token) {
          const item: TokenItem = layer.items[j] as TokenItem;

          if (cid !== null) {
            if (item.character.id == cid) {
              tokens.push(item);
            }
          } else {
            tokens.push(item);
          }
        }
      }
    }

    return tokens;
  }

  public findCraftTokens(cid: number): CraftItem[] {
    const tokens: CraftItem[] = [];

    for (const i in this.data.layers) {
      const layer: SceneLayer = this.data.layers[i];

      for (const j in layer.items) {
        if (layer.items[j].type === LayerItemType.Craft) {
          const item: CraftItem = layer.items[j] as CraftItem;

          if (item.craft.id == cid) {
            tokens.push(item);
          }
        }
      }
    }

    return tokens;
  }

  public getTokenLayer(): SceneLayer {
    for (const i in this.data.layers) {
      if (this.data.layers[i].token === true) {
        return this.data.layers[i];
      }
    }

    return null;
  }

  public getOrderedLayers(): SceneLayer[] {
    const layers = Object.keys(this.data.layers).map(
      (key) => this.data.layers[key]
    );

    layers.sort((a: SceneLayer, b: SceneLayer) => {
      return a.position < b.position ? -1 : 1;
    });

    return layers;
  }
}
