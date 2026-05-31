import express, { Request, Response } from "express";
import systemService from "../service/systemService";
import systemRepository from "../repository/systemRepository";
import gameTableRepository from "../repository/gameTableRepository";

const router = express.Router();

router.get("/", (req, res) => {
  res.render("table/new.html.njk");
});

router.post("/", async (req, res) => {
  const url: string = req.body.url?.trim();
  const name: string = req.body.name?.trim();

  if (!url || !name) {
    throw new Error("Please fill out form");
  }

  if (!url.startsWith("https://lets-role.com/system")) {
    throw new Error("Please use a Let's Role production system URL");
  }

  const systemData: string = await systemService.getSystemData(url);
  const systemId = await systemRepository.create(url, systemData);
  await gameTableRepository.create(name, systemId);

  return res.send(true);
});

export default router;
