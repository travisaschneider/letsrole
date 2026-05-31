import { Client, ClientOptions } from "@opensearch-project/opensearch";
import config from "./../etc/config.json";

class SearchService {
  private readonly client: Client;

  public constructor() {
    const options: ClientOptions | any = {
      node: config.opensearch.node,
    };

    this.client = new Client(options);
  }

  getClient(): Client {
    return this.client;
  }

  public async createIndices() {
    const os: Client = this.getClient();

    await os.indices.create({
      index: "letsrole_table",
      body: {
        mappings: {
          properties: {
            name: { type: "text" },
            users_id: { type: "integer" },
            creator_id: { type: "integer" },
            users_name: { type: "text" },
            characters_name: { type: "text" },
            is_favourite: { type: "text" },
            description: { type: "text" },
            is_archived: { type: "boolean" },
            is_deleted: { type: "boolean" },
            system_id: { type: "keyword" },
            banner: { type: "text" },
            players: { type: "nested" },
            system_name: { type: "text" },
            activated_at: { type: "date" },
            time_spent: { type: "integer" },
            created_at: { type: "date" },
          },
        },
      },
    });

    await os.indices.create({
      index: "letsrole_media",
      body: {
        mappings: {
          properties: {
            created_at: { type: "date" },
            filename: { type: "text" },
            folder_id: { type: "integer" },
            is_avatar: { type: "boolean" },
            is_token: { type: "boolean" },
            metadata: { type: "text" },
            mime: { type: "keyword" },
            path: { type: "keyword" },
            size: { type: "integer" },
            tags: { type: "text" },
            title: { type: "text" },
            user_id: { type: "integer" },
          },
        },
      },
    });

    await os.indices.create({
      index: "letsrole_character",
      body: {
        mappings: {
          properties: {
            name: { type: "text" },
            system_id: { type: "integer" },
            system_name: { type: "text" },
            user_id: { type: "integer" },
            total_played: { type: "integer" },
            last_played: { type: "date" },
            is_retired: { type: "boolean" },
            is_favourite: { type: "boolean" },
            is_deleted: { type: "boolean" },
            created_at: { type: "date" },
            color: { type: "keyword" },
            avatar: { type: "keyword" },
            token: { type: "keyword" },
            avatar_frame_path: { type: "keyword" },
            token_frame_path: { type: "keyword" },
          },
        },
      },
    });

    await os.indices.create({
      index: "letsrole_journal",
      body: {
        mappings: {
          properties: {
            id: { type: "integer" },
            title: { type: "text" },
            table_id: { type: "keyword" },
            summary: { type: "text" },
            content: { type: "text" },
            author_id: { type: "integer" },
            author_name: { type: "text" },
            tags: { type: "keyword" },
            tables: { type: "keyword" },
            users: { type: "integer" },
            created_at: { type: "date" },
            updated_at: { type: "date" },
            folder_id: { type: "integer" },
            type: { type: "keyword" },
            keyid: { type: "keyword" },
          },
        },
      },
    });

    await os.indices.create({
      index: "letsrole_sfx",
      body: {
        mappings: {
          properties: {
            id: { type: "integer" },
            category_id: { type: "integer" },
            title: { type: "text" },
            title_fr: { type: "text" },
            title_de: { type: "text" },
            title_it: { type: "text" },
            title_es: { type: "text" },
            title_pt: { type: "text" },
            tags: { type: "text" },
            tags_fr: { type: "text" },
            tags_de: { type: "text" },
            tags_it: { type: "text" },
            tags_es: { type: "text" },
            tags_pt: { type: "text" },
          },
        },
      },
    });

    await os.indices.create({
      index: "letsrole_craft",
      body: {
        mappings: {
          properties: {
            id: { type: "integer" },
            keyid: { type: "keyword" },
            created_by: { type: "integer" },
            name: { type: "text" },
            view: { type: "keyword" },
            created_at: { type: "date" },
            table_id: { type: "keyword" },
            shared_with: { type: "integer" },
            book_source_id: { type: "integer" },
            avatar: { type: "keyword" },
            token: { type: "keyword" },
            color: { type: "keyword" },
            token_frame_path: { type: "keyword" },
            avatar_frame_path: { type: "keyword" },
          },
        },
      },
    });

    await os.indices.create({
      index: "letsrole_book",
      body: {
        mappings: {
          properties: {
            id: { type: "keyword" },
            book_id: { type: "integer" },
            internal_id: { type: "integer" },
            type: { type: "keyword" },
            craft_type: { type: "keyword" },
            title: { type: "text" },
            content: { type: "text" },
          },
        },
      },
    });

    await os.indices.create({
      index: "letsrole_pdf",
      body: {
        mappings: {
          properties: {
            pdf_id: { type: "integer" },
            file_id: { type: "integer" },
            page_number: { type: "integer" },
            content: { type: "text" },
          },
        },
      },
    });
  }
}

const searchService = new SearchService();

export default searchService;
