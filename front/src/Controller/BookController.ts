import { injectable } from "inversify";
import { Controller } from "./Controller";
import { BaseMessage } from "../Client/Message";
import { BookView } from "../View/BookView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";

@injectable()
export class BookController extends Controller {
  public readonly name: string = "book";

  public async init(request: BaseMessage) {
    this.getBookView().setBooks(request.books);
  }

  protected getBookView(): BookView {
    return container.get<BookView>(Views.Book);
  }
}
