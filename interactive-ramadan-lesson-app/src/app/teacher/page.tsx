import { Suspense } from "react";
import { LoadingScreen } from "@/components/teacher/Screens";
import TeacherArea from "@/components/teacher/TeacherArea";

export const dynamic = "force-dynamic";

export default function TeacherPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TeacherArea />
    </Suspense>
  );
}
