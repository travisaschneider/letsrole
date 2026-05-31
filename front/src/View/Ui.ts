import { injectable } from "inversify";
import {
  DefaultDockConfiguration,
  DockableView,
  ViewOpenMode,
} from "./DockableView";
import { container } from "../DependencyInjection/Container";
import { UserState } from "../State/UserState";
import { States } from "../DependencyInjection/State";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { View } from "./View";

interface DockConfiguration {
  mode: ViewOpenMode;
  index: number;
  visible: boolean;
  minimized: boolean;
  hidden: boolean;
  position: number[];
  view?: DockableView;
}

@injectable()
export class Ui extends View {
  protected static readonly SaveInterval: number = 10000;
  protected registry: Map<string, DockableView> = new Map<
    string,
    DockableView
  >();

  public init() {
    window.addEventListener("beforeunload", (event) => {
      this.saveState();
    });

    EventDispatcher.on(Events.USER_ME_LOADED, () => {
      setTimeout(() => {
        this.onResize();
      }, 500);

      this.load();
    });

    EventDispatcher.on(Events.WINDOW_RESIZE, () => {
      this.onResize();
    });
  }

  public onResize() {
    const quickBar: HTMLElement = document.querySelector("#quickbar");
    const leftCol: HTMLElement = document.querySelector("#left-column");
    const rightCol: HTMLElement = document.querySelector("#right-column");
    const zoom: HTMLElement = document.querySelector("#zoom");

    const leftPosition: ClientRect = leftCol.getBoundingClientRect();
    const rightPosition: ClientRect = rightCol.getBoundingClientRect();
    const zoomPosition: ClientRect = zoom.getBoundingClientRect();
    const quickBarPosition: ClientRect = quickBar.getBoundingClientRect();

    if (quickBarPosition.right > zoomPosition.left) {
      zoom.classList.add("with-quickbar");
    } else {
      zoom.classList.remove("with-quickbar");
    }

    if (quickBarPosition.right > rightPosition.left) {
      rightCol.classList.add("with-quickbar");
    } else {
      rightCol.classList.remove("with-quickbar");
    }

    if (quickBarPosition.left < leftPosition.right) {
      leftCol.classList.add("with-quickbar");
    } else {
      leftCol.classList.remove("with-quickbar");
    }
  }

  public updateDrop() {
    const cols = document.querySelectorAll("#left-column, #right-column");

    cols.forEach((col: HTMLElement) => {
      let first = true;

      col.querySelectorAll(".dock-drop").forEach((drop: HTMLElement) => {
        drop.remove();
      });

      const docks = col.querySelectorAll("section.dock:not(.d-none)");

      docks.forEach((dock: HTMLElement) => {
        dock.insertAdjacentHTML(
          "afterend",
          '<div class="dock-drop" data-after="' + dock.id + '"></div>'
        );

        if (first) {
          dock.insertAdjacentHTML(
            "beforebegin",
            '<div class="dock-drop" data-before="' + dock.id + '"></div>'
          );
        }

        first = false;
      });

      if (docks.length == 0) {
        col.insertAdjacentHTML("afterbegin", '<div class="dock-drop"></div>');
      }

      col.querySelectorAll(".dock-drop").forEach((drop: HTMLElement) => {
        drop.addEventListener("dragover", (e) => {
          e.preventDefault();
          drop.classList.add("drag-over");
        });

        drop.addEventListener("dragenter", (e) => {
          if (e.dataTransfer.getData("type") !== "dock") {
            return;
          }

          drop.classList.add("drag-over");
        });

        drop.addEventListener("dragleave", (e) => {
          drop.classList.remove("drag-over");
        });

        drop.addEventListener("drop", (e) => {
          e.preventDefault();

          drop.classList.remove("drag-over");

          if (e.dataTransfer.getData("type") !== "dock") {
            return;
          }

          const afterId: string = drop.dataset.after;
          const beforeId: string = drop.dataset.before;
          const containerId: string = e.dataTransfer.getData("id");
          const container: HTMLElement = document.getElementById(
            "dock-" + containerId
          );
          const col = drop.closest(".column");

          if (afterId) {
            const afterTarget: HTMLElement = document.getElementById(afterId);
            afterTarget.after(container);
          } else if (beforeId) {
            const beforeTarget: HTMLElement = document.getElementById(beforeId);
            beforeTarget.before(container);
          } else {
            col.append(container);
          }

          const view: DockableView = this.registry.get(containerId);

          if (col.classList.contains("left-column")) {
            view.mode = ViewOpenMode.DockLeft;
          } else {
            view.mode = ViewOpenMode.DockRight;
          }

          this.updateDrop();
        });
      });
    });
  }

  public load() {
    let item: string = window.localStorage.getItem(this.getStorageKey());

    if (!item) {
      item = "null";
    }

    let configuration: any = JSON.parse(item);

    if (!configuration) {
      configuration = {};
      const i = 0;

      this.registry.forEach((item: DockableView) => {
        configuration[item.id] = item.defaultConfiguration;
      });
    }

    const leftDocks: DockConfiguration[] = [];
    const rightDocks: DockConfiguration[] = [];
    const popins: DockConfiguration[] = [];

    for (const id in configuration) {
      const view: DockableView = this.registry.get(id);

      if (!view) {
        continue;
      }

      const config = configuration[id];
      config.view = view;

      if (config.mode === ViewOpenMode.DockLeft) {
        leftDocks.push(config);
      } else if (config.mode === ViewOpenMode.DockRight) {
        rightDocks.push(config);
      } else {
        popins.push(config);
      }
    }

    const elements = [leftDocks, rightDocks, popins];

    elements.forEach((element: any[]) => {
      element.sort((a: any, b: any) => {
        if (a.index === b.index) return 0;
        return a.index < b.index ? -1 : 1;
      });
    });

    leftDocks.forEach((leftDock: DockConfiguration) => {
      const view: DockableView = leftDock.view;
      view.mode = leftDock.mode;
      view.open();

      if (leftDock.minimized) {
        view.minimize();
      }

      if (leftDock.hidden) {
        view.hide();
      }
    });

    rightDocks.forEach((rightDock: DockConfiguration) => {
      const view: DockableView = rightDock.view;
      view.mode = rightDock.mode;
      view.open();

      if (rightDock.minimized) {
        view.minimize();
      }

      if (rightDock.hidden) {
        view.hide();
      }
    });

    popins.forEach((popin: DockConfiguration) => {
      const view: DockableView = popin.view;
      view.mode = popin.mode;
      view.open();

      if (popin.position) {
        view.getPopin().coordinates = popin.position;
      }
    });

    this.updateDrop();
  }

  public register(view: DockableView) {
    this.registry.set(view.id, view);
  }

  public get(id: string): DockableView {
    return this.registry.get(id);
  }

  public saveState() {
    window.localStorage.setItem(
      this.getStorageKey(),
      JSON.stringify(this.getConfiguration())
    );
  }

  protected getStorageKey(): string {
    return container.get<UserState>(States.User).isGm()
      ? "gm-ui-state"
      : "ui-state";
  }

  public getConfiguration(): any {
    const configuration: any = {};

    this.registry.forEach((view: DockableView) => {
      configuration[view.id] = {
        mode: view.mode,
        index: view.index,
        visible: view.visible,
        minimized: view.minimized,
        hidden: view.hidden,
        position:
          view.mode === ViewOpenMode.Popin ? view.getPopin().coordinates : null,
      };
    });

    return configuration;
  }
}
