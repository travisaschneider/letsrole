import { Controller } from "./Controller";
import { BaseMessage } from "../Client/Message";
import { DiceView } from "../View/DiceView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { ChatView } from "../View/ChatView";
import { QuickBarItemList } from "../../shared/QuickBarData";
import { QuickBarView } from "../View/QuickBarView";

export class QuickBarController extends Controller {
  public readonly name = "quickbar";

  public async load(request: BaseMessage) {
    const quickBar: QuickBarItemList = request.quickbar;

    this.getQuickBarView().load(quickBar);
  }

  protected getQuickBarView(): QuickBarView {
    return container.get<QuickBarView>(Views.QuickBar);
  }
}
