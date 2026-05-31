import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { CraftRepository } from "../Repository/CraftRepository";
import { container } from "../DependencyInjection/Container";
import { Repository } from "../DependencyInjection/Repository";
import { CraftView } from "../View/CraftView";
import { Views } from "../DependencyInjection/Views";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";

@injectable()
export class CraftController extends Controller {
  public readonly name: string = "craft";

  public async reload(request: BaseMessage) {
    this.getCraftView().lookup();
  }

  public async skin(request: BaseMessage) {
    this.getCraftRepository().setSkin(request.cid, request.skin);

    EventDispatcher.emit(Events.CRAFT_SKIN, {
      cid: request.cid,
      skin: request.skin,
    });
  }

  public async updateAvatar(request: BaseMessage) {
    const cid: number = request.cid;
    const avatar: string = request.avatar;

    this.getCraftView().updateAvatar(cid, avatar);
  }

  public async updated(request: BaseMessage) {
    const cid: number = request.cid;

    this.getCraftRepository()
      .findCached(cid)
      .then((craft: any) => {
        const property: string = request.id;
        const value: any = request.value;
        const del = !!request.del;

        if (craft.sheet) {
          craft.sheet.update(property, value, del);
        } else {
          //craft.data[property] = value;
        }
      });
  }

  protected getCraftRepository(): CraftRepository {
    return container.get<CraftRepository>(Repository.Craft);
  }

  protected getCraftView(): CraftView {
    return container.get<CraftView>(Views.Craft);
  }
}
