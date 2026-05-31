import { PopinManager } from "./Popin/PopinManager";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { Popin } from "./Popin/Popin";
import { TaskBarItem } from "./TaskBar/TaskBarItem";
import { Stage } from "../Engine/Stage";
import { Template } from "./Template";
import { Ui } from "./Ui";
import { Views } from "../DependencyInjection/Views";
import { MenuView } from "./MenuView";

export interface DefaultDockConfiguration {
  mode: ViewOpenMode;
  minimized: boolean;
  hidden: boolean;
  index: number;
  view?: DockableView;
}

export interface DockableViewOptions {
  id: string;
  title: string;
  html?: string;
  taskBarItem?: TaskBarItem;
  mode?: ViewOpenMode;
  fixed?: boolean;
  header?: string;
  icon?: string;
  defaultConfiguration?: DefaultDockConfiguration;
}

export enum ViewOpenMode {
  Popin = "popin",
  DockLeft = "dock-left",
  DockRight = "dock-right",
}

export class DockableView {
  public static readonly ON_CLOSE = "close";
  public static readonly ON_OPEN = "open";

  public defaultConfiguration: DefaultDockConfiguration = {
    mode: ViewOpenMode.DockRight,
    minimized: true,
    hidden: false,
    index: 1,
  };

  protected _container: HTMLElement;
  protected _title: string;
  protected _id: string;
  protected _popin: Popin;
  protected _mode: ViewOpenMode = ViewOpenMode.DockLeft;
  protected _visible = false;
  protected _hidden = false;
  protected _minimized = true;
  protected _taskBarItem: TaskBarItem;
  protected _dock: HTMLElement;
  protected _fixed = false;
  protected _header: HTMLElement;
  protected _icon: string;

  protected _maximizeCallbacks: Function[] = [];

  public constructor(options: DockableViewOptions) {
    this._container = document.createElement("aside");
    this._title = options.title;
    this._id = options.id;
    this._icon = options.icon;

    this._header = document.createElement("div");
    this._header.classList.add("header-options");

    if (options.header) {
      this._header.insertAdjacentHTML("afterbegin", options.header);
    }

    if (options.html !== undefined) {
      this.html = options.html;
    }

    if (options.taskBarItem !== undefined) {
      options.taskBarItem.dock = this;
      this.taskBarItem = options.taskBarItem;
    }

    if (options.mode !== undefined) {
      this._mode = options.mode;
    }

    if (options.fixed !== undefined) {
      this._fixed = options.fixed;
    }

    if (options.defaultConfiguration !== undefined) {
      this.defaultConfiguration = options.defaultConfiguration;
    }
  }

  public minimize() {
    if (!this._dock) {
      return;
    }

    this._dock.classList.add("closed");
    this._minimized = true;
  }

  public maximize() {
    if (!this._dock) {
      return;
    }

    this._dock.classList.remove("closed");
    this._minimized = false;

    this._maximizeCallbacks.forEach((callback: Function) => {
      callback(this);
    });
  }

  public onMaximize(callback: Function) {
    this._maximizeCallbacks.push(callback);
  }

  public hide() {
    if (!this._dock) {
      return;
    }

    this._dock.classList.add("d-none");
    this._hidden = true;
    this.getUi().updateDrop();

    if (this._taskBarItem) {
      this._taskBarItem.desactivate();
    }

    this.getMenuView().updateClosedPosition();
  }

  public show() {
    if (!this._dock) {
      return;
    }

    this._dock.classList.remove("d-none");
    this._hidden = false;
    this.maximize();
    this.getUi().updateDrop();

    if (this._taskBarItem) {
      this._taskBarItem.activate();
    }

    this.getMenuView().updateClosedPosition();
  }

  public open() {
    switch (this._mode) {
      case ViewOpenMode.Popin:
        this.getPopin().open();
        this.getPopin()
          .getElement()
          .querySelector("main")
          .appendChild(this._container);

        this.getPopin()
          .getElement()
          .querySelector("header .dropdown")
          .insertAdjacentElement("beforebegin", this.header);

        if (this._taskBarItem) {
          this._taskBarItem.show();
        }

        break;

      case ViewOpenMode.DockRight:
      case ViewOpenMode.DockLeft:
        this.moveToDock();

        if (this._taskBarItem) {
          this._taskBarItem.activate();
        }
        break;
    }

    this._container.dispatchEvent(new Event(DockableView.ON_OPEN));

    this._visible = true;
    this.getUi().updateDrop();
  }

  public get index(): number {
    if (this._mode === ViewOpenMode.Popin) {
      return this.getPopin().zIndex;
    }

    const colId: string =
      this._mode === ViewOpenMode.DockRight ? "right-column" : "left-column";
    const column: HTMLElement = document.getElementById(colId);

    const nodes = Array.from(column.querySelectorAll(".dock"));

    return nodes.indexOf(column.querySelector("#dock-" + this.id));
  }

