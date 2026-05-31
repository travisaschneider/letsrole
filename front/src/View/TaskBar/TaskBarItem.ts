import { DockableView, ViewOpenMode } from "../DockableView";
import { Template } from "../Template";
import { EventDispatcher } from "../../Event/EventDispatcher";
import { Events } from "../../Event/Events";

export enum TaskBarCategory {
  Main = "main",
  Content = "content",
  Audio = "audio",
  Tool = "tool",
  Other = "other",
}

export class TaskBarItem {
  public rootElement: HTMLElement;
  public linkElement: HTMLAnchorElement;
  public iconElement: HTMLElement;
  public titleElement: HTMLElement;
  public notificationElement: HTMLElement;
  public eyeElement: HTMLElement;
  public dockLeftElement: HTMLElement;
  public dockRightElement: HTMLElement;

  protected _title: string;
  protected _icon: string;
  protected _category: TaskBarCategory;
  private _notifications = 0;

  protected _dock: DockableView;

  protected _clickCallbacks: any[] = [];

  public constructor(title: string, icon?: string, category?: TaskBarCategory) {
    this._title = title;
    this._icon = icon;
    this._category = category;

    this.init();
  }

  public onDockOpen(mode: ViewOpenMode) {
    if (mode === ViewOpenMode.DockLeft) {
      this.dockLeftElement.classList.add("enabled");
      this.dockRightElement.classList.remove("enabled");
    } else if (mode === ViewOpenMode.DockRight) {
      this.dockLeftElement.classList.remove("enabled");
      this.dockRightElement.classList.add("enabled");
    } else {
      this.dockLeftElement.classList.remove("enabled");
      this.dockRightElement.classList.remove("enabled");
    }
  }

  public activate() {
    this.rootElement.classList.add("active");
    this.eyeElement.classList.add("fa-eye");
    this.eyeElement.classList.remove("fa-eye-slash");
  }

  public removeEyeElement() {
    this.eyeElement.classList.add("d-none");
  }

  public desactivate() {
    this.rootElement.classList.remove("active");
    this.eyeElement.classList.remove("fa-eye");
    this.eyeElement.classList.add("fa-eye-slash");
  }

  public isActive(): boolean {
    return this.rootElement.classList.contains("active");
  }

  public hide() {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.classList.add("d-none");
    EventDispatcher.emit(Events.MENU_UPDATE);
  }

  public show() {
    if (!this.rootElement) {
      return;
    }

    this.rootElement.classList.remove("d-none");
    EventDispatcher.emit(Events.MENU_UPDATE);
  }

  protected doClick(e) {
    e.preventDefault();

    for (const i in this._clickCallbacks) {
      this._clickCallbacks[i]();
    }
  }

  public offClick() {
    this._clickCallbacks = [];
    return this;
  }

  public onClick(callback: any) {
    this._clickCallbacks.push(callback);
    return this;
  }

  public notify() {
    this.notifications++;
    this.updateNotifications();
  }

  public clearNotifications() {
    this.notifications = 0;
    this.updateNotifications();
  }

  protected updateNotifications() {
    if (this.notifications > 0) {
      this.notificationElement.innerText =
        "(" + this.notifications.toString(10) + ")";
      this.rootElement.classList.add("has-notifications");
    } else {
      this.notificationElement.innerText = "";
      this.rootElement.classList.remove("has-notifications");
    }
  }

  protected init() {
    this.rootElement = document.createElement("section");

    this.linkElement = document.createElement("a");
    this.linkElement.href = "#";

    this.titleElement = document.createElement("span");
    this.titleElement.innerText = this.title;

    const buttons: HTMLElement = document.createElement("div");
    buttons.classList.add("buttons");
    this.createButtons(buttons);

    this.linkElement.appendChild(this.titleElement);

    if (this.icon) {
      this.iconElement = document.createElement("i");

      this.icon.split(" ").forEach((className: string) => {
        this.iconElement.classList.add(className);
      });

      this.iconElement.classList.add("icon");

      this.linkElement.prepend(this.iconElement);
    }

    this.notificationElement = document.createElement("span");
    this.notificationElement.classList.add("notification");

    this.linkElement.appendChild(this.notificationElement);

    this.rootElement.appendChild(this.linkElement);
    this.rootElement.appendChild(buttons);

    this.linkElement.addEventListener("click", (e) => this.doClick(e));
  }

  protected createButtons(buttons: HTMLElement) {
    this.eyeElement = document.createElement("i");
    this.eyeElement.classList.add("fas");
    this.eyeElement.classList.add("fa-eye");
    this.eyeElement.title = Template.__("Show/Hide");

    this.dockLeftElement = document.createElement("i");
    this.dockLeftElement.classList.add("fas");
    this.dockLeftElement.classList.add("fa-arrow-alt-to-left");
    this.dockLeftElement.classList.add("d-none");
    this.dockLeftElement.title = Template.__("Dock to the left");

    this.dockRightElement = document.createElement("i");
    this.dockRightElement.classList.add("fas");
    this.dockRightElement.classList.add("fa-arrow-alt-to-right");
    this.dockRightElement.classList.add("d-none");
    this.dockRightElement.title = Template.__("Dock to the right");

    buttons.append(this.eyeElement);
    buttons.append(this.dockLeftElement, this.dockRightElement);

    jQuery(buttons).find("i").tooltip();

    this.eyeElement.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();

      this.doClick(e);
    });

    this.dockLeftElement.addEventListener("click", (e: MouseEvent) => {
      if (!this.dock) {
        return;
      }

      this.dock.mode = ViewOpenMode.DockLeft;
      this.dock.close(true);
      this.dock.open();
    });

    this.dockRightElement.addEventListener("click", (e: MouseEvent) => {
      if (!this.dock) {
        return;
      }

      this.dock.mode = ViewOpenMode.DockRight;
      this.dock.close(true);
      this.dock.open();
    });
  }

  public set dock(dock: DockableView) {
    this._dock = dock;

    this.dockLeftElement.classList.remove("d-none");
    this.dockRightElement.classList.remove("d-none");
  }

  public get dock(): DockableView {
    return this._dock;
  }

  public set title(title: string) {
    this._title = title;
  }

  public get title(): string {
    return this._title;
  }

  public set icon(icon: string) {
    this._icon = icon;
  }

  public get icon(): string {
    return this._icon;
  }

  public get category(): TaskBarCategory {
    return this._category;
  }

  get notifications(): number {
    return this._notifications;
  }

  set notifications(value: number) {
    this._notifications = value;
    this.updateNotifications();
  }
}
