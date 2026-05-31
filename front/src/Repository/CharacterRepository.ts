import { injectable } from "inversify";
import { WebSocketClient } from "../Client/WebSocketClient";
import { container } from "../DependencyInjection/Container";
import { Services } from "../DependencyInjection/Services";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { Tree } from "../../shared/System/Tree";
import { UserState } from "../State/UserState";
import { User } from "../Entity/User";
import { States } from "../DependencyInjection/State";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";

@injectable()
export class CharacterRepository {
  protected characters: Map<number, CharacterSheet> = new Map<
    number,
    CharacterSheet
  >();
  protected loading: Map<number, boolean> = new Map<number, boolean>();

  public canAccess(sheet: CharacterSheet): boolean {
    if (this.getUserState().isGm()) {
      return true;
    }

    if (this.getUserState().id == sheet.getUserId()) {
      return true;
    }

    return false;
  }

  public async get(id: number): Promise<CharacterSheet> {
    if (this.characters.has(id)) {
      return Promise.resolve(this.characters.get(id));
    }

    const loadedEvent: string = Events.CHARACTER_LOADED + "-" + id.toString(10);

    if (this.loading.has(id)) {
      return new Promise((resolve: Function, reject: Function) => {
        EventDispatcher.once(loadedEvent, () => {
          return resolve(this.characters.get(id));
        });
      });
    }

    this.loading.set(id, true);

    return new Promise((resolve: Function, reject: Function) => {
      this.getClient().get(
        "character",
        "load",
        {
          cid: id,
        },
        (response) => {
          const data: any = JSON.parse(JSON.stringify(response.character));
          const sheet: CharacterSheet = this.add(data);

          this.loading.delete(id);

          EventDispatcher.emit(loadedEvent, {
            sheet: sheet,
          });

          return resolve(sheet);
        }
      );
    });
  }

  public all(): Map<number, CharacterSheet> {
    return this.characters;
  }

  public clear(id: number) {
    this.characters.delete(id);
  }

  public add(data: any): CharacterSheet {
    const id: number = data.id;

    const sheet: CharacterSheet = new CharacterSheet(
      data,
      this.getTree(),
      this.getTree().mainSourceId
    );
    data.sheet = sheet;

    /*if (this.characters.has(id)) {
            console.log(`Reloading character ${id}`);
        } else {
            console.log(`Adding character ${id}`);
        }*/

    this.characters.set(id, sheet);

    return sheet;
  }

  public isLoaded(id: number): boolean {
    return this.characters.has(id);
  }

  protected getUserState(): UserState {
    return container.get<UserState>(States.User);
  }

  protected getClient(): WebSocketClient {
    return container.get<WebSocketClient>(Services.WebSocketClient);
  }

  protected getTree(): Tree {
    return container.get<Tree>(Services.SystemTree);
  }
}
