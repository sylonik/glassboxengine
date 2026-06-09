import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

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

/**
 * Cloud Run + Cloud SQL connects over a unix socket at
 * `/cloudsql/<connection_name>`, expressed as `?host=/cloudsql/...` in the URL.
 * That form (empty authority host + ':' in the connection name) is not a valid
 * URL for postgres-js's internal `new URL()` parse, so detect it and pass
 * explicit options instead. TCP URLs (local dev, private IP) parse normally.
 */
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

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
