import { ensureSchema } from "@/db/ensure-schema";
import { CompetitionError, joinCompetition } from "@/lib/competition-service";
import { SECTIONS } from "@/lib/lesson-data";

export const dynamic = "force-dynamic";

/** عام: انضمام طالب إلى المسابقة */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: unknown; team?: unknown };
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ").slice(0, 40) : "";
  const teamRaw = typeof body.team === "string" ? body.team.trim() : "";
  const team = SECTIONS.includes(teamRaw) ? teamRaw : SECTIONS[0];
  if (name.length < 2) {
    return Response.json({ ok: false, error: "اكتب اسمك من فضلك (حرفان على الأقل)" }, { status: 400 });
  }
  try {
    await ensureSchema();
    const result = await joinCompetition(code.trim(), name, team);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof CompetitionError ? error.status : 500;
    if (status === 500) console.error("[competitions join]", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "تعذر الانضمام" }, { status });
  }
}
