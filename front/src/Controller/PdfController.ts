import { Controller } from "./Controller";
import { injectable } from "inversify";
import { BaseMessage } from "../Client/Message";
import { PdfView } from "../View/PdfView";
import { Views } from "../DependencyInjection/Views";
import { container } from "../DependencyInjection/Container";

@injectable()
export class PdfController extends Controller {
  public readonly name = "pdf";

  public listing(message: BaseMessage) {
    this.getPdfView().lookup(message);
  }

  protected getPdfView(): PdfView {
    return container.get<PdfView>(Views.Pdf);
  }
}
