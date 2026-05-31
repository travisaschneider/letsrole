import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { SoundPlayer } from "../View/Sound/SoundPlayer";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { SoundView } from "../View/SoundView";
import { Views } from "../DependencyInjection/Views";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";

@injectable()
export class SoundController extends Controller {
  public readonly name = "sound";

  public async reload(message: BaseMessage) {
    EventDispatcher.emit(Events.SOUND_PLAYLIST_RELOAD, {
      pid: message.pid,
    });
  }

  public async prevent(message: BaseMessage) {
    const prevent = !!message.prevent;

    this.getSoundView().prevent(prevent);
  }

  public async play(message: BaseMessage) {
    const path: string = message.path;
    const key: string = message.key;

    this.getSoundPlayer().play(path, key);
  }

  public async stop(message: BaseMessage) {
    const key: string = message.key;

    this.getSoundPlayer().stop(key);
  }

  protected getSoundPlayer(): SoundPlayer {
    return container.get<SoundPlayer>(Services.SoundPlayer);
  }

  protected getSoundView(): SoundView {
    return container.get<SoundView>(Views.Sound);
  }
}
