import { createClient, type ClickHouseClient } from "@clickhouse/client";

let _client: ClickHouseClient | null = null;

export function getClickHouseClient(): ClickHouseClient {
  if (_client) return _client;

  const url = process.env.CLICKHOUSE_URL;
  if (!url) throw new Error("CLICKHOUSE_URL environment variable is required");

  _client = createClient({
    url,
    database: process.env.CLICKHOUSE_DATABASE ?? "glassbox",
    /** Server-side batching: ClickHouse accumulates inserts and merges them.
     *  This means individual inserts from workers are buffered without blocking. */
    clickhouse_settings: {
      async_insert: 1,
      wait_for_async_insert: 0,
    },
  });

  return _client;
}

export async function closeClickHouseClient(): Promise<void> {
  if (_client) {
    await _client.close();
    _client = null;
  }
}
