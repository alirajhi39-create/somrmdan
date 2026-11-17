import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_SETTINGS, sanitizeSettings, type AppSettings } from "@/lib/settings-types";

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings);
  const merged: Record<string, unknown> = {};
  for (const row of rows) merged[row.key] = row.value;
  return sanitizeSettings(merged, DEFAULT_SETTINGS);
}

export async function saveSettings(patch: unknown): Promise<AppSettings> {
  const current = await getSettings();
  const next = sanitizeSettings(patch, current);
  for (const key of ["sound", "competition"] as const) {
    const value = next[key] as unknown as Record<string, unknown>;
    await db
      .insert(settings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  }
  return next;
}
