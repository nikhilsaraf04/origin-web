import { notFound } from "next/navigation";
import { Best100DetailScreen } from "@/components/screens/Best100DetailScreen";
import { OriginTabBar } from "@/components/OriginTabBar";
import { findShop } from "@/lib/best100";

export default async function Best100DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shop = findShop(id);
  if (!shop) notFound();
  return (
    <>
      <Best100DetailScreen shop={shop} />
      <OriginTabBar />
    </>
  );
}
