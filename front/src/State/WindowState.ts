import { inject, injectable } from "inversify";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";

export interface ElementSize {
  x: number;
  y: number;
  w: number;
  h: number;
}

@injectable()
export class WindowState {
  public static readonly CharactersColWidth: number = 190;
  public static readonly TaskBarHeight: number = 35;
  public static readonly RightColWidth: number = 220;
  public static readonly DockColumnWidth: number = 240;

  protected classes: DOMTokenList;

  protected isActive = true;

  public constructor() {
    this.classes = document.getElementById("app").classList;

    window.addEventListener("blur", () => {
      this.isActive = false;

      EventDispatcher.emit(Events.WINDOW_BLUR);
    });

    window.addEventListener("focus", () => {
      this.isActive = true;

      EventDispatcher.emit(Events.WINDOW_FOCUS);
    });
  }

  public isMobile(): boolean {
    return !!window["configuration"].mobile;
  }

  public hasClass(name: string) {
    return this.classes.contains(name);
  }

  public getMap(): ElementSize {
    return {
      x: 0,
      y: 0,
      w: this.getTotalWidth(),
      h: this.getTotalHeight(),
    };
  }

  public getTopMargin(): number {
    if (this.hasClass("taskbar-top")) {
      return WindowState.TaskBarHeight;
    }

    return 0;
  }

  public getBottomMargin(): number {
    if (this.hasClass("taskbar-bottom")) {
      return WindowState.TaskBarHeight;
    }

    return 0;
  }

  public getLeftMargin(): number {
    if (this.hasClass("left-column-open")) {
      return WindowState.DockColumnWidth + WindowState.CharactersColWidth;
    }

    return WindowState.CharactersColWidth;
  }

  public getRightMargin(): number {
    if (this.hasClass("right-column-open")) {
      return WindowState.DockColumnWidth;
    }

    return 0;
  }

  public getTotalWidth() {
    return window.innerWidth;
  }

  public getTotalHeight() {
    return window.innerHeight;
  }

  public active(): boolean {
    return this.isActive;
  }
}
