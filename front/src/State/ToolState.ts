import { injectable } from "inversify";
import { RulerView } from "../View/RulerView";
import { Views } from "../DependencyInjection/Views";
import { container } from "../DependencyInjection/Container";
import { DrawingsView } from "../View/DrawingsView";
import { GmView } from "../View/GmView";

export enum ToolType {
  Drawing = "drawings",
  Ruler = "rulers",
  Fog = "fog",
  Upload = "upload",
}

@injectable()
export class ToolState {
  public constructor() {
    document.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.disableAll();
      }
    });
  }

  public enable(type: ToolType) {
    switch (type) {
      case ToolType.Drawing:
        this.getContainer().innerHTML =
          'You are using the <i class="fas fa-paint-brush-alt"></i> <strong>Drawing Tool</strong>.<br> <a href="#" class="disable-tool">Click here</a> or press escape to disable it.';
        break;
      case ToolType.Ruler:
        this.getContainer().innerHTML =
          'You are using the <i class="fas fa-ruler"></i> <strong>Ruler Tool</strong>.<br> <a href="#" class="disable-tool">Click here</a> or press escape to disable it.';
        break;
      case ToolType.Fog:
        this.getContainer().innerHTML =
          'You are using the <i class="fas fa-fog"></i> <strong>Fog of War Tool</strong>.<br> <a href="#" class="disable-tool">Click here</a> or press escape to disable it.';
        break;
      case ToolType.Upload:
        this.getContainer().innerHTML =
          "Uploading and adding your media, please wait...";
        break;
    }

    this.getContainer().style.display = "block";

    const disableBtn: HTMLElement =
      this.getContainer().querySelector(".disable-tool");

    if (disableBtn) {
      disableBtn.addEventListener("click", (e) => {
        e.preventDefault();

        this.disableAll();
      });
    }
  }

  public disableAll() {
    this.getRulerView().disableRuler();
    this.getDrawingsView().disable();
    this.getGmView().disableFogTool();
    this.disable();
  }

  public disable() {
    this.getContainer().style.display = "none";
  }

  protected getContainer(): HTMLElement {
    return document.getElementById("tools");
  }

  protected getRulerView(): RulerView {
    return container.get<RulerView>(Views.Ruler);
  }

  protected getDrawingsView(): DrawingsView {
    return container.get<DrawingsView>(Views.Drawings);
  }

  protected getGmView(): GmView {
    return container.get<GmView>(Views.Gm);
  }
}
