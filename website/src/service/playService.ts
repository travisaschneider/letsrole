import { Token } from "../type/token";
import crypto from "node:crypto";
import cacheService from "./cacheService";

class PlayService {
  protected static readonly TokenTTL: number = 60;

  async generateToken(options: Token): Promise<Token> {
    const id: string = crypto.randomBytes(64).toString("hex").substring(0, 32);
    const key: string = "user_token_" + id;

    return new Promise<Token>((resolve: Function, reject: Function) => {
      cacheService
        .getClient()
        .set(
          key,
          JSON.stringify(options),
          "EX",
          PlayService.TokenTTL,
          (err: Error | null) => {
            if (err) {
              return reject();
            }

            options.id = id;

            return resolve(options);
          },
        );
    });
  }
}

const playService = new PlayService();

export default playService;