  protected moveToDock() {
    const colId: string =
      this._mode === ViewOpenMode.DockRight ? "right-column" : "left-column";
    const column: HTMLElement = document.getElementById(colId);
    const body: HTMLElement = document.getElementById("app");

    if (!body.classList.contains(colId + "-open")) {
      body.classList.add(colId + "-open");
    }

    if (column.querySelectorAll("#dock-" + this.id).length) {
      return;
    }

    const html = Template.render("popin/dock-container.html.njk", {
      title: this.title,
      id: this.id,
      column: this._mode === ViewOpenMode.DockRight ? "right" : "left",
      fixed: this.fixed,
      icon: this.icon,
    });

    column.insertAdjacentHTML("beforeend", html);

    this._dock = column.querySelector("#dock-" + this.id);
    this._dock.querySelector("main").appendChild(this._container);

    const header: HTMLElement = this._dock.querySelector(
      "header[draggable=true]"
    );
    const title: HTMLElement = this._dock.querySelector("header h3");
    const openBtn: HTMLAnchorElement = this._dock.querySelector(
      "footer.caret-closed a"
    );
    const options: HTMLElement = this._dock.querySelector("header .options");

    const dockLeftBtn: HTMLElement = options.querySelector(".dock-left");
    const dockRightBtn: HTMLElement = options.querySelector(".dock-right");
    const moveUpBtn: HTMLElement = options.querySelector(".move-up");
    const moveDownBtn: HTMLElement = options.querySelector(".move-down");
    const popoutBtn: HTMLElement = options.querySelector(".popout");
    const closeBtn: HTMLElement = this._dock.querySelector(".close-btn");

    if (this._header) {
      this._dock
        .querySelector(".dock-options")
        .insertAdjacentElement("afterbegin", this._header);
    }

    $(this._dock.querySelector(".options-btn")).dropdown({
      boundary: "window",
    });

    title.addEventListener("click", (e) => {
      if (this.minimized) {
        this.maximize();
      } else {
        this.minimize();
      }

      this.computeHeight(column);
    });

    openBtn.addEventListener("click", (e) => {
      e.preventDefault();

      this.maximize();
      this.computeHeight(column);
    });

    if (dockLeftBtn) {
      dockLeftBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (this._mode === ViewOpenMode.Popin) {
          this.getPopin().doSleep();
        } else {
          this.close();
        }

        this._mode = ViewOpenMode.DockLeft;
        this.open();
      });
    }

    if (dockRightBtn) {
      dockRightBtn.addEventListener("click", (e) => {
        e.preventDefault();

        if (this._mode === ViewOpenMode.Popin) {
          this.getPopin().doSleep();
        } else {
          this.close();
        }

        this._mode = ViewOpenMode.DockRight;
        this.open();
      });
    }

    if (popoutBtn) {
      popoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.close(true);

        this._mode = ViewOpenMode.Popin;
        this.open();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();

        this.hide();
      });
    }

    if (moveDownBtn) {
      moveDownBtn.addEventListener("click", (e) => {
        e.preventDefault();

        this.moveDown();
      });
    }

    if (moveUpBtn) {
      moveUpBtn.addEventListener("click", (e) => {
        e.preventDefault();

        this.moveUp();
      });
    }

    this.computeHeight(column);

    const observer = new MutationObserver((mutations) => {
      if (mutations.length === 1) {
        const mutation = mutations[0];

        if (
          mutation.attributeName === "style" &&
          mutation.target === this._dock
        ) {
          return;
        }
      }

      this.computeHeight(column);
    });

    const config = { attributes: true, childList: true, subtree: true };

    observer.observe(this._dock, config);

    this.getStage().resize();

    header.addEventListener("dragstart", (e: DragEvent) => {
      e.dataTransfer.setData("type", "dock");
      e.dataTransfer.setData("id", this._id);
    });

    if (this._taskBarItem) {
      this._taskBarItem.onDockOpen(this._mode);
    }
  }

  public moveUp() {
    const container: HTMLElement = this.getDockContainer();

    if (!container) {
      return;
    }

    let item: HTMLElement = container;
    let prev: HTMLElement;

    while ((item = item.previousSibling as HTMLElement) != null) {
      if (item.classList && item.classList.contains("dock")) {
        prev = item;
        break;
      }
    }

    if (!prev) {
      return;
    }

    prev.before(container);
    this.getUi().updateDrop();
  }

  public moveDown() {
    const container: HTMLElement = this.getDockContainer();

    if (!container) {
      return;
    }

    let item: HTMLElement = container;
    let next: HTMLElement;

    while ((item = item.nextSibling as HTMLElement) != null) {
      if (item.classList && item.classList.contains("dock")) {
        next = item;
        break;
      }
    }
    if (!next) {
      return;
    }

    next.after(container);
    this.getUi().updateDrop();
  }

  public computeHeight(column: HTMLElement) {
    const docks = column.querySelectorAll("section.dock");
    const totalHeight: number = document.getElementById("app").clientHeight;
    let usedHeight = 0;

    docks.forEach((dock: HTMLElement) => {
      const inside: HTMLElement = dock.querySelector("main > aside");

      if (!inside) {
        return;
      }

      const contentHeight: number = inside.clientHeight;

      if (dock.classList.contains("closed")) {
        dock.style.flex = "0 1 auto";
      } else {
        if (contentHeight > totalHeight) {
          dock.style.flex = "1 1 auto";
        } else {
          dock.style.flex = "";
        }
      }

      usedHeight += dock.clientHeight;
    });

    const available: number = column.clientHeight;

    if (available * 0.8 < usedHeight) {
      column.style.pointerEvents = "auto";
    } else {
      column.style.pointerEvents = "none";
    }
  }

  public close(forced = false) {
    if (this._mode === ViewOpenMode.Popin) {
      this.getPopin().close();
    } else {
      if (this._taskBarItem) {
        this._taskBarItem.show();
        this._taskBarItem.desactivate();
      }

      if (forced) {
        if (this._dock) {
          this._dock.remove();
        }

        const leftCol: HTMLElement = document.getElementById("left-column");
        const rightCol: HTMLElement = document.getElementById("right-column");
        const app: HTMLElement = document.getElementById("app");

        if (leftCol.childElementCount === 0) {
          app.classList.remove("left-column-open");
        }

        if (rightCol.childElementCount === 0) {
          app.classList.remove("right-column-open");
        }

        this.computeHeight(leftCol);
        this.computeHeight(rightCol);

        this.getStage().resize();
      }

      this.minimize();
    }

    this._container.dispatchEvent(new Event(DockableView.ON_CLOSE));

    this._visible = false;

    this.getUi().updateDrop();
  }

  public getPopin(): Popin {
    if (this._popin === undefined) {
      this._popin = this.getPopinManager().create({
        id: this.id,
        title: this.title,
        view: this,
        stayAwake: true,
        header: this._header,
        canDock: true,
      });

      this._popin.on("init", () => {
        this.initTaskBarItem();
      });

      this._popin.onSleep(() => {
        if (this._mode === ViewOpenMode.Popin) {
          this._mode = ViewOpenMode.DockLeft;
        }

        this.open();
      });

      this._popin.onWakeUp(() => {
        this._visible = true;
      });

      this._popin.on("dock", (e) => {
        this._popin.doSleep();

        if (e.position === "left") {
          this._mode = ViewOpenMode.DockLeft;
        } else {
          this._mode = ViewOpenMode.DockRight;
        }

        this.open();
      });
    }

    return this._popin;
  }

  public get mode(): ViewOpenMode {
    return this._mode;
  }

  public set mode(mode: ViewOpenMode) {
    this._mode = mode;
  }

  public on(event: string, callback: any) {
    this._container.addEventListener(event, callback);
  }

  protected initTaskBarItem() {
    if (!this._taskBarItem) {
      return;
    }

    this._taskBarItem.offClick().onClick(() => {
      if (this.hidden) {
        this.show();
        this._taskBarItem.activate();
      } else {
        this.hide();
        this._taskBarItem.desactivate();
      }
    });

    if (this._popin) {
      this._popin.onSleep(() => {
        this._taskBarItem.desactivate();
      });

      this._popin.onWakeUp(() => {
        this._taskBarItem.activate();
      });
    }
  }

  public set taskBarItem(taskBarItem: TaskBarItem) {
    this._taskBarItem = taskBarItem;
    this.initTaskBarItem();
  }

  public getDockContainer(): HTMLElement {
    return this._dock;
  }

  public get container(): HTMLElement {
    return this._container;
  }

  public get header(): HTMLElement {
    return this._header;
  }

  public set html(html: string) {
    this._container.innerHTML = html;
  }

  public set title(title: string) {
    this._title = title;

    (this._dock.querySelector("header .dock-title") as HTMLElement).innerText =
      title;
  }

  public get title(): string {
    return this._title;
  }

  public get id(): string {
    return this._id;
  }

  public get visible(): boolean {
    return this._visible;
  }

  public get hidden(): boolean {
    return this._hidden;
  }

  public get minimized(): boolean {
    if (!this._dock) {
      return;
    }

    return this._dock.classList.contains("closed");
  }

  public get fixed(): boolean {
    return this._fixed;
  }

  public get icon(): string {
    return this._icon;
  }

  protected getPopinManager(): PopinManager {
    return container.get<PopinManager>(Services.PopinManager);
  }

  protected getStage(): Stage {
    return container.get<Stage>(Services.Stage);
  }

  protected getUi(): Ui {
    return container.get<Ui>(Views.Ui);
  }

  protected getMenuView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }
}
