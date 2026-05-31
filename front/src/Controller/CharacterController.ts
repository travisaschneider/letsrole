import { Controller } from "./Controller";
import { BaseMessage } from "../Client/Message";
import { inject, injectable } from "inversify";
import { Constants } from "../DependencyInjection/Constants";
import { CharacterView } from "../View/CharacterView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { CharacterRepository } from "../Repository/CharacterRepository";
import { Repository } from "../DependencyInjection/Repository";
import { CharacterState } from "../State/CharacterState";
import { States } from "../DependencyInjection/State";
import { Services } from "../DependencyInjection/Services";
import { CharacterSheet } from "../../shared/System/CharacterSheet";
import { Tree } from "../../shared/System/Tree";
import { EventDispatcher } from "../Event/EventDispatcher";
import { Events } from "../Event/Events";
import { SceneState } from "../State/SceneState";
import { CraftView } from "../View/CraftView";
import { PartialCharacter } from "../Entity/PartialCharacter";

@injectable()
export class CharacterController extends Controller {
  public readonly name: string = "character";
  protected domId: string;

  public constructor(@inject(Constants.CharacterColId) domId: string) {
    super();

    this.domId = domId;
  }

  public async skin(request: BaseMessage) {
    EventDispatcher.emit(Events.CHARACTER_SKIN, {
      cid: request.cid,
      skin: request.skin,
    });
  }

  public async skins(request: BaseMessage) {
    this.getCharacterView().loadSkins(request.skins);
    this.getCraftView().loadSkins(request.skins);
  }

  public async colorChanged(request: BaseMessage) {
    EventDispatcher.emit(Events.CHARACTER_COLOR_CHANGED, {
      cid: request.cid,
      color: request.color,
    });
  }

  public async clear(request: BaseMessage) {
    this.getCharacterView().clear();
  }

  public async all(request: BaseMessage) {
    const view: CharacterView = this.getCharacterView();

    request.characters.forEach((character: PartialCharacter) => {
      view.addToList(character);
    });
  }

  public async leave(request: BaseMessage) {
    const cid: number = request.cid;
    this.getCharacterView().removeFromList(cid);
  }

  public async updated(request: BaseMessage) {
    const cid: number = request.cid;
    const property: string = request.id;
    const value: any = request.value;
    const del = !!request.del;

    const repo: CharacterRepository = this.getCharacterRepository();

    if (repo.isLoaded(cid)) {
      const sheet: CharacterSheet = await repo.get(cid);
      sheet.update(property, value, del);
    }
  }

  public async multiUpdated(request: BaseMessage) {
    const cid: number = request.cid;
    const data: any = request.data;

    const repo: CharacterRepository = this.getCharacterRepository();

    if (repo.isLoaded(cid)) {
      const sheet: CharacterSheet = await repo.get(cid);

      for (const key in data) {
        sheet.update(key, data[key]);
      }
    }
  }

  public async updateAvatar(request: BaseMessage) {
    const cid: number = request.cid;
    const avatar: string = request.avatar;

    this.getCharacterView().updateAvatar(cid, avatar);
  }

  public async load(request: BaseMessage) {
    const view: CharacterView = this.getCharacterView();

    request.characters.forEach((character: any) => {
      view.addToList(character);
      this.getCharacterRepository().add(character);
    });
  }

  public async join(request: BaseMessage) {
    const character: PartialCharacter = request.character;

    this.getCharacterRepository().clear(character.id);

    this.getCharacterView().addToList(character);

    EventDispatcher.emit(Events.CHARACTER_RELOAD_SHEET, {
      id: character.id,
    });
  }

  public async me(request: BaseMessage) {
    const character: any = request.character;
    character.idle = false;

    const sheet: CharacterSheet = this.getCharacterRepository().add(character);

    this.getCharacterState().sheet = sheet;
  }

  protected getCharacterRepository(): CharacterRepository {
    return container.get<CharacterRepository>(Repository.CharacterRepository);
  }

  protected getCharacterView(): CharacterView {
    return container.get<CharacterView>(Views.Character);
  }

  protected getCraftView(): CraftView {
    return container.get<CraftView>(Views.Craft);
  }

  protected getCharacterState(): CharacterState {
    return container.get<CharacterState>(States.Character);
  }

  protected getTree(): Tree {
    return container.get<Tree>(Services.SystemTree);
  }

  protected getSceneState(): SceneState {
    return container.get<SceneState>(States.Scene);
  }
}
