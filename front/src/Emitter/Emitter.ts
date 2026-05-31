import { injectable } from "inversify";
import { WebSocketClient } from "../Client/WebSocketClient";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";

@injectable()
export abstract class Emitter {
  public abstract init();

  protected getClient(): WebSocketClient {
    return container.get<WebSocketClient>(Services.WebSocketClient);
  }
}
