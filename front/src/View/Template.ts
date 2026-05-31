import { container } from "../DependencyInjection/Container";
import { Translator } from "../../shared/System/Translator";
import { Services } from "../DependencyInjection/Services";
import { Environment } from "nunjucks";
import Polyglot from "node-polyglot";
import { SceneElement } from "../Engine/SceneElement";

export class Template {
  protected static env: Environment;
  protected static polyglot: Polyglot;

  public static init() {
    Template.polyglot = new Polyglot({
      phrases: window["translations"],
    });

    Template.env = new Environment([], {
      autoescape: true,
    });

    Template.env.addGlobal("cdnUrl", window["configuration"]["cdnUrl"]);
    Template.env.addGlobal("cdnReadUrl", window["configuration"]["cdnReadUrl"]);
    Template.env.addGlobal(
      "cdnThumbnailUrl",
      window["configuration"]["cdnThumbnailUrl"]
    );
    Template.env.addGlobal("pdfUrl", window["configuration"]["pdfUrl"]);

    Template.env.addGlobal("humanDuration", (variable: any) => {
      if (variable == 0) {
        return this.__("Unknown duration");
      }

      const dateObj = new Date(variable * 1000);
      const hours = dateObj.getUTCHours();
      const minutes = dateObj.getUTCMinutes();
      const seconds = dateObj.getSeconds();

      let string = "";

      if (hours > 0) {
        string += hours.toString(10) + this.__("h") + " ";
      }

      string += minutes.toString(10) + this.__("m") + " ";
      string += (seconds < 10 ? "0" : "") + seconds.toString(10) + this.__("s");

      return string;
    });

    Template.env.addGlobal("hasControls", (item: SceneElement, cid: number) => {
      if (!item.item.controls) {
        return false;
      }

      return item.item.controls.indexOf(cid) !== -1;
    });

    Template.env.addGlobal("humanDiskSpace", Template.humanDiskSpace);
    Template.env.addFilter("isoDate", Template.isoDate);

    Template.env.addGlobal("__", Template.translate);
  }

  public static isoDate(iso: string): string {
    const date: Date = new Date(iso);

    return date.toLocaleDateString();
  }

  public static humanDiskSpace(bytes: number): string {
    const decimals = 2;

    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  public static translate(sentence: string, replacements: any = null) {
    const translated: string = Template.polyglot.t(sentence, replacements);

    if (translated === "") {
      return sentence;
    }

    return translated;
  }

  public static __(sentence: string, replacements: any = null) {
    return this.translate(sentence, replacements);
  }

  public static render(id: string, params: any = {}) {
    return Template.env.render(id, params);
  }

  public static getTranslator(): Translator {
    return container.get<Translator>(Services.SystemTranslator);
  }
}
