import { PlacesScreen } from "@/components/screens/PlacesScreen";
import { OriginTabBar } from "@/components/OriginTabBar";

export const metadata = {
  title: "Places — Origin",
  description: "Roasteries and cafés you have had a cup at.",
};

export default function PlacesPage() {
  return (
    <>
      <PlacesScreen />
      <OriginTabBar />
    </>
  );
}
