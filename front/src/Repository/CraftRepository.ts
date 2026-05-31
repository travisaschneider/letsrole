import { injectable } from "inversify";
import { UserState } from "../State/UserState";
import { container } from "../DependencyInjection/Container";
import { States } from "../DependencyInjection/State";
import { WebSocketClient } from "../Client/WebSocketClient";
import { Services } from "../DependencyInjection/Services";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { CraftSheet } from "../../shared/System/CraftSheet";
import { Tree } from "../../shared/System/Tree";

@injectable()
export class CraftRepository {
  protected crafts: Map<number, any> = new Map<number, any>();

  public add(craft: any) {
    this.crafts.set(craft.id, craft);
  }

  public setSkin(cid: number, skin: string) {
    if (this.crafts.has(cid)) {
      this.crafts.get(cid).skin = skin;
    }
  }

  public findCachedDirect(cid): any {
    if (this.crafts.has(cid)) {
      return this.crafts.get(cid);
    }

    return null;
  }

  public findCached(cid: number): Promise<any> {
    if (this.crafts.has(cid)) {
      return Promise.resolve(this.crafts.get(cid));
    }

    return Promise.reject("Not found");
  }

  public rename(cid: number, name: string) {
    if (this.crafts.has(cid)) {
      const craft: any = this.crafts.get(cid);
      craft.name = name;
    }
  }

  public find(cid: number): Promise<any> {
    if (this.crafts.has(cid)) {
      return Promise.resolve(this.crafts.get(cid));
    }

    return new Promise((fulfilled: Function, rejected: Function) => {
      this.getClient().get(
        "craft",
        "load",
        {
          id: cid,
        },
        (response: any) => {
          this.add(response.craft);

          return fulfilled(response.craft);
        }
      );
    });
  }

  public attachSheet(craft: any): any {
    const sheet = new CraftSheet(craft, this.getTree(), craft.view);
    craft.sheet = sheet;
    this.add(craft);

    return craft;
  }

  public getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getClient(): WebSocketClient {
    return container.get<WebSocketClient>(Services.WebSocketClient);
  }

  protected getTree(): Tree {
    return container.get<Tree>(Services.SystemTree);
  }
}
