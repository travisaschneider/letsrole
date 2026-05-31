import { injectable, multiInject } from "inversify";
import { Emitters } from "../DependencyInjection/Emitters";
import { Emitter } from "./Emitter";

@injectable()
export class EmitterManager {
  protected emitters: Emitter[];

  public constructor(@multiInject(Emitters.Emitter) emitters: Emitter[]) {
    this.emitters = emitters;
  }

  public init() {
    this.emitters.forEach((emitter: Emitter) => emitter.init());
  }
}
