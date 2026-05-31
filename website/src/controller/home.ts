import express from "express";
import gameTableRepository from "../repository/gameTableRepository";
import searchService from "../service/searchService";

const router = express.Router();

router.get<{}, string>("/", async (req, res) => {
  const tables = await gameTableRepository.findAll();

  res.render("home.html.njk", {
    tables: tables,
  });
});

router.get("/install", async (req, res) => {
  await searchService.createIndices();
  console.log("OpenSearch indices created");

  return res.send("Install finished");
});

export default router;
