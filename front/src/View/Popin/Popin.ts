import $ = require("jquery");
import { EventEmitter } from "events";
import { DockableView } from "../DockableView";
import { EventDispatcher } from "../../Event/EventDispatcher";
import { Events } from "../../Event/Events";
import { Template } from "../Template";

interface MousePosition {
  x: number;
  y: number;
}

export interface PopinOptions {
  id: string;
  title?: string;
  html?: string;
  class?: string;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  stayAwake?: boolean;
  template?: string;
  header?: HTMLElement;
  icon?: string;
  canMinimize?: boolean;
  canClose?: boolean;
  canDock?: boolean;
  centered?: boolean;
  [params: string]: any;
}

export class Popin {
  protected _id: string;
  protected _title: string;
  protected _html: string;
  protected _class = "";
  protected _width = 600;
  protected _height: number;
  protected _minWidth = 400;
  protected _minHeight = 250;
  protected _zIndex = 1;
  protected _icon: string = null;

  protected isInit = false;
  protected stayAwake = false;
  protected centered = false;
  protected isMinimized = false;

  protected isDragging = false;
  protected dragInitPosition: MousePosition;
  protected containerPosition: any;

  protected isResizing = false;

  protected template = "popin/container.html.njk";

  protected $container;
  protected container: HTMLElement;
  protected $element;

  protected eventDispatcher: EventEmitter;
  protected resizeTimeout: ReturnType<typeof setTimeout>;

  public header: HTMLElement;
  public isSleeping = false;
  public notifications = 0;
  public canMinimize = true;
  public canClose = true;
  public canDock = true;

  public view: DockableView;

  [params: string]: any;

  public constructor(id: string) {
    this._id = id;
    this.$container = $("#popin-container");
    this.container = document.getElementById("popin-container");
    this.eventDispatcher = new EventEmitter();

    EventDispatcher.on(Events.WINDOW_RESIZE, () => {
      const rect: ClientRect = this.getElement().getBoundingClientRect();
      this.move(rect.left, rect.top);
    });
  }

  public open() {
    if (this.isInit) {
      this.wakeUp();

      return;
    }

    const html = Template.render(this.template, {
      className: this.className,
      id: this.id,
      width: this.width,
      title: this.title,
      icon: this.icon,
      canDock: this.canDock,
      canClose: this.canClose,
      canMinimize: this.canMinimize,
      html: this.html,
      extraHeader: this.extraHeader,
    });

    this.$container.append(html);
    this.$element = $("#" + this.id);

    this.init();

    this.container.dispatchEvent(
      new CustomEvent(this.id + "-popin-wakeup", {
        detail: this.id,
      })
    );
  }

  public get coordinates(): any {
    if (!this.$element) {
      return null;
    }

    return {
      x: this.$element.css("left"),
      y: this.$element.css("top"),
      w: this.$element.css("width"),
      h: this.$element.css("height"),
    };
  }

  public set coordinates(coordinates: any) {
    if (!this.$element) {
      return;
    }

    this.$element.css("left", coordinates.x);
    this.$element.css("top", coordinates.y);
    this.$element.css("width", coordinates.w);
    this.$element.css("height", coordinates.h);
  }

  public incrementNotifications() {
    this.notifications++;
    this.dispatch("notification");
  }

  public markAsRead() {
    this.notifications = 0;
    this.dispatch("notification");
  }

  protected dispatch(name: string) {
    this.container.dispatchEvent(
      new CustomEvent(this.id + "-popin-" + name, {
        detail: this.id,
      })
    );
  }

  public wakeUp() {
    this.getElement().style.display = "block";
    this.isSleeping = false;
    this.dispatch("wakeup");
  }

  public sleep() {
    this.doSleep();
    this.dispatch("sleep");
  }

  public doSleep() {
    this.getElement().style.display = "none";
    this.isSleeping = true;
  }

  public displayOver(html: string) {
    if (!this.$element) {
      return;
    }

    const $main = this.$element.find("main").eq(0);

    $main.addClass("d-none");
    $main.after("<main>" + html + "</main>");
  }

  public closeOver() {
    if (!this.$element) {
      return;
    }

    const mains = this.$element.find("main");

    mains.eq(1).remove();
    mains.eq(0).removeClass("d-none");
  }

  public close(force = false) {
    if (this.stayAwake && !force) {
      this.sleep();

      return;
    }

    if (!this.$element) {
      return;
    }

    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("mouseleave", this.onMouseUp);

    this.$element.remove();

    this.dispatch("delete");

    const globalEvent = new CustomEvent("popin-delete", {
      detail: this.id,
    });

    this.container.dispatchEvent(globalEvent);

    this.eventDispatcher.emit("close");
  }

