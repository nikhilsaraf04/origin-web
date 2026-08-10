import { PlaceFormScreen } from "@/components/screens/PlaceFormScreen";

export const metadata = { title: "Edit visit — Origin" };

export default async function EditPlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlaceFormScreen visitId={id} />;
}
