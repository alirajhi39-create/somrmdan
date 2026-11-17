import { Suspense } from "react";
import ClassReport from "@/components/teacher/ClassReport";
import { LoadingScreen } from "@/components/teacher/Screens";

export const dynamic = "force-dynamic";

export default function ClassReportPage() {
  return (
    <Suspense fallback={<LoadingScreen text="جارٍ تجهيز تقرير الفصل..." />}>
      <ClassReport />
    </Suspense>
  );
}
