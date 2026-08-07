import BottomTabBar from "@/components/mobile/BottomTabBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="has-tab-bar min-h-screen bg-surface-950">
      {children}
      <BottomTabBar />
    </div>
  );
}
