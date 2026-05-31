import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";

@injectable()
export class MediaController extends Controller {
  public readonly name = "media";

  public async reload(message: BaseMessage) {
    EventDispatcher.emit(Events.MEDIA_RELOAD, message);
  }
}
