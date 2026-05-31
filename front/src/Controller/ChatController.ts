import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { ChatMessage, ChatView } from "../View/ChatView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { Services } from "../DependencyInjection/Services";

@injectable()
export class ChatController extends Controller {
  public readonly name: string = "chat";

  public async xcard(request: BaseMessage) {
    this.getChatView().displayXCard(request.reason);
  }

  public async typing(request: BaseMessage) {
    this.getChatView().displayTypings(request.users);
  }

  public async clear(request: BaseMessage) {
    this.getChatView().clear();
  }

  public async load(request: BaseMessage) {
    this.getChatView().loadHistory(request.history);
  }

  public async say(request: BaseMessage) {
    const msg: ChatMessage = {
      from: request.from,
      fromId: request.fromId,
      toId: request.toId,
      to: request.to,
      message: request.message,
      bindings: request.bindings,
      character: request.character,
      page: request.page,
      me: request.me,
      at: request.sent_at ? new Date(request.sent_at * 1000) : new Date(),
    };

    this.getChatView().add(msg);
  }

  protected getChatView(): ChatView {
    return container.get<ChatView>(Views.Chat);
  }
}
