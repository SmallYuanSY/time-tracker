import DashboardLayout from "@/components/layouts/DashboardLayout";

export default function HomePage() {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-white">歡迎回來！</h1>
      <p className="text-white/70 mt-2">這是你的儀表板首頁。</p>
    </DashboardLayout>
  )
}