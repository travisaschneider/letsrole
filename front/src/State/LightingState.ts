import { injectable } from "inversify";
import { LayerItemType, TokenItem } from "../../shared/Scene/SceneData";
import { UserState } from "./UserState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { SceneState } from "./SceneState";
import { Scene } from "../Entity/Scene";
import { CharacterState } from "./CharacterState";
import { DynamicLightingView } from "../View/DynamicLightingView";
import { Views } from "../DependencyInjection/Views";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import Konva from "konva";

export interface ActiveTokens {
  tokens: TokenItem[];
  isDefault?: boolean;
}

export interface LightingLockState {
  global: boolean;
  doors: boolean;
}

@injectable()
export class LightingState {
  public isSimulating = false;

  protected simulatingPosition: Konva.Vector2d = {
    x: 0,
    y: 0,
  };

  public getStoredLockState(): LightingLockState {
    const state: LightingLockState = {
      global: false,
      doors: false,
    };

    const storedData: string = localStorage.getItem(this.getLockStateKey());

    if (storedData) {
      try {
        const stored: LightingLockState = JSON.parse(storedData);

        return stored;
      } catch (e) {
        // corruption :( ?
      }
    }

    return state;
  }

  public storeLockState(state: LightingLockState) {
    localStorage.setItem(this.getLockStateKey(), JSON.stringify(state));
  }

  protected getLockStateKey(): string {
    const tableId: string = window["architect"].table;

    return `dl-lock-${tableId}`;
  }

  public getActiveTokens(): ActiveTokens {
    const scene: Scene = this.getSceneState().scene;

    if (this.getUserState().isGm()) {
      if (this.isSimulating) {
        return {
          tokens: [
            {
              x: this.simulatingPosition.x,
              y: this.simulatingPosition.y,
              key: "light-simulation",
              id: 0,
              character: {
                id: 0,
                name: "Simulating",
              },
              path: null,
              zIndex: 999,
              type: LayerItemType.Token,
              height: 200,
              width: 200,
              visionRange: 100000,
            },
          ],
          isDefault: false,
        };
      }

      const selected: TokenItem = this.getDynamicLightingView().selectedToken;

      if (selected) {
        return {
          tokens: [selected],
          isDefault: false,
        };
      }

      return {
        tokens: scene.findCharacterTokens(),
        isDefault: true,
      };
    } else {
      const sheet: CharacterSheet = this.getCharacterState().sheet;

      if (sheet) {
        return {
          tokens: scene.findCharacterTokens(sheet.character.id),
          isDefault: false,
        };
      }
    }

    return {
      tokens: [],
      isDefault: true,
    };
  }

  public setSimulatingPosition(x: number, y: number) {
    this.simulatingPosition = {
      x: x,
      y: y,
    };
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }

  protected getCharacterState(): CharacterState {
    return container.get<CharacterState>(States.Character);
  }

  protected getDynamicLightingView(): DynamicLightingView {
    return container.get<DynamicLightingView>(Views.DynamicLighting);
  }
}
