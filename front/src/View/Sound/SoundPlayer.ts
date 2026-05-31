import { injectable } from "inversify";
import { WebSocketClient } from "../../Client/WebSocketClient";
import { container } from "../../DependencyInjection/Container";
import { Services } from "../../DependencyInjection/Services";
import { SoundView } from "../SoundView";

@injectable()
export class SoundPlayer {
  protected _volume = 0.8;
  protected registry: Map<string, HTMLAudioElement> = new Map<
    string,
    HTMLAudioElement
  >();

  public stop(key: string) {
    if (this.registry.has(key)) {
      const audio: HTMLAudioElement = this.registry.get(key);
      audio.pause();
      this.registry.delete(key);
    }
  }

  public stopAll() {
    this.registry.forEach((sound: HTMLAudioElement, key: string) => {
      this.stop(key);
    });
  }

  public set volume(volume: number) {
    if (volume > 1) {
      volume = 1;
    }

    this._volume = volume;

    this.registry.forEach((audio: HTMLAudioElement) => {
      audio.volume = SoundView.transformVolume(this.volume * 100) / 100;
    });
  }

  public get volume(): number {
    return this._volume;
  }

  public dispatchStop(key: string) {
    this.getClient().send("sound", "stop", {
      key: key,
    });
  }

  public dispatch(
    path: string,
    onEnd: Function = null
  ): Promise<HTMLAudioElement> {
    const promise: Promise<HTMLAudioElement> = new Promise(
      (resolve, reject) => {
        this.getClient().get(
          "sound",
          "play",
          {
            path: path,
          },
          (response) => {
            return resolve(this.play(response.path, response.key, onEnd));
          }
        );
      }
    );

    return promise;
  }

  public play(
    path: string,
    key: string,
    onEnd: Function = null
  ): Promise<HTMLAudioElement> {
    const url: string = window["configuration"]["cdnReadUrl"] + "/" + path;
    const audio = new Audio(url);

    this.registry.set(key, audio);

    audio.volume = SoundView.transformVolume(this.volume * 100) / 100;
    audio.dataset.key = key;

    audio.addEventListener("ended", (e) => {
      if (onEnd !== null) {
        onEnd(audio);
      }

      this.registry.delete(key);
    });

    audio.play();

    return Promise.resolve(audio);
  }

  protected getClient(): WebSocketClient {
    return container.get<WebSocketClient>(Services.WebSocketClient);
  }
}
