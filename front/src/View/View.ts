import { injectable } from "inversify";
import { WebSocketClient } from "../Client/WebSocketClient";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { Ui } from "./Ui";
import { Views } from "../DependencyInjection/Views";
import { Template } from "./Template";
import { WindowState } from "../State/WindowState";
import { States } from "../DependencyInjection/State";

@injectable()
export abstract class View {
  protected static PrimaryColor: string;
  protected static DefaultColor: string;

  public init() {
    //
  }

  public isMobile(): boolean {
    return container.get<WindowState>(States.Window).isMobile();
  }

  public static getPrimarySkinColor(): string {
    if (!View.PrimaryColor) {
      View.PrimaryColor = getComputedStyle(
        document.documentElement
      ).getPropertyValue("--primary-color");
    }

    return View.PrimaryColor;
  }

  public static getDefaultSkinColor(): string {
    if (!View.DefaultColor) {
      View.DefaultColor = getComputedStyle(
        document.documentElement
      ).getPropertyValue("--default-color");
    }

    return View.DefaultColor;
  }

  public static getPrimarySkinColorRGBA(opacity = 1): string {
    const hex: string = View.getPrimarySkinColor();

    let c = hex.substring(1).split("");

    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }

    const d: any = "0x" + c.join("");

    return (
      "rgba(" +
      [(d >> 16) & 255, (d >> 8) & 255, d & 255].join(",") +
      "," +
      opacity.toString(10) +
      ")"
    );
  }

  protected getClient(): WebSocketClient {
    return container.get<WebSocketClient>(Services.WebSocketClient);
  }

  protected getUi(): Ui {
    return container.get<Ui>(Views.Ui);
  }

  protected removeClassByPrefix(el: HTMLElement, prefix: string) {
    el.classList.forEach((className) => {
      if (className.startsWith(prefix)) {
        el.classList.remove(className);
      }
    });

    return el;
  }

  protected __(sentence: string, replacements: any = {}): string {
    return Template.translate(sentence, replacements);
  }

  protected getRandomString(length: number): string {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }
}
