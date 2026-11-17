import { sql } from "drizzle-orm";
import { db, dbInfo } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    let schemaReady = true;
    try {
      await ensureSchema();
    } catch {
      schemaReady = false;
    }
    return Response.json({ ok: true, database: { ...dbInfo, connected: true, schemaReady } });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: {
          ...dbInfo,
          connected: false,
          error: error instanceof Error ? error.message : "connection failed",
        },
      },
      { status: 500 },
    );
  }
}
