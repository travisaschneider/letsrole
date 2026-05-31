import mariadb, { Pool, PoolConnection } from "mariadb";
import config from "./../etc/config.json";

class DatabaseService {
  private readonly pool: Pool;

  public constructor() {
    this.pool = mariadb.createPool({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      port: config.database.port,
      connectionLimit: 5,
    });
  }

  async getConnection(): Promise<PoolConnection> {
    return this.pool.getConnection();
  }

  async execute<T>(sql: string, values?: any) {
    return this.pool.execute<T>(sql, values);
  }
}

const databaseService = new DatabaseService();

export default databaseService;
