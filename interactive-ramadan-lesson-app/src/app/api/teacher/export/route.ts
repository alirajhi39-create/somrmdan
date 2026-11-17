import { ensureSchema } from "@/db/ensure-schema";
import { formatDateTime } from "@/lib/dates";
import { gradeLabel } from "@/lib/lesson-data";
import { isTeacherRequest } from "@/lib/teacher-auth";
import { getOverview } from "@/lib/teacher-queries";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  if (!isTeacherRequest(req)) {
    return new Response("غير مصرح", { status: 401 });
  }
  const url = new URL(req.url);
  const classroom = url.searchParams.get("classroom") ?? "";

  await ensureSchema();
  const overview = await getOverview(classroom);

  const header = [
    "الاسم",
    "الفصل",
    "رقم المحاولة",
    "تاريخ البدء",
    "تاريخ الإكمال",
    "الحالة",
    "الدرجة",
    "الدرجة الكلية",
    "النسبة %",
    "التقدير",
    "المحطات المنجزة",
    "المدة (ثانية)",
  ];

  const lines: string[] = [header.map(csvCell).join(",")];
  for (const s of overview.students) {
    if (s.attempts.length === 0) {
      lines.push([s.name, s.classroom, "", "", "", "لم يبدأ", "", "", "", "", "", ""].map(csvCell).join(","));
      continue;
    }
    for (const a of s.attempts) {
      lines.push(
        [
          s.name,
          s.classroom,
          a.id,
          formatDateTime(a.startedAt),
          a.completedAt ? formatDateTime(a.completedAt) : "",
          a.completedAt ? "مكتملة" : "قيد التنفيذ",
          a.score,
          a.maxScore,
          a.percent,
          a.completedAt ? gradeLabel(a.percent) : "",
          a.stationsDone,
          a.durationSec ?? "",
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }

  const csv = "\uFEFF" + lines.join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ramadan-lesson-report${classroom ? "-" + encodeURIComponent(classroom) : ""}.csv"`,
    },
  });
}
