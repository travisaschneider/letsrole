import { inject, injectable } from "inversify";
import { BaseMessage } from "./Message";
import { Services } from "../DependencyInjection/Services";
import { Router } from "../Router";
import { container } from "../DependencyInjection/Container";
import { ChatSystemUser, ChatView } from "../View/ChatView";
import { Views } from "../DependencyInjection/Views";
import { v4 as Uuid } from "uuid";
import { ClusterLink } from "./ClusterLink";
import { Template } from "../View/Template";
import { ErrorCode } from "../../shared/ErrorCode";

@injectable()
export class WebSocketClient {
  protected static readonly RECONNECT_TIMEOUT = 2000;
  protected static readonly ConnectTimeout = 10000;
  protected static readonly PingTimout = 5000;
  protected static readonly PingInterval = 12000;
  protected static readonly ReconnectingFailTimeout = 3000;

  protected configuration: any;
  protected ws: WebSocket;
  protected router: Router;
  protected messageBag: any[] = [];
  protected callbacks: Map<string, Function> = new Map<string, Function>();
  protected connectTimeout: any;
  protected authInitialized = false;
  protected pingTimeout: any;
  protected reconnectToken: string;
  protected isReconnecting = false;

  public constructor(@inject(Services.Router) router: Router) {
    this.router = router;
  }

  public init(configuration: any) {
    this.configuration = configuration;
  }

  public get(
    controller: string,
    action: string,
    message: any,
    callback: Function
  ) {
    const id: string = Uuid();

    message.c = controller;
    message.a = action;
    message.callbackid = id;

    this.callbacks.set(id, callback);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.doSend(message);
    } else {
      this.messageBag.push(message);
    }
  }

  public send(controller: string, action: string, message: any = {}) {
    message.c = controller;
    message.a = action;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.doSend(message);
    } else {
      this.messageBag.push(message);
    }
  }

  protected doSend(message: any) {
    this.ws.send(JSON.stringify(message));
  }

  public connect() {
    let url: string = this.getWsUrl();
    url += "?token=" + this.getArchitect().token;

    this.ws = new WebSocket(url);
    this.initWs();
  }

  protected getWsUrl(): string {
    const cluster = this.getArchitect().cluster;
    return cluster.host + ":" + cluster.port.toString(10) + "/";
  }

  public reconnect() {
    if (this.ws) {
      this.ws = null;
    }

    this.isReconnecting = true;

    let url: string = this.getWsUrl();
    url += "?reconnect=" + this.reconnectToken;

    setTimeout(() => {
      if (this.isReconnecting) {
        this.ws.close();

        document.location.reload();
      }
    }, WebSocketClient.ReconnectingFailTimeout);

    this.ws = new WebSocket(url);
    this.initWs();
  }

  protected initWs() {
    const chat: ChatView = container.get<ChatView>(Views.Chat);

    this.connectTimeout = setTimeout(() => {
      console.error("connectTimeout");
      if (this.authInitialized) {
        return;
      }

      if (this.getClusterLink().isLoading()) {
        this.ws.close(ErrorCode.InitTimeout);
        return;
      }
    }, WebSocketClient.ConnectTimeout);

    this.ws.addEventListener("close", (event: CloseEvent) => {
      console.error(event);

      if (this.getClusterLink().isLoading()) {
        this.getClusterLink().error(
          Template.__(
            "An error occurred while connecting to the real-time server."
          ),
          event.code
        );
        return;
      }

      chat.add({
        from: ChatSystemUser.Error,
        message: Template.__("Connection to the server has been lost."),
      });
    });

    this.ws.addEventListener("error", (evt: any) => {
      console.error(evt);
      if (this.getClusterLink().isLoading()) {
        this.getClusterLink().error(
          Template.__(
            "An error occurred while connecting to the real-time server."
          ),
          ErrorCode.InitError
        );
      }
    });

    this.ws.addEventListener("open", () => {
      /*if (this.messageBag.length > 0) {
                console.debug(`Sending ${this.messageBag.length} missed message(s)`);

                let message: any;

                while (message = this.messageBag.shift()) {
                    this.doSend(message);
                }
            }*/

      if (this.getClusterLink().isLoading()) {
        this.getClusterLink().increaseProgress(40);
      } else {
        chat.add({
          from: ChatSystemUser.Notice,
          message: Template.__("Reconnected to servers"),
        });
      }

      this.isReconnecting = false;

      setTimeout(() => {
        this.ping();
      }, WebSocketClient.PingInterval);
    });

    this.ws.addEventListener("message", async (message: MessageEvent) => {
      let msg: any;

      try {
        msg = JSON.parse(message.data);
      } catch (e) {
        console.error(e);
        return;
      }

      if (msg.a !== undefined && msg.c !== undefined) {
        return this.router.dispatch(msg);
      } else if (msg.callbackid !== undefined) {
        if (this.callbacks.has(msg.callbackid)) {
          this.callbacks.get(msg.callbackid)(msg);
          this.callbacks.delete(msg.callbackid);
        }
      }
    });
  }

  protected getArchitect(): Architect {
    return window["architect"];
  }

  protected ping() {
    this.send("client", "ping");

    this.pingTimeout = setTimeout(() => {
      this.reconnect();
    }, WebSocketClient.PingTimout);
  }

  public pong() {
    clearTimeout(this.pingTimeout);
    this.isReconnecting = false;

    setTimeout(() => {
      this.ping();
    }, WebSocketClient.PingInterval);
  }

  public setAuthInitialized(initialized: boolean) {
    this.authInitialized = initialized;
  }

  public setReconnectToken(token: string) {
    this.reconnectToken = token;
  }

  protected getClusterLink(): ClusterLink {
    return container.get<ClusterLink>(Services.ClusterLink);
  }
}

export interface Architect {
  cluster: {
    host: string;
    port: number;
    region: string;
    name: string;
  };
  token: string;
  role: string;
  table: string;
}
