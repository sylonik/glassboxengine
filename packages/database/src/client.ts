import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

type DB = PostgresJsDatabase<typeof schema>;

let _db: DB | null = null;

function createDb(): DB {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const poolOptions = {
    max: parseInt(process.env.PG_POOL_MAX ?? "20", 10),
    idle_timeout: parseInt(process.env.PG_IDLE_TIMEOUT ?? "20", 10),
    connect_timeout: parseInt(process.env.PG_CONNECT_TIMEOUT ?? "10", 10),
    max_lifetime: parseInt(process.env.PG_MAX_LIFETIME ?? "1800", 10),
  };

  // Cloud Run + Cloud SQL connects over a unix socket at
  // `/cloudsql/<connection_name>`, expressed as `?host=/cloudsql/...` in the URL.
  // That form (empty authority host + ':' in the connection name) is not a valid
  // URL for postgres-js's internal `new URL()` parse, so detect it and pass
  // explicit options instead. TCP URLs (local dev, private IP) parse normally.
  const socketHostMatch = connectionString.match(/[?&]host=(\/[^&]+)/);
  const queryClient = socketHostMatch
    ? (() => {
        const creds = connectionString.match(
          /^postgres(?:ql)?:\/\/([^:/?#]+):([^@]+)@[^/]*\/([^?]+)/
        );
        if (!creds) {
          throw new Error("Invalid Cloud SQL socket DATABASE_URL");
        }
        return postgres({
          host: decodeURIComponent(socketHostMatch[1]),
          username: decodeURIComponent(creds[1]),
          password: decodeURIComponent(creds[2]),
          database: decodeURIComponent(creds[3]),
          ...poolOptions,
        });
      })()
    : postgres(connectionString, poolOptions);

  return drizzle(queryClient, { schema });
}

function getDb(): DB {
  if (!_db) _db = createDb();
  return _db;
}

/**
 * Lazy database handle. The connection is created on FIRST use, not at import,
 * so `next build` can collect route metadata (which imports `db` without
 * querying) without DATABASE_URL set — while still failing fast at runtime if
 * it's missing. Removes the need for build-time placeholder env in CI/Docker.
 */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const value = Reflect.get(getDb() as object, prop, getDb());
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

export type Database = DB;
