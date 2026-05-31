import { User } from "../Entity/User";
import { injectable } from "inversify";
import { WebSocketClient } from "../Client/WebSocketClient";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";

@injectable()
export class UserRepository {
  protected users: Map<number, User> = new Map<number, User>();

  public find(id: number): User {
    return this.users.get(id);
  }

  public load(id: number): Promise<User> {
    if (this.users.has(id)) {
      return Promise.resolve(this.users.get(id));
    }

    return new Promise<User>((resolve, reject) => {
      this.getClient().get(
        "user",
        "load",
        {
          id: id,
        },
        (response) => {
          if (response.user == false) {
            return reject();
          }

          const user: User = response.user;

          this.add(user);

          resolve(user);
        }
      );
    });
  }

  public setAll(users: any[]) {
    for (const i in users) {
      this.add(users[i]);
    }
  }

  public findAll(): Map<number, User> {
    return this.users;
  }

  public toArray(): any[] {
    const arr: any[] = [];

    this.findAll().forEach((user: any) => {
      arr.push(user);
    });

    return arr;
  }

  public add(user: User) {
    if (this.users.has(user.id)) {
      this.users.delete(user.id);
    }

    this.users.set(user.id, user);
  }

  protected getClient(): WebSocketClient {
    return container.get<WebSocketClient>(Services.WebSocketClient);
  }
}
