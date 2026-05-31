import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { container } from "../DependencyInjection/Container";
import { JournalView } from "../View/JournalView";
import { Views } from "../DependencyInjection/Views";

@injectable()
export class JournalController extends Controller {
  public readonly name: string = "journal";

  protected reloadTimeout;

  public async updateSharing(message: BaseMessage) {
    return this.getJournalView().onSharingUpdate(
      message.id,
      message.sharing,
      message.isOwner
    );
  }

  public async icon(message: BaseMessage) {
    return this.getJournalView().updateIcon(message.id, message.icon);
  }

  public async refresh(message: BaseMessage) {
    return this.reload(message);
  }

  public async reload(message: BaseMessage) {
    clearTimeout(this.reloadTimeout);

    this.reloadTimeout = setTimeout(() => {
      this.getJournalView().loadList();
    }, 1000);
  }

  public async update(message: BaseMessage) {
    this.getJournalView().update(message.id, message.values);
  }

  public async show(message: BaseMessage) {
    const id: number = message.id;
    const title: string = message.title;

    return this.getJournalView().openPage({
      id,
      title,
    });
  }

  public change(message: BaseMessage) {
    //removed with ckeditor
  }

  protected getJournalView(): JournalView {
    return container.get<JournalView>(Views.Encyclopedia);
  }
}
