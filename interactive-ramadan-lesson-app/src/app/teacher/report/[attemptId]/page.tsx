import { notFound } from "next/navigation";
import StudentReport from "@/components/teacher/StudentReport";

export const dynamic = "force-dynamic";

export default async function StudentReportPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const id = Number(attemptId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <StudentReport attemptId={id} />;
}
