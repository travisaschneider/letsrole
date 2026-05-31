/// <reference path="module.d.ts" />

import "reflect-metadata";
import "./jquery";
import $ from "jquery";
import { Stage } from "./Engine/Stage";
import { GlobalLoader } from "./Loader/GlobalLoader";
import { container } from "./DependencyInjection/Container";
import { Services } from "./DependencyInjection/Services";
import { ViewManager } from "./View/ViewManager";
import { Views } from "./DependencyInjection/Views";
import { Tree } from "../shared/System/Tree";
import { Tables } from "../shared/System/Tables";
import { EmitterManager } from "./Emitter/EmitterManager";
import { Emitters } from "./DependencyInjection/Emitters";
import { EventDispatcher } from "./Event/EventDispatcher";
import { CodeExecutor } from "../shared/System/CodeExecutor";
import { SharedAdapter } from "../shared/System/SharedAdapter";
import { v4 as Uuid } from "uuid";
import { ClusterLink } from "./Client/ClusterLink";
import { Template } from "./View/Template";
import { Events } from "./Event/Events";
import { eval as safeEval } from "js-engine";
import { Translator } from "../shared/System/Translator";
import Konva from "konva";

class App {
  protected stage: Stage;

  public constructor() {
    GlobalLoader.init();

    let resizeTimeout = null;

    Konva.pixelRatio = 1;

    window["app_mode"] = "app";

    window.addEventListener("resize", () => {
      if (resizeTimeout !== null) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(onResize, 2000);
    });

    const onResize = () => {
      const stage: Stage = container.get<Stage>(Services.Stage);
      stage.resize();

      EventDispatcher.emit(Events.WINDOW_RESIZE);
    };

    this.createStage();

    container.get<ViewManager>(Views.Manager).init();
    container.get<EmitterManager>(Emitters.Manager).init();

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

    executor.setScript(data?.script);

    SharedAdapter.codeExecutor = executor;
    SharedAdapter.translator = translator;

    Template.init();

    $(() => {
      container.get<ClusterLink>(Services.ClusterLink).connect();
    });
  }

  public createStage() {
    GlobalLoader.reset();
    document.getElementById("map").innerHTML = "";

    this.stage = container.get<Stage>(Services.Stage);
    this.stage.build();
  }
}

const app = new App();
