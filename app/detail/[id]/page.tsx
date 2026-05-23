import { DetailScreen } from "@/components/screens/DetailScreen";
import { OriginTabBar } from "@/components/OriginTabBar";

export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <DetailScreen id={id} />
      <OriginTabBar />
    </>
  );
}
