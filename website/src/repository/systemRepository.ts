import databaseService from "../service/databaseService";
import * as crypto from "node:crypto";
import config from "./../etc/config.json";
import { UpsertResult } from "mariadb";
import { System } from "../type/system";

class SystemRepository {
  public async find(id: number): Promise<System> {
    return databaseService
      .execute(`SELECT * FROM system WHERE id = ?`, [id])
      .then((res: any) => {
        return res[0] as System;
      });
  }

  public async create(url: string, data: string): Promise<number> {
    const shareKey = crypto.randomBytes(20).toString("hex").substring(0, 16);

    return databaseService
      .execute<UpsertResult>(
        `
      INSERT INTO system (author_id, game_id, name, content, is_active, share_key)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
        [config.userid, 1, url, data, 1, shareKey],
      )
      .then((result: UpsertResult) => {
        return result.insertId as number;
      });
  }
}

const systemRepository = new SystemRepository();

export default systemRepository;
