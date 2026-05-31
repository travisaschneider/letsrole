import { injectable } from "inversify";
import { container } from "../DependencyInjection/Container";
import { WebSocketClient } from "./WebSocketClient";
import { Services } from "../DependencyInjection/Services";
import { Template } from "../View/Template";
import { ErrorCode } from "../../shared/ErrorCode";

@injectable()
export class ClusterLink {
  public static readonly LoadingDelay: number = 500;

  protected loading = true;
  protected clearTimeout: any;
  protected progressInterval: any;

  public connect() {
    //const conf = window["architect"];
    //const url = conf.cluster.host + ":" + conf.cluster.port;
    this.increaseProgress(25);
    this.getWebSocketClient().connect();
  }

  public error(message: string, code: number) {
    clearInterval(this.progressInterval);
    clearTimeout(this.clearTimeout);

    const status: HTMLElement = document.getElementById("loading-status");

    (status.querySelector(".progress-bar") as HTMLElement).style.width = "100%";
    status.classList.add("error");
    status.querySelector("span").innerText =
      message + " (code " + code.toString(10) + ")";

    const infos: HTMLElement = document.querySelector(
      ".connecting-error-message"
    );
    infos.classList.add("active");
  }

  public endProgress() {
    const finalTime: number = new Date().getTime() + ClusterLink.LoadingDelay;

    this.clearTimeout = setTimeout(() => {
      clearInterval(this.progressInterval);
      this.closeLoadingView();
    }, ClusterLink.LoadingDelay);

    this.progressInterval = setInterval(() => {
      const now: number = new Date().getTime();
      let percent: number =
        150 - ((finalTime - now) / ClusterLink.LoadingDelay) * 100;

      if (percent > 100) {
        percent = 100;
      }

      this.increaseProgress(percent);
    }, 50);
  }

  public increaseProgress(percent: number) {
    const status: HTMLElement = document.querySelector(
      "#loading-status .progress-bar"
    );
    status.style.width = percent.toString(10) + "%";
  }

  protected closeLoadingView() {
    const connecting: HTMLElement = document.getElementById("connecting");
    connecting.classList.add("fadeout");

    setTimeout(() => {
      connecting.remove();
      this.loading = false;
    }, 4000);
  }

  public isLoading(): boolean {
    return this.loading;
  }

  protected getWebSocketClient(): WebSocketClient {
    return container.get<WebSocketClient>(Services.WebSocketClient);
  }
}
