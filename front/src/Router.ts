import { injectable, multiInject } from "inversify";
import { Controller } from "./Controller/Controller";
import { Controllers } from "./DependencyInjection/Controllers";
import { BaseMessage } from "./Client/Message";

@injectable()
export class Router {
  protected controllers: Map<string, Controller> = new Map<
    string,
    Controller
  >();

  public constructor(
    @multiInject(Controllers.Controller) controllers: Controller[]
  ) {
    for (const i in controllers) {
      const controller = controllers[i];

      this.controllers.set(controller.name, controller);
    }
  }

  public async dispatch(message: BaseMessage) {
    if (!this.controllers.has(message.c)) {
      throw new Error("Unknown controller " + message.c);
    }

    const controller = this.controllers.get(message.c);

    if (typeof controller[message.a] !== "function") {
      throw new Error("Unknown action " + message.c + "." + message.a);
    }

    controller[message.a].call(controller, message);
  }
}