  public onClose(callback: any) {
    this.container.addEventListener(this.id + "-popin-delete", callback);
  }

  public onSleep(callback: any) {
    this.container.addEventListener(this.id + "-popin-sleep", callback);
  }

  public onWakeUp(callback: any) {
    this.container.addEventListener(this.id + "-popin-wakeup", callback);
  }

  public onNotificationUpdate(callback: any) {
    this.container.addEventListener(this.id + "-popin-notification", callback);
  }

  protected init() {
    const $header = this.$element.find("header");
    this.containerPosition = this.$container.position();

    this.$element[0].addEventListener("mousedown", (e) => {
      const event = new CustomEvent("popin-focus", {
        detail: this.id,
      });

      this.$container[0].dispatchEvent(event);
    });

    $header.find(".close, .close-btn").on("click", (e) => {
      e.preventDefault();

      this.close();
    });

    $header.find(".minimize, .minimize-btn").on("click", (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();

      this.minimize();
    });

    $header.find(".maximize").on("click", (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();

      this.maximize();
    });

    $header.find(".dock-right").on("click", (e) => {
      e.preventDefault();

      this.eventDispatcher.emit("dock", {
        position: "right",
      });
    });

    $header.find(".dock-left").on("click", (e) => {
      e.preventDefault();

      this.eventDispatcher.emit("dock", {
        position: "left",
      });
    });

    $header.on("mousedown", (e) => {
      this.dragInitPosition = {
        x: e.pageX - this.$element.offset().left,
        y: e.pageY - this.$element.offset().top,
      };

      this.isDragging = true;
    });

    this.$element.find(".resize").on("mousedown", (e) => {
      e.preventDefault();
      this.isResizing = true;
    });

    $header.on("dblclick", (e) => {
      if (this.isMinimized) {
        this.maximize();
      } else {
        this.minimize();
      }
    });

    document.addEventListener("mousemove", (e) => this.onMouseMove(e));
    document.addEventListener("mouseup", (e) => this.onMouseUp(e));
    document.addEventListener("mouseleave", (e) => this.onMouseUp(e));

    if (this.view) {
      this.getElement().querySelector("main").appendChild(this.view.container);
    }

    this.$element.css("zIndex", this.zIndex);

    if (this.minHeight) {
      this.$element.css("min-height", this.minHeight);
    }

    if (this.height) {
      this.$element.css("height", this.height);
    }

    if (this.width) {
      this.$element.css("width", this.width);
    }

    if (this.$element.height() > this.$container.height() * 0.9) {
      this.$element.height(this.$container.height() * 0.75);
    }

    //this.$element.css('max-height', this.$container.height() * 0.8);

    if (this.centered) {
      this.$element.css({
        top: this.$container.height() / 2 - this.$element.height() / 2,
        left: this.$container.width() / 2 - this.$element.width() / 2,
      });
    }

    this.onHtmlUpdate();

    this.isInit = true;

    this.eventDispatcher.emit("init");
  }

  public minimize() {
    const element = this.getElement();

    element.classList.add("minimized");
    element.dataset.height = element.style.height;
    element.dataset.width = element.style.width;
    element.dataset.minHeight = element.style.minHeight;
    element.dataset.minWidth = element.style.minWidth;

    element.style.height = null;
    element.style.maxHeight = null;
    element.style.minHeight = null;
    element.style.width = null;
    element.style.minWidth = null;

    this.isMinimized = true;
  }

  public maximize() {
    const element = this.getElement();

    element.classList.remove("minimized");

    element.style.height = element.dataset.height;
    element.style.width = element.dataset.width;
    element.style.minWidth = element.dataset.minWidth;
    element.style.minHeight = element.dataset.minHeight;

    this.isMinimized = false;
  }

  public onHtmlUpdate() {
    if (!this.$element) {
      return;
    }

    const $elt = this.$element;

    this.getElement()
      .querySelectorAll("img")
      .forEach((img: HTMLImageElement) => {
        img.addEventListener("load", (e) => {
          let h: number = parseFloat(this.$element.height());

          if (h > Popin.getAbsoluteMaxHeight()) {
            h = Popin.getAbsoluteMaxHeight();
          }

          $elt.css("height", h);
        });
      });

    const maxHeight = $elt.css("max-height");

    if (maxHeight <= $elt.css("height")) {
      let h: number = parseFloat(maxHeight);

      if (h > Popin.getAbsoluteMaxHeight()) {
        h = Popin.getAbsoluteMaxHeight();
      }

      $elt.css("height", h);
    }
  }

  public getElement(): HTMLElement {
    if (!this.$element) {
      return null;
    }

    return this.$element[0];
  }

