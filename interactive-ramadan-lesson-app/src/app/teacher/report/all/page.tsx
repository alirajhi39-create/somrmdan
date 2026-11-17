import { Suspense } from "react";
import AllReports from "@/components/teacher/AllReports";
import { LoadingScreen } from "@/components/teacher/Screens";

export const dynamic = "force-dynamic";

export default function AllReportsPage() {
  return (
    <Suspense fallback={<LoadingScreen text="جارٍ تجهيز تقارير جميع الطلاب..." />}>
      <AllReports />
    </Suspense>
  );
}
