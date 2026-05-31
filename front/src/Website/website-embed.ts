/// <reference path="../module.d.ts" />

import "reflect-metadata";
import { SharedAdapter } from "../../shared/System/SharedAdapter";
import { EventDispatcher } from "../Event/EventDispatcher";
import { v4 as Uuid } from "uuid";
import { Tree } from "../../shared/System/Tree";
import { Tables } from "../../shared/System/Tables";
import { CodeExecutor } from "../../shared/System/CodeExecutor";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { eval as safeEval } from "js-engine";
import { Translator } from "../../shared/System/Translator";
import { container } from "./WebsiteSheet/Container";
import { Services } from "./WebsiteSheet/Services";

class Embed {
  public constructor() {
    window["app_mode"] = "site";

    SharedAdapter.container = container;
    SharedAdapter.eventDispatcher = EventDispatcher;
    SharedAdapter.uuid = Uuid;
    SharedAdapter.safeEval = safeEval;

    const translator: Translator = container.get<Translator>(
      Services.SystemTranslator
    );

    if (window["locale"]) {
      translator.current = window["locale"];

      if (window["translation"]) {
        translator.setTranslation(translator.current, window["translation"]);
      }
    }

    const data: any = window["system"];
    const executor = container.get<CodeExecutor>(Services.CodeExecutor);

    if (data.tree !== undefined) {
      const tree = container.get<Tree>(Services.SystemTree);
      tree.setSource(data.tree);
    }

    if (data.tables !== undefined) {
      const tables = container.get<Tables>(Services.SystemTables);
      tables.unserialize(data.tables);
    }

    if (data.script) {
      executor.setScript(data.script);
    }

    SharedAdapter.codeExecutor = executor;
    SharedAdapter.translator = translator;

    this.load();
  }

  protected load() {
    document.addEventListener("DOMContentLoaded", () => {
      const character: any = window["character"];
      this.initSheet(character);
    });
  }

  protected initSheet(character: any) {
    this.initPersist();

    const sheet = new CharacterSheet(
      character,
      this.getTree(),
      this.getTree().mainSourceId
    );
    const view = sheet.getView();
    view.readOnly = true;

    if (window["configuration"]["readOnly"]) {
      view.readOnly = true;
    }

    const block: HTMLElement = document.createElement("div");
    block.id = "sheet-" + character.id;
    block.innerHTML = view.render();

    if (view.width) {
      block.style.width = view.width.toString(10) + "px";
    }

    if (view.height) {
      block.style.height = view.height.toString(10) + "px";
    }

    document.getElementById("sheet-container").innerHTML = "";
    document.getElementById("sheet-container").append(block);

    sheet.init();

    if (character.skin) {
      this.loadSkin(character.skin);
    }

    if (character.data.color) {
      this.onColorChange(character.data.color);
    }
  }

  protected loadSkin(skin: string) {
    const container: HTMLElement = document.getElementById("sheet-container");
    container.classList.add("skin-" + skin);
  }

  protected onColorChange(color: string) {
    const container: HTMLElement = document.getElementById("sheet-container");
    this.removeClassByPrefix(container, "theme");
    container.classList.add("theme-" + color);
  }

  protected removeClassByPrefix(el: HTMLElement, prefix: string) {
    el.classList.forEach((className: string) => {
      if (className.startsWith(prefix)) {
        el.classList.remove(className);
      }
    });

    return el;
  }

  protected initPersist() {
    EventDispatcher.on("character-persist", (e) => {
      return;
    });
  }

  protected getTree(): Tree {
    return container.get<Tree>("SystemTree");
  }
}

new Embed();
