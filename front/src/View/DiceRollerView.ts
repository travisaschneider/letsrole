import { injectable } from "inversify";
import { View } from "./View";
import { PopinManager } from "./Popin/PopinManager";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { Popin } from "./Popin/Popin";
import { Template } from "./Template";
import { DiceCount, DiceRollerBuilder } from "./Dice/DiceRollerBuilder";
import {
  DiceDimension,
  DiceRoller,
  DiceRollerComparison,
  DiceRollerSide,
  DiceRollerVisibility,
  DiceRollFunction,
} from "../../shared/DiceRoller";
import { ChatEmitter } from "../Emitter/ChatEmitter";
import { Emitters } from "../DependencyInjection/Emitters";
import { EventDispatcher } from "../Event/EventDispatcher";
import { CharacterState } from "../State/CharacterState";
import { States } from "../DependencyInjection/State";

@injectable()
export class DiceRollerView extends View {
  protected static readonly MaxValue: number = 999;
  protected static readonly MinValue: number = -999;

  public open(config?: DiceRollerConfig): Popin {
    if (!config) {
      config = {
        type: DiceRollerConfigType.Chat,
      };
    }

    const popin: Popin = this.getPopinManager().create({
      id: "dice-roller-" + (Math.random() + 1).toString(36).substring(7),
      title: this.__("Roll Maker"),
      html: Template.render("dice/roller/calculator.html.njk", {
        type: config.type,
      }),
      width: 260,
      minWidth: 260,
      height: 350,
      minHeight: 350,
      canDock: false,
      canMinimize: false,
      className: "dice-roller-popin",
      icon: "fas fa-dice",
    });

    popin.on("init", () => {
      popin.getjQueryElement().find(".node a[title]").tooltip({
        container: document.body,
        placement: "top",
        boundary: "window",
        trigger: "hover",
        animation: false,
      });

      let builder: DiceRollerBuilder = new DiceRollerBuilder();
      let source: DiceRoller = {
        visibility: DiceRollerVisibility.Visible,
        base: [],
      };
      let func: DiceRollFunction = null;
      let side: DiceRollerSide = DiceRollerSide.Base;

      const renderInput: HTMLInputElement = popin
        .getElement()
        .querySelector(".roll-render");

      const rollBtn: HTMLAnchorElement = popin
        .getElement()
        .querySelector(".roll");

      rollBtn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        const formula: string = builder.renderFormula(source);

        if (config.type === DiceRollerConfigType.Chat) {
          let cid: number = null;

          if (this.getCharacterState().isEnabled()) {
            cid = this.getCharacterState()?.sheet?.character?.id;
          }

          EventDispatcher.emit("roll", {
            expression: formula,
            title: null,
            visibility: source.visibility,
            cid: cid,
          });
        } else {
          if (config.callback) {
            config.callback(formula, source.visibility);
          }

          popin.close(true);
        }
      });

      const apply = () => {
        builder.save(source);
        updateDiceCount();
        render();
      };

      const render = () => {
        renderInput.value = builder.render(source);
      };

      const applySourceToCalculator = () => {
        visibilityPicker.value = source.visibility;
      };

      const updateValueInputClass = () => {
        valueInput.classList.remove("tiny", "small", "normal", "big");
        const val: number = parseInt(valueInput.value, 10);

        if (val >= -9 && val <= 9) {
          return valueInput.classList.add("big");
        }

        if (val < -9 && val > -100) {
          return valueInput.classList.add("small");
        }

        if (val <= -100) {
          return valueInput.classList.add("tiny");
        }

        if (val > 10) {
          return valueInput.classList.add("small");
        }
      };

      const clearValueInput = () => {
        valueInput.value = "0";
        updateValueInputClass();
      };

      const clearFunc = () => {
        func = null;

        popin
          .getElement()
          .querySelectorAll('a[data-action="func"]')
          .forEach((node: HTMLAnchorElement) => {
            node.classList.remove("active");
          });
      };

      const updateDiceCount = () => {
        const counts: DiceCount = builder.extractDiceCount(source, side);
        const cnt: HTMLElement = popin.getElement().querySelector(".dice-grid");
        cnt
          .querySelectorAll(`[data-action="dice"] .count`)
          .forEach((counter: HTMLElement) => {
            counter.classList.remove("active");
            counter.textContent = "";
          });

        for (const dimension in counts) {
          const count: number = counts[dimension];

          if (count > 0) {
            const elt: HTMLElement = cnt.querySelector(
              `[data-action="dice"][data-value="${dimension}"] .count`
            );

            if (elt) {
              elt.textContent = count.toString(10);
              elt.classList.add("active");
            }
          }
        }
      };

      const updateValue = () => {
        updateValueInputClass();

        let val: number = parseInt(valueInput.value, 10);

        if (val < DiceRollerView.MinValue) {
          val = DiceRollerView.MinValue;
          valueInput.value = val.toString(10);
        }

        if (val > DiceRollerView.MaxValue) {
          val = DiceRollerView.MaxValue;
          valueInput.value = val.toString(10);
        }

        builder.addValue(source, side, val);
        apply();
      };

      const visibilityPicker: HTMLSelectElement = popin
        .getElement()
        .querySelector(".visibility-picker");

      const nodes: NodeListOf<HTMLAnchorElement> = popin
        .getElement()
        .querySelectorAll(".node a");

      const valueInput: HTMLInputElement = popin
        .getElement()
        .querySelector(".value-node input");

      const quickBarBtn: HTMLAnchorElement = popin
        .getElement()
        .querySelector('.node a[data-action="quickbar"]');

      quickBarBtn.addEventListener("dragstart", (e: DragEvent) => {
        e.dataTransfer.setData("source", "dice-roller");
        e.dataTransfer.setData("type", "formula");
        e.dataTransfer.setData("formula", builder.renderFormula(source));
        e.dataTransfer.setData("visibility", source.visibility);
      });

      valueInput.addEventListener("keyup", () => updateValue());
      valueInput.addEventListener("change", () => updateValue());

      nodes.forEach((node: HTMLAnchorElement) => {
        node.addEventListener("click", (e: MouseEvent) => {
          e.preventDefault();

          const action: NodeAction = node.dataset.action as NodeAction;

          switch (action) {
            case NodeAction.Dice: {
              const dimension: DiceDimension = parseInt(
                node.dataset.value,
                10
              ) as DiceDimension;

              builder.addDice(source, side, dimension, func);

              clearFunc();
              apply();
              break;
            }

            case NodeAction.Func: {
              const choosenFunc: DiceRollFunction = node.dataset
                .func as DiceRollFunction;

              if (choosenFunc === func) {
                clearFunc();
              } else {
                node.classList.add("active");
                func = choosenFunc;
              }

              break;
            }

            case NodeAction.Undo: {
              const previous: DiceRoller = builder.undo();

              if (previous === null) {
                source = {
                  visibility: DiceRollerVisibility.Visible,
                  base: [],
                };
              } else {
                source = previous;
              }

              applySourceToCalculator();
              apply();

              break;
            }

            case NodeAction.Clear: {
              source = {
                visibility: DiceRollerVisibility.Visible,
                base: [],
              };

              clearFunc();
              clearValueInput();
              applySourceToCalculator();

              side = DiceRollerSide.Base;
              builder = new DiceRollerBuilder();

              apply();

              break;
            }

            case NodeAction.Compare: {
              if (!source.comparison) {
                side = DiceRollerSide.Right;
                source[side] = [];
              }

              source.comparison = node.dataset.value as DiceRollerComparison;

              clearFunc();
              clearValueInput();
              apply();

              break;
            }

            case NodeAction.Value: {
              let val: number = parseInt(valueInput.value, 10);

              if (!Number.isInteger(val)) {
                val = 0;
              }

              const type: MoreLess = node.dataset.type as MoreLess;

              if (type === MoreLess.Less) {
                val--;
              } else {
                val++;
              }

              valueInput.value = val.toString(10);
              updateValue();

              break;
            }

            case NodeAction.Copy: {
              const cnt: HTMLElement = popin
                .getElement()
                .querySelector(".dice-roller");

              navigator.clipboard
                .writeText(builder.render(source))
                .then(() => {
                  const msg: HTMLDivElement = document.createElement("div");
                  msg.classList.add("msg-success");
                  msg.textContent = this.__("Copied to the clipboard!");

                  cnt.insertAdjacentElement("afterbegin", msg);

                  setTimeout(() => {
                    msg.remove();
                  }, 2000);
                })
                .catch(() => {
                  const msg: HTMLDivElement = document.createElement("div");
                  msg.classList.add("msg-error");
                  msg.textContent = this.__("Unable to copy to the clipboard.");

                  cnt.insertAdjacentElement("afterbegin", msg);

                  setTimeout(() => {
                    msg.remove();
                  }, 2000);
                });
              break;
            }
          }
        });
      });

      visibilityPicker.addEventListener("change", () => {
        source.visibility = visibilityPicker.value as DiceRollerVisibility;
        apply();
      });

      apply();
    });

    popin.open();

    return popin;
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getChatEmitter(): ChatEmitter {
    return container.get<ChatEmitter>(Emitters.Chat);
  }

  protected getCharacterState(): CharacterState {
    return container.get<CharacterState>(States.Character);
  }
}

enum NodeAction {
  Dice = "dice",
  Undo = "undo",
  Func = "func",
  Clear = "clear",
  Compare = "compare",
  Value = "value",
  Copy = "copy",
}

enum MoreLess {
  More = "more",
  Less = "less",
}

export interface DiceRollerConfig {
  type: DiceRollerConfigType;
  callback?(formula: string, visibility: DiceRollerVisibility): void;
}

export enum DiceRollerConfigType {
  Chat = "chat",
  QuickBar = "quickbar",
}
