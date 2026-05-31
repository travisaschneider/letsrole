import express from "express";
import { UploadedFile } from "express-fileupload";
import { Media } from "../type/media";
import cdnService from "../service/cdnService";
import config from "./../etc/config.json";
import mediaRepository from "../repository/mediaRepository";

const router = express.Router();

router.post("/upload", async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("No files");
  }

  let files = req.files["media[]"] as UploadedFile[];
  const folder_id = req.body.folder_id;
  const response: Media[] = [];

  if (!Array.isArray(files)) {
    files = [files];
  }

  for (const file of files) {
    const media: Media = await cdnService.uploadFile(file);
    media.user_id = config.userid;
    media.folder_id = folder_id ?? null;

    const savedMedia: Media = await mediaRepository.save(media);
    response.push(savedMedia);
  }

  return res.json(response);
});

export default router;
