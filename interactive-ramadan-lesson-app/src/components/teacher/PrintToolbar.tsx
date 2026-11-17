"use client";

import Link from "next/link";
import { useState } from "react";

interface Props {
  filename: string;
  orientation?: "portrait" | "landscape";
  backHref?: string;
  targetId?: string;
}

export default function PrintToolbar({ filename, orientation = "portrait", backHref = "/teacher", targetId = "report-root" }: Props) {
  const [busy, setBusy] = useState(false);

  async function download() {
    const el = document.getElementById(targetId);
    if (!el) return;
    setBusy(true);
    try {
      const { downloadElementAsPdf } = await import("@/lib/pdf-export");
      await downloadElementAsPdf(el, filename, orientation);
    } catch (error) {
      console.error(error);
      window.print();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href={backHref} className="btn-ghost px-4 py-2 text-sm">
          ↩ العودة إلى اللوحة
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary px-5 py-2 text-base" onClick={() => window.print()}>
            🖨️ طباعة / حفظ PDF
          </button>
          <button type="button" className="btn-gold px-5 py-2 text-base" onClick={() => void download()} disabled={busy}>
            {busy ? "⏳ جارٍ التجهيز..." : "⬇️ تحميل PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
