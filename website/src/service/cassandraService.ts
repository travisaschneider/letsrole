import config from "./../etc/config.json";
import { Client, DseClientOptions, types } from "cassandra-driver";

class CassandraService {
  private readonly client: Client;

  public constructor() {
    const options: Partial<DseClientOptions> = {
      contactPoints: config.cassandra.contact_points,
      keyspace: config.cassandra.keyspace,
      queryOptions: {
        consistency: types.consistencies.localQuorum,
      },
    };

    if (config.cassandra.datacenter) {
      options.localDataCenter = config.cassandra.datacenter;
    }

    if (config.cassandra.port) {
      options.protocolOptions = {
        port: config.cassandra.port,
      };
    }

    this.client = new Client(options);
  }

  public getClient(): Client {
    return this.client;
  }
}

const cassandraService = new CassandraService();

export default cassandraService;
