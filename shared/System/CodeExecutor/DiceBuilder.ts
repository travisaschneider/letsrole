import { Plus } from "./DiceBuilder/Plus";
import { Dice } from "./DiceBuilder/Dice";
import { Minus } from "./DiceBuilder/Minus";
import { Div } from "./DiceBuilder/Div";
import { Mul } from "./DiceBuilder/Mul";
import { Keeph } from "./DiceBuilder/Keeph";
import { Keepl } from "./DiceBuilder/Keepl";
import { Tag } from "./DiceBuilder/Tag";

export class DiceBuilder {
  public static plus(...args): Plus {
    return new Plus(...args);
  }

  public static minus(...args): Minus {
    return new Minus(...args);
  }

  public static div(...args): Div {
    return new Div(...args);
  }

  public static mul(...args): Mul {
    return new Mul(...args);
  }

  public static dice(...args): Dice {
    return new Dice(...args);
  }

  public static keeph(...args): Keeph {
    return new Keeph(...args);
  }

  public static keepl(...args): Keepl {
    return new Keepl(...args);
  }

  public static tag(...args): Tag {
    return new Tag(...args);
  }
}
