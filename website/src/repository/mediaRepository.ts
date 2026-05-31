import { Media } from "../type/media";
import cassandraService from "../service/cassandraService";
import crypto from "node:crypto";
import searchService from "../service/searchService";

class MediaRepository {
  public async save(media: Media): Promise<Media> {
    media.id = crypto.randomBytes(48).toString("hex").substring(0, 24);

    return this.saveToCassandra(media).then(this.index);
  }

  private async index(media: Media) {
    let name_kw = media.filename;
    name_kw = name_kw.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    name_kw = name_kw.toLowerCase();

    return searchService
      .getClient()
      .index({
        index: "letsrole_media",
        id: media.id,
        body: {
          id: media.id,
          user_id: media.user_id,
          path: media.path,
          filename: media.filename,
          name: media.filename,
          name_kw: name_kw,
          mime: media.mime,
          size: media.size,
          metadata: JSON.stringify(media.metadata),
          folder_id: media.folder_id,
          created_at: new Date(),
          is_token: media.is_token,
          is_avatar: media.is_avatar,
        },
      })
      .then(() => {
        return media;
      });
  }

  private async saveToCassandra(media: Media) {
    return cassandraService
      .getClient()
      .execute(
        `
            INSERT INTO media (id, user_id, reference, path, filename, mime, size, created_at,
                               metadata, folder_id, is_deleted, is_public, is_token, is_avatar)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          media.id,
          media.user_id,
          null,
          media.path,
          media.filename,
          media.mime,
          media.size,
          new Date(),
          JSON.stringify(media.metadata),
          media.folder_id,
          0,
          false,
          media.is_token,
          media.is_avatar,
        ],
        { prepare: true },
      )
      .then(() => {
        cassandraService
          .getClient()
          .execute(
            `INSERT INTO media_user (user_id, media_id) VALUES (?, ?)`,
            [media.user_id, media.id],
            {
              prepare: true,
            },
          );

        return media;
      });
  }
}

const mediaRepository = new MediaRepository();

export default mediaRepository;
