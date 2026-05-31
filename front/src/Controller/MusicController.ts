import { Controller } from "./Controller";
import { BaseMessage } from "../Client/Message";
import { MusicView } from "../View/MusicView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";

export class MusicController extends Controller {
  public readonly name = "music";

  public async init(request: BaseMessage) {
    this.getMusicView().initialize(request);
  }

  public async seek(request: BaseMessage) {
    this.getMusicView().seek(request.position);
  }

  public async volume(request: BaseMessage) {
    this.getMusicView().setVolume(request.volume);
  }

  public async pause() {
    this.getMusicView().pause();
  }

  public async resume() {
    this.getMusicView().resume();
  }

  public async playById(request: BaseMessage) {
    this.getClient().get(
      "music",
      "getPlaylist",
      {
        id: request.id,
      },
      (response) => {
        this.getMusicView().startPlaylist(response);
      }
    );
  }

  public async play(request: BaseMessage) {
    this.getMusicView().play(request.provider, request.id);
  }

  protected getMusicView(): MusicView {
    return container.get<MusicView>(Views.Music);
  }
}
