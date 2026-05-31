import express, { Request } from "express";
import { System } from "../type/system";
import systemRepository from "../repository/systemRepository";
import { GameTable } from "../type/table";
import gameTableRepository from "../repository/gameTableRepository";
import translations from "../../locales/app/en.json";
import { Token } from "../type/token";
import playService from "../service/playService";
import config from "./../etc/config.json";

const router = express.Router();

interface PlayRequest {
  tableId: string;
  role: string;
}

router.get("/:tableId/:role", async (req: Request<PlayRequest>, res) => {
  const tableId: string = req.params.tableId;
  const role: string = req.params.role;
  const table: GameTable = await gameTableRepository.find(tableId);
  let characterId: number | undefined;

  if (!table) {
    throw new Error("Could not find this table");
  }

  const system: System = await systemRepository.find(table.system_id);

  if (!system) {
    throw new Error("Could not find system");
  }

  const tableUserId: number | null = await gameTableRepository.getTableUserId(
    config.userid,
    role,
  );

  if (!tableUserId) {
    throw new Error("Could not find you at this table");
  }

  if (role === "player") {
    characterId = await gameTableRepository.getCharacterIdAtTable(
      config.userid,
      tableId,
    );

    if (!characterId) {
      throw new Error("Could not find character id");
    }
  }

  const options: Token = {
    table_id: table.id,
    user_id: config.userid,
    role: role,
    locale: "en",
    table_user_id: tableUserId,
    character_id: characterId,
    dice: {
      id: 35,
      name: "Default",
      path: "default.gltf",
    },
  };

  const token: Token = await playService.generateToken(options);

  res.render("play.html.njk", {
    role: role,
    table: table,
    system: system,
    translations: JSON.stringify(translations),
    token: token,
  });
});

export default router;
