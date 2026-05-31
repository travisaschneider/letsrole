import crypto from "node:crypto";
import databaseService from "../service/databaseService";
import { UpsertResult } from "mariadb";
import config from "./../etc/config.json";
import { GameTable } from "../type/table";

class GameTableRepository {
  async find(id: string): Promise<GameTable> {
    return databaseService
      .execute(`SELECT * FROM game_table WHERE id = ?`, [id])
      .then((res: any) => {
        return res[0] as GameTable;
      });
  }

  async getCharacterIdAtTable(
    userId: number,
    tableId: string,
  ): Promise<number | undefined> {
    return databaseService
      .execute(
        `
        SELECT character_id
        FROM game_table_character
        WHERE table_id = ?
          AND user_id = ?`,
        [tableId, userId],
      )
      .then((res: any) => {
        return (res[0]?.character_id as number) ?? undefined;
      });
  }

  async getTableUserId(userId: number, role: string): Promise<number | null> {
    return databaseService
      .execute(
        `
        SELECT id
        FROM game_table_user
        WHERE user_id = ?
            AND role = ?
        `,
        [userId, role],
      )
      .then((res: any) => {
        return (res[0]?.id as number) ?? null;
      });
  }

  async findAll(): Promise<GameTable[]> {
    return databaseService.execute(`SELECT * FROM game_table`);
  }

  async create(name: string, systemId: number) {
    const joinKey = crypto.randomBytes(20).toString("hex").substring(0, 16);
    const id = crypto.randomBytes(20).toString("hex").substring(0, 8);

    await databaseService.execute(
      `
      INSERT INTO game_table (id, name, join_key, createdBy_id, type, system_id, is_archived, is_deleted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [id, name, joinKey, config.userid, "game", systemId, 0, 0, this.now()],
    );

    await this.createScene(id);
    await this.linkUser(id);
    await this.createAndLinkCharacters(id, systemId);
  }

  private now(): number {
    return Math.floor(+new Date() / 1000);
  }

  async createAndLinkCharacters(tableId: string, systemId: number) {
    const sql = `
      INSERT INTO player_character (user_id, name, data, type, system_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    const linkSql = `
      INSERT INTO game_table_character (character_id, table_id, user_id)
      VALUES (?, ?, ?)
    `;

    const res1 = await databaseService.execute<UpsertResult>(sql, [
      config.userid,
      "Character 1",
      "{}",
      "normal",
      systemId,
    ]);
    const res2 = await databaseService.execute<UpsertResult>(sql, [
      config.userid,
      "Character 2",
      "{}",
      "normal",
      systemId,
    ]);
    const res3 = await databaseService.execute<UpsertResult>(sql, [
      config.userid,
      "Character 3",
      "{}",
      "normal",
      systemId,
    ]);

    await databaseService.execute(linkSql, [
      res1.insertId,
      tableId,
      config.userid,
    ]);
    await databaseService.execute(linkSql, [
      res2.insertId,
      tableId,
      config.userid,
    ]);
    await databaseService.execute(linkSql, [
      res3.insertId,
      tableId,
      config.userid,
    ]);
  }

  async linkUser(tableId: string) {
    const sql = `
      INSERT INTO game_table_user (user_id, table_id, role)
      VALUES (?, ?, ?)
    `;

    await databaseService.execute(sql, [config.userid, tableId, "gm"]);
    await databaseService.execute(sql, [config.userid, tableId, "player"]);
  }

  async createScene(tableId: string) {
    const bgId: string = crypto.randomUUID();
    const drawId: string = crypto.randomUUID();
    const tokenId: string = crypto.randomUUID();

    const data = {
      width: 1920,
      height: 1080,
      backgroundColor: "#ffffff",
      layers: {
        [bgId]: {
          key: bgId,
          name: "Background",
          locked: false,
          token: false,
          gm: false,
          lighting: false,
          visible: true,
          items: {},
          position: 0,
        },
        [drawId]: {
          key: drawId,
          name: "Drawings",
          locked: false,
          token: false,
          gm: false,
          lighting: false,
          visible: true,
          items: {},
          position: 1,
          drawings: true,
        },
        [tokenId]: {
          key: tokenId,
          name: "Tokens",
          locked: false,
          token: true,
          gm: false,
          lighting: false,
          visible: true,
          items: {},
          position: 2,
        },
      },
      grid: {
        enabled: false,
        type: "square",
        size: 100,
        color: "#000000",
        opacity: 0.7,
        snap: true,
      },
      metrics: {
        baseCount: 1,
        baseType: "unit",
        equalCount: 5,
        equalType: "ft",
      },
      fog: { enabled: false, points: [] },
    };

    return databaseService.execute(
      `
      INSERT INTO scene (author_id, name, data, created_at, table_id)
      VALUES (?, ?, ?, ?, ?)
    `,
      [config.userid, "Default scene", data, this.now(), tableId],
    );
  }
}

const gameTableRepository = new GameTableRepository();

export default gameTableRepository;
