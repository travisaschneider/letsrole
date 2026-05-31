import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { Board } from "../Engine/Board";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";

@injectable()
export class PingController extends Controller {
  public readonly name = "ping";

  public async ping(message: BaseMessage) {
    if (document.visibilityState === "visible") {
      this.getBoard()
        .getToolLayer()
        .ping(message.position, message.user, message.color);
    }
  }

  protected getBoard(): Board {
    return container.get<Board>(Services.Board);
  }
}
