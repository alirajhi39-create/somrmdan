"use client";

import { useEffect, useState } from "react";

interface Health {
  ok: boolean;
  database?: {
    configured: boolean;
    connected: boolean;
    provider: "none" | "neon" | "local" | "postgres";
    host: string | null;
    schemaReady?: boolean;
    error?: string;
  };
}

const PROVIDER_LABEL: Record<string, string> = {
  neon: "Neon (أون لاين)",
  local: "محلية",
  postgres: "PostgreSQL",
  none: "غير مضبوطة",
};

export default function DbStatusBadge({ light = false }: { light?: boolean }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then(async (r) => (await r.json()) as Health)
      .then((h) => {
        if (!cancelled) setHealth(h);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const base = `inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
    light ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"
  }`;

  if (failed) return <span className={base}>🔴 تعذر فحص قاعدة البيانات</span>;
  if (!health) return <span className={base}>⏳ فحص قاعدة البيانات...</span>;

  const d = health.database;
  const connected = Boolean(health.ok && d?.connected);
  const provider = PROVIDER_LABEL[d?.provider ?? "none"] ?? d?.provider;
  const hostShort = d?.host ? d.host.split(".")[0] : "";

  return (
    <span className={base} title={d?.host ?? undefined}>
      {connected ? "🟢" : "🔴"} قاعدة البيانات: {provider}
      {hostShort && connected ? ` • ${hostShort}` : ""}
      {!connected && d?.error ? ` • ${d.error.slice(0, 60)}` : ""}
    </span>
  );
}
