import dns from "node:dns";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "@/db/auth-schema";
import * as schema from "@/db/schema";

// Em alguns hosts o DNS devolve IPv6 primeiro e a conexão com o pooler estoura timeout.
dns.setDefaultResultOrder("ipv4first");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida no ambiente.");
}

const globalForDb = globalThis as unknown as {
  postgresClient: ReturnType<typeof postgres> | undefined;
};

// Transaction pooler (6543) aguenta várias conexões curtas.
// Singleton no processo Node (dev hot reload e Hostinger persistente).
const client =
  globalForDb.postgresClient ??
  postgres(connectionString, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
  });

globalForDb.postgresClient = client;

export const db = drizzle(client, {
  schema: { ...schema, ...authSchema },
});
