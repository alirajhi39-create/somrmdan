import BoardView from "@/components/competition/BoardView";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <BoardView code={code} />;
}
