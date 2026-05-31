import redis, { RedisClient } from "redis";
import config from "./../etc/config.json";

class CacheService {
  private readonly client: RedisClient;

  constructor() {
    this.client = redis.createClient(config.redis.port, config.redis.host, {
      no_ready_check: true,
    });
  }

  getClient(): RedisClient {
    return this.client;
  }
}

const cacheService = new CacheService();

export default cacheService;
