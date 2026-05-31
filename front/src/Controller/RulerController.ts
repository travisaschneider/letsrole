import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { RulerView } from "../View/RulerView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";

@injectable()
export class RulerController extends Controller {
  public readonly name = "ruler";

  public async share(message: BaseMessage) {
    this.getRulerView().display(message.user, message.name, message.payload);
  }

  public async clear(message: BaseMessage) {
    this.getRulerView().detach(message.user);
  }

  protected getRulerView(): RulerView {
    return container.get<RulerView>(Views.Ruler);
  }
}
