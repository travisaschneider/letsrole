import { View } from "./View";
import { injectable } from "inversify";
import { PopinManager } from "./Popin/PopinManager";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { Popin } from "./Popin/Popin";
import { TableState } from "../State/TableState";
import { States } from "../DependencyInjection/State";
import { TurnOrderData } from "../../shared/TurnOrderData";
import { UserState } from "../State/UserState";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { DockableView, ViewOpenMode } from "./DockableView";
import { MenuView } from "./MenuView";
import { Views } from "../DependencyInjection/Views";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { Template } from "./Template";
import { DiceTagEventDispatcher } from "../Event/DiceTagEventDispatcher";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { Repository } from "../DependencyInjection/Repository";
import { Cache } from "three";

@injectable()
export class TurnOrderView extends View {
  protected popin: Popin;
  protected taskBarItem: TaskBarItem;
  protected view: DockableView;

  public init() {
    super.init();

    this.taskBarItem = new TaskBarItem(
      this.__("Turn order"),
      "fas fa-sort-amount-down",
      TaskBarCategory.Main
    );

    EventDispatcher.on(Events.USER_ME_LOADED, () => {
      if (this.getUserState().isGm()) {
        this.view = new DockableView({
          id: "turn-order",
          title: this.__("Turn order"),
          html: Template.render("turn-order/container-gm.html.njk"),
          taskBarItem: this.taskBarItem,
          mode: ViewOpenMode.DockRight,
          header: Template.render("turn-order/header.html.njk"),
          icon: "fas fa-sort-amount-down",
          defaultConfiguration: {
            index: 6,
            hidden: false,
            minimized: true,
            mode: ViewOpenMode.DockRight,
          },
        });

        this.initCapture();
      } else {
        this.view = new DockableView({
          id: "turn-order",
          title: "Turn order",
          html: Template.render("turn-order/container.html.njk"),
          taskBarItem: this.taskBarItem,
          mode: ViewOpenMode.DockRight,
          icon: "fas fa-sort-amount-down",
          defaultConfiguration: {
            index: 6,
            hidden: true,
            minimized: false,
            mode: ViewOpenMode.DockRight,
          },
        });
      }

      this.getTaskBarView().add(this.taskBarItem);
      this.getUi().register(this.view);
      this.create();
    });

    EventDispatcher.on(Events.CHARACTER_COLOR_CHANGED, (e) => {
      this.onColorChange(e.cid, e.color);
    });
  }

  protected onColorChange(cid: number, color: string) {
    this.view.container
      .querySelectorAll('.item[data-character-id="' + cid.toString(10) + '"]')
      .forEach((item: HTMLElement) => {
        const theme: HTMLElement = item.querySelector(".turn-order-color");

        if (!theme) {
          return;
        }

        this.removeClassByPrefix(theme, "bg-theme");
        theme.classList.add("bg-theme-" + color);
      });
  }

  public addCraft(id: number, name: string, value = 0) {
    this.getClient().send("turn-order", "setForCraft", {
      item: {
        name: name,
        value: value,
        craft: id,
      },
    });
  }

  public addCharacter(id: number, name: string, value = 0) {
    this.getClient().send("turn-order", "setForCharacter", {
      item: {
        name: name,
        value: value,
        character: id,
      },
    });
  }

  protected initCapture() {
    DiceTagEventDispatcher.on("initiative", (request) => {
      if (request.character) {
        this.getClient().send("turn-order", "setForCharacter", {
          item: {
            name: request.character.name,
            value: request.dice.total,
            character: request.character.id,
          },
        });

        return;
      }

      if (request.craft) {
        this.getClient().send("turn-order", "setForCraft", {
          item: {
            name: request.craft.name,
            value: request.dice.total,
            craft: request.craft.id,
          },
        });

        return;
      }

      this.getClient().get("turn-order", "add", {}, (response) => {
        this.getClient().send("turn-order", "setValues", {
          index: response.index,
          item: {
            name: request.character.name,
            value: request.dice.total,
          },
        });
      });
    });
  }

  public update() {
    const turnOrder: TurnOrderData = this.getTableState().turnOrder;
    const container: HTMLElement = this.view.container.querySelector(".items");

    const extra: any = {
      gm: this.getUserState().isGm(),
    };

    for (const i in turnOrder.items) {
      if (!turnOrder.items[i]) {
        delete turnOrder.items[i];
        continue;
      }

      const name = turnOrder.items[i].name.trim();
      const value = turnOrder.items[i].value;

      if (name === "") {
        turnOrder.items[i].name = this.__("Name");
      }

      if (!value) {
        turnOrder.items[i].value = 0;
      }
    }

    container.innerHTML = Template.render("turn-order/item.html.njk", {
      ...turnOrder,
      ...extra,
    });

    container.querySelectorAll(".name").forEach((name: HTMLElement) => {
      const index: number = parseInt(name.dataset.index, 10);

      name.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          return;
        }
      });

      name.addEventListener("keyup", (e: KeyboardEvent) => {
        this.setValue(index, "name", name.innerText);
      });
    });

    container.querySelectorAll(".value").forEach((value: HTMLElement) => {
      const index: number = parseInt(value.dataset.index, 10);

      value.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Delete" || e.key === "Backspace") {
          return true;
        }

        if (!e.key.match(/[0-9]/g)) {
          e.preventDefault();
          return;
        }
      });

      value.addEventListener("keyup", (e: KeyboardEvent) => {
        this.setValue(index, "value", value.innerText);
      });
    });

    container
      .querySelectorAll(".remove-btn")
      .forEach((removeBtn: HTMLAnchorElement) => {
        removeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          const index: number = parseInt(removeBtn.dataset.index, 10);

          this.getClient().send("turn-order", "remove", {
            index: index,
          });
        });
      });
  }

  protected setValue(index: number, type: string, value: string) {
    this.getClient().send("turn-order", "setValue", {
      type: type,
      index: index,
      value: value,
    });
  }

  protected create() {
    const container: HTMLElement = this.view.container;

    const addTurnBtn: HTMLAnchorElement =
      container.querySelector(".add-turn-btn");
    const sortBtn: HTMLAnchorElement =
      this.view.header.querySelector(".sort-btn");
    const clearBtn: HTMLAnchorElement = container.querySelector(".clear-btn");
    const nextBtn: HTMLAnchorElement = container.querySelector(".next-btn");

    if (addTurnBtn) {
      addTurnBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.getClient().get("turn-order", "add", {}, () => {
          return;
        });
      });
    }

    if (sortBtn) {
      sortBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.getClient().send("turn-order", "sort");
      });
      sortBtn.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (confirm("Are you sure you want to clear the turn order ?")) {
          this.getClient().send("turn-order", "clear");
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.getClient().send("turn-order", "next");
      });
    }
  }

  protected getCharacterRepository(): CharacterRepository {
    return container.get<CharacterRepository>(Repository.CharacterRepository);
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getTableState(): TableState {
    return container.get<TableState>(States.Table);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }
}
