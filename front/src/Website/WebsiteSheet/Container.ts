import { Container } from "inversify";
import { Services } from "./Services";
import { Tree } from "../../../shared/System/Tree";
import { Tables } from "../../../shared/System/Tables";
import { CodeExecutor } from "../../../shared/System/CodeExecutor";
import { Translator } from "../../../shared/System/Translator";
import { CharacterSkinLoader } from "../../View/Character/CharacterSkinLoader";
import { RollState } from "../../State/RollState";
import { DiceExpressionHelper } from "../../View/Dice/DiceExpressionHelper";

const container = new Container({
  defaultScope: "Singleton",
});

// Services
container.bind<Tree>(Services.SystemTree).to(Tree);
container.bind<Tables>(Services.SystemTables).to(Tables);
container.bind<CodeExecutor>(Services.CodeExecutor).to(CodeExecutor);
container.bind<Translator>(Services.SystemTranslator).to(Translator);
container
  .bind<CharacterSkinLoader>(Services.CharacterSkinLoader)
  .to(CharacterSkinLoader);

container.bind<RollState>(Services.RollState).to(RollState);
container
  .bind<DiceExpressionHelper>(Services.DiceExpressionHelper)
  .to(DiceExpressionHelper);

export { container };
