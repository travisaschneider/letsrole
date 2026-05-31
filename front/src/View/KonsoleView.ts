import { injectable } from "inversify";
import { View } from "./View";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { UserState } from "../State/UserState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { DockableView, ViewOpenMode } from "./DockableView";
import { Template } from "./Template";
import { Konsole } from "../../shared/Konsole";
import { TaskBarCategory, TaskBarItem } from "./TaskBar/TaskBarItem";
import { MenuView } from "./MenuView";
import { Views } from "../DependencyInjection/Views";

@injectable()
export class KonsoleView extends View {
  protected view: DockableView;
  protected taskBarItem: TaskBarItem;

  public init() {
    EventDispatcher.on(Events.USER_ME_LOADED, (e) => {
      if (this.getUserState().isBuilder()) {
        this.run();
      }
    });
  }

  public run() {
    this.taskBarItem = new TaskBarItem(
      this.__("Console"),
      "fas fa-terminal",
      TaskBarCategory.Tool
    );

    this.view = new DockableView({
      id: "konsole",
      title: this.__("Console"),
      html: Template.render("konsole/view.html.njk"),
      mode: ViewOpenMode.DockRight,
      fixed: true,
      icon: "fas fa-terminal",
      taskBarItem: this.taskBarItem,
      defaultConfiguration: {
        index: 15,
        hidden: false,
        minimized: true,
        mode: ViewOpenMode.DockLeft,
      },
    });

    this.getTaskBarView().add(this.taskBarItem);

    this.view.open();
    this.getUi().register(this.view);

    const container: HTMLElement = document.getElementById("konsole-container");

    Konsole.setContainer(container);

    Konsole.onMessage(() => {
      container.scrollTo(0, container.scrollHeight);
    });
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getTaskBarView(): MenuView {
    return container.get<MenuView>(Views.TaskBar);
  }
}