  public getjQueryElement() {
    return this.$element;
  }

  public on(eventName: string, callback: any) {
    this.eventDispatcher.addListener(eventName, callback);
  }

  public forceHeight() {
    const elt: HTMLElement = this.getElement();

    if (!elt.style.height) {
      let h: number = parseFloat(elt.style.minHeight);

      if (h > Popin.getAbsoluteMaxHeight()) {
        h = Popin.getAbsoluteMaxHeight();
      }

      elt.style.height = h.toString(10) + "px";
    }
  }

  public trigger(eventName: string) {
    this.eventDispatcher.emit(eventName);
  }

  protected onMouseMove(e: MouseEvent) {
    if (this.isDragging) {
      const x: number =
        e.pageX - this.dragInitPosition.x - this.containerPosition.left;
      let y: number =
        e.pageY - this.dragInitPosition.y - this.containerPosition.top;

      if (y < 0) {
        y = 0;
      }

      this.move(x, y);
    } else if (this.isResizing) {
      let w =
        e.pageX -
        this.$element.position().left -
        this.containerPosition.left +
        30;
      let h =
        e.pageY -
        this.$element.position().top -
        this.containerPosition.top +
        30;

      if (w < this.minWidth) {
        w = this.minWidth;
      }

      if (h < this.minHeight) {
        h = this.minHeight;
      }

      if (w > Popin.getAbsoluteMaxWidth()) {
        w = Popin.getAbsoluteMaxWidth();
      }

      if (h > Popin.getAbsoluteMaxHeight()) {
        h = Popin.getAbsoluteMaxHeight();
      }

      this.$element.css("width", w);
      this.$element.css("height", h);

      clearTimeout(this.resizeTimeout);

      this.resizeTimeout = setTimeout(() => {
        this.eventDispatcher.emit("resize");
      }, 500);
    }
  }

  protected move(x: number, y: number) {
    if (!this.$element) {
      return;
    }

    if (x < 0) {
      x = 0;
    }

    if (x + this.$element.width() > this.$container.width()) {
      x = this.$container.width() - this.$element.width();
    }

    if (y + this.$element.height() > this.$container.height()) {
      y = this.$container.height() - this.$element.height();
    }

    if (y < 0) {
      y = 0;
    }

    this.$element.css("left", x);
    this.$element.css("top", y);
  }

  protected updateTitle() {
    if (this.getElement()) {
      if (this.icon) {
        let icon: HTMLElement =
          this.getElement().querySelector("header .popin-icon");

        if (!icon) {
          icon = document.createElement("i");

          this.getElement()
            .querySelector("header")
            .insertAdjacentElement("afterbegin", icon);
        }

        icon.className = "popin-icon " + this.icon;
      }

      (<HTMLElement>this.getElement().querySelector("header h3")).innerText =
        this.title;
    }
  }

  protected onMouseUp(e: MouseEvent) {
    this.isDragging = false;
    this.isResizing = false;
  }

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  set title(title: string) {
    this._title = title;
    this.updateTitle();
  }

  get html(): string {
    return this._html;
  }

  set html(html: string) {
    this._html = html;
  }

  get className(): string {
    return this._class;
  }

  set className(className: string) {
    this._class = className;
  }

  get height(): number {
    return this._height;
  }

  set height(height: number) {
    if (height > Popin.getAbsoluteMaxHeight()) {
      height = Popin.getAbsoluteMaxHeight();
    }

    this._height = height;

    if (this.$element) {
      this.$element.css("height", height.toString(10) + "px");
    }
  }

  get width(): number {
    return this._width;
  }

  set width(width: number) {
    if (width > Popin.getAbsoluteMaxWidth()) {
      width = Popin.getAbsoluteMaxWidth();
    }

    this._width = width;

    if (this.$element) {
      this.$element.css("width", width.toString(10) + "px");
    }
  }

  get minWidth(): number {
    return this._minWidth;
  }

  set minWidth(value: number) {
    this._minWidth = value;
  }

  get minHeight(): number {
    return this._minHeight;
  }

  set minHeight(value: number) {
    this._minHeight = value;
  }

  get zIndex(): number {
    return this._zIndex;
  }

  set zIndex(value: number) {
    this._zIndex = value;

    if (this.isInit && this.$element) {
      this.$element.css("zIndex", this._zIndex);
    }
  }

  get icon(): string {
    return this._icon;
  }

  set icon(icon: string) {
    this._icon = icon;

    this.updateTitle();
  }

  public static getAbsoluteMaxHeight(): number {
    return window.innerHeight * 0.95;
  }

  public static getAbsoluteMaxWidth(): number {
    return window.innerWidth * 0.95;
  }
}
