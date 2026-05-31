import { injectable } from "inversify";
import { WebSocketClient } from "../Client/WebSocketClient";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";

@injectable()
export abstract class Controller {
  public abstract readonly name: string;

  protected getClient(): WebSocketClient {
    return container.get<WebSocketClient>(Services.WebSocketClient);
  }
}
