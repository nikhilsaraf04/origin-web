import { WorldScreen } from "@/components/screens/WorldScreen";
import { OriginTabBar } from "@/components/OriginTabBar";

export const metadata = {
  title: "World — Origin",
  description: "Where your coffee grew, and where you drank it.",
};

export default function WorldPage() {
  return (
    <>
      <WorldScreen />
      <OriginTabBar />
    </>
  );
}
