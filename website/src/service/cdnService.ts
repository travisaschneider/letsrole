import { UploadedFile } from "express-fileupload";
import crypto from "node:crypto";
import { Media } from "../type/media";
import { imageSize } from "image-size";

class CdnService {
  async uploadFile(file: UploadedFile): Promise<Media> {
    const ext: string | undefined = file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      ?.replace(/[^a-z0-9]/gi, "");

    if (!ext) {
      throw new Error("Unsupported extension");
    }

    const newName: string =
      crypto.randomBytes(64).toString("hex").substring(0, 32) + "." + ext;
    const metadata: any = {};

    try {
      const dimensions = imageSize(file.data);
      metadata.width = dimensions.width;
      metadata.height = dimensions.height;
    } catch (e) {
      console.warn("Could not detect media dimensions", e);
    }

    await file.mv(this.getUploadDir() + "/" + newName);

    return {
      path: newName,
      created_at: new Date().toISOString(),
      is_avatar: false,
      is_token: false,
      metadata: metadata,
      filename: file.name,
      mime: file.mimetype,
      type: "image",
      size: file.size,
    };
  }

  private getUploadDir(): string {
    return require("path").resolve(process.env.PWD + "/medias");
  }
}

const cdnService = new CdnService();

export default cdnService;
