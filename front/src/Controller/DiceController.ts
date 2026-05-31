import { Controller } from "./Controller";
import { BaseMessage } from "../Client/Message";
import { DiceView } from "../View/DiceView";
import { container } from "../DependencyInjection/Container";
import { Views } from "../DependencyInjection/Views";
import { ChatView } from "../View/ChatView";
import { DieSkin } from "../View/Dice/DiceUtil";

export class DiceController extends Controller {
  public readonly name = "dice";

  public async clear(request: BaseMessage) {
    this.getDiceView().clear();
  }

  public async history(request: BaseMessage) {
    let rolls: any[] = request.rolls;
    rolls = rolls.reverse();

    rolls.forEach((roll) => {
      this.getDiceView().log(roll, true);
    });

    this.getDiceView().cleanDisplay();
  }

  public async load(request: BaseMessage) {
    const dice: DieSkin[] = request.dice;

    dice.forEach((die: DieSkin) => {
      this.getDiceView().load(die);
    });
  }

  public async roll(request: BaseMessage) {
    this.getDiceView().fromRequest(request);
  }

  protected getDiceView(): DiceView {
    return container.get<DiceView>(Views.Dice);
  }

  protected getChatView(): ChatView {
    return container.get<ChatView>(Views.Chat);
  }
}
