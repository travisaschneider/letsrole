import { Controller } from "./Controller";
import { BaseMessage } from "../Client/Message";
import { injectable } from "inversify";
import { container } from "../DependencyInjection/Container";
import { User } from "../Entity/User";
import { UserRepository } from "../Repository/UserRepository";
import { Repository } from "../DependencyInjection/Repository";
import { UserState } from "../State/UserState";
import { States } from "../DependencyInjection/State";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { ClusterLink } from "../Client/ClusterLink";
import { Services } from "../DependencyInjection/Services";

@injectable()
export class UserController extends Controller {
  public readonly name: string = "user";

  public pong(request: BaseMessage) {
    this.getClient().pong();
  }

  public async auth(request: BaseMessage) {
    this.getClient().setAuthInitialized(true);
    this.getClient().setReconnectToken(request.reconnectToken);

    if (request.isReconnect) {
      this.getClient().send("client", "reconnect");
    } else {
      this.getClient().send("client", "init");
    }
  }

  public async initialized() {
    if (this.getClusterLink().isLoading()) {
      this.getClusterLink().endProgress();
    }
  }

  public async forceExit(request: BaseMessage) {
    document.location.href = "/";
  }

  public async reloadAll(request: BaseMessage) {
    const users = request.users;

    this.getUserRepository().setAll(users);
  }

  public async me(request: BaseMessage) {
    const state: UserState = this.getUserState();

    state.id = request.user.id;
    state.role = request.user.role;
    state.displayName = request.user.displayName;

    EventDispatcher.emit(Events.USER_ME_LOADED);
  }

  public async joined(request: BaseMessage) {
    request.users.forEach((data: any) => {
      const user = new User();
      user.id = data.id;
      user.username = data.username;
      user.chatname = data.chatname;
      user.role = data.role;
      user.emojis = data.emojis;

      this.getUserRepository().add(user);
    });
  }

  protected getUserRepository(): UserRepository {
    return container.get<UserRepository>(Repository.UserRepository);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getClusterLink(): ClusterLink {
    return container.get<ClusterLink>(Services.ClusterLink);
  }
}
