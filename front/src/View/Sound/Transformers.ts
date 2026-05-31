import { injectable } from "inversify";
import { HighPitch } from "./Transformer/HighPitch";
import { Demon } from "./Transformer/Demon";
import { AudioTransformer } from "./AudioTransformer";
import { Phone } from "./Transformer/Phone";
import { Underwater } from "./Transformer/Underwater";
import { Troll } from "./Transformer/Troll";
import { BadPhone } from "./Transformer/BadPhone";
import { Speed } from "./Transformer/Speed";
import { Wobble } from "./Transformer/Wobble";
import { Announcement } from "./Transformer/Announcement";
import { Devil } from "./Transformer/Devil";
import { Robot } from "./Transformer/Robot";
import { Megaphone } from "./Transformer/Megaphone";
import { None } from "./Transformer/None";

@injectable()
export class Transformers {
  public all(): any {
    const all: any = {};

    this.getClasses().forEach((transformer: typeof AudioTransformer) => {
      all[transformer.key] = transformer.title;
    });

    return all;
  }

  public getInstance(key: string): AudioTransformer {
    let transformer: AudioTransformer;

    this.getClasses().forEach((trans: typeof AudioTransformer) => {
      if (trans.key === key) {
        transformer = new trans();
      }
    });

    return transformer;
  }

  public getClasses(): (typeof AudioTransformer)[] {
    return [
      None,
      HighPitch,
      Demon,
      Phone,
      BadPhone,
      Underwater,
      Troll,
      Speed,
      Wobble,
      Announcement,
      Devil,
      Robot,
      Megaphone,
    ];
  }
}
