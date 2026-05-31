import { injectable, multiInject } from "inversify";
import { Views } from "../DependencyInjection/Views";
import { View } from "./View";
import $ = require("jquery");

@injectable()
export class ViewManager {
  protected views: View[];

  public constructor(@multiInject(Views.View) views: View[]) {
    this.views = views;
  }

  public init() {
    $(() => {
      this.views.forEach((view: View) => {
        view.init();
      });
    });
  }
}
