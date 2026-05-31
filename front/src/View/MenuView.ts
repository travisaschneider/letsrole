import { View } from "./View";
import { Popin } from "./Popin/Popin";
import { ChatView } from "./ChatView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";

interface MenuCategory {
  title: string;
  taskCategory: TaskBarCategory;
  column: number;
  container: HTMLElement;
}

export class MenuView extends View {
  protected itemContainer: HTMLElement;
  protected container: HTMLElement;
  protected categories: MenuCategory[];
  protected items: TaskBarItem[] = [];
  protected isReady = false;
  protected isOpen = true;

  protected exitBtn: TaskBarItem;

  public constructor() {
    super();

    this.container = document.getElementById("main-menu");
    this.itemContainer = document.getElementById("menu-items");
  }

  public init() {
    this.categories = [
      {
        title: this.__("Main"),
        taskCategory: TaskBarCategory.Main,
        column: 0,
        container: null,
      },
      {
        title: this.__("Tools"),
        taskCategory: TaskBarCategory.Tool,
        column: 0,
        container: null,
      },
      {
        title: this.__("Content"),
        taskCategory: TaskBarCategory.Content,
        column: 1,
        container: null,
      },
      {
        title: this.__("Audio"),
        taskCategory: TaskBarCategory.Audio,
        column: 1,
        container: null,
      },
      {
        title: this.__("Other"),
        taskCategory: TaskBarCategory.Other,
        column: 1,
        container: null,
      },
    ];

    /*const config = new TaskBarItem(this.__('Settings'), "fas fa-cogs", TaskBarCategory.Other);
        config.desactivate();
        this.add(config);*/

    this.exitBtn = new TaskBarItem(
      this.__("Exit"),
      "fas fa-sign-out-alt",
      TaskBarCategory.Other
    );

    this.exitBtn.onClick(() => {
      document.location.href = "/tables";
    });

    this.exitBtn.removeEyeElement();
    this.exitBtn.desactivate();

    this.add(this.exitBtn);

    this.createCategories();
    this.addAllItems();

    this.container
      .querySelector(".main-menu-title a")
      .addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();

        if (this.isOpen) {
          this.closeMenu();
        } else {
          this.openMenu();
        }
      });

    this.container.classList.add("no-animation");
    this.closeMenu();

    EventDispatcher.on(Events.MENU_UPDATE, () => {
      this.updateClosedPosition();
    });

    this.isReady = true;
  }

  public openMenu() {
    this.container.classList.remove("no-animation");

    if (this.isMobile()) {
      this.container.style.left = "0";
    } else {
      this.container.style.top = "0";
    }

    this.isOpen = true;
  }

  public closeMenu() {
    this.isOpen = false;
    this.updateClosedPosition();
  }

  public updateClosedPosition() {
    if (this.isOpen === false) {
      const menuRect: ClientRect = this.container
        .querySelector(".main-menu-inside")
        .getBoundingClientRect();

      if (this.isMobile()) {
        this.container.style.left = "-" + menuRect.width.toString(10) + "px";
      } else {
        this.container.style.top = "-" + menuRect.height.toString(10) + "px";
      }
    }
  }

  protected createCategories() {
    const row: HTMLElement = document.createElement("div");
    row.classList.add("row");

    const cols: HTMLElement[] = [
      document.createElement("div"),
      document.createElement("div"),
    ];

    cols[0].classList.add("col-6");
    cols[1].classList.add("col-6");

    row.append(cols[0], cols[1]);

    for (const category of this.categories) {
      const categoryContainer: HTMLElement = document.createElement("div");

      const title: HTMLElement = document.createElement("h3");
      title.textContent = category.title;

      const container: HTMLElement = document.createElement("div");

      categoryContainer.append(title, container);

      category.container = container;

      cols[category.column].append(categoryContainer);
    }

    this.itemContainer.append(row);
  }

  protected getCategory(cat: TaskBarCategory): MenuCategory {
    let defaultCategory: MenuCategory;

    for (const category of this.categories) {
      if (category.taskCategory === cat) {
        return category;
      }

      if (category.taskCategory === TaskBarCategory.Other) {
        defaultCategory = category;
      }
    }

    return defaultCategory;
  }

  public add(item: TaskBarItem) {
    this.items.push(item);

    if (this.isReady) {
      this.addTaskBarItem(item);
    }
  }

  protected addAllItems() {
    this.items.forEach((item: TaskBarItem) => {
      this.addTaskBarItem(item);
    });
  }

  protected addTaskBarItem(item: TaskBarItem) {
    this.getCategory(item.category).container.appendChild(item.rootElement);
    this.updateClosedPosition();
  }

  public remove(item: TaskBarItem) {
    item.rootElement.remove();
  }

  public attachPopin(popin: Popin) {
    const item: TaskBarItem = new TaskBarItem(popin.title);

    popin.onClose((e) => {
      this.remove(item);
    });

    popin.onSleep((e) => {
      item.desactivate();
    });

    popin.onWakeUp((e) => {
      item.activate();
    });

    item.linkElement.addEventListener("click", (e) => {
      e.preventDefault();

      if (popin.isSleeping) {
        popin.wakeUp();
      } else {
        popin.sleep();
      }
    });

    this.add(item);
  }

  protected getChatView(): ChatView {
    return container.get<ChatView>(Views.Chat);
  }
}
