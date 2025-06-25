'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import PunchCardWidget from "@/components/ui/PunchCardWidget";
import NovuInbox from "@/app/components/ui/inbox/NovuInbox";
import TodayWorkSummary from "@/components/TodayWorkSummary";
import TimeDisplayCard from "@/components/TimeDisplayCard";
import TodayStatsCard from "@/components/TodayStatsCard";
import { Portal } from "@/components/ui/portal";


export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summaryKey, setSummaryKey] = useState(0);

  // 身份驗證檢查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    // 檢查用戶是否在資料庫中存在
    if (status === 'authenticated' && session?.user) {
      const checkUserExists = async () => {
        try {
          const response = await fetch('/api/users');
          if (!response.ok) {
            router.push('/login');
          }
        } catch (error) {
          console.error('檢查用戶狀態失敗:', error);
          router.push('/login');
        }
      };
      checkUserExists();
    }
  }, [status, session, router]);

  // 載入中狀態
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-4"></div>
            <div>載入中...</div>
          </div>
        </div>
      </div>
    );
  }

  // 未登入狀態
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8">
          <div className="text-white text-center">
            <div className="text-lg mb-2">🔐 需要登入</div>
            <div>正在重新導向至登入頁面...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* 通知中心 - 使用 Portal 渲染到最頂層 */}
      <Portal>
        <div className="fixed top-20 right-4 lg:top-6 lg:right-6 z-[9998]">
          <NovuInbox />
        </div>
      </Portal>

      <div className="min-h-full bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 space-y-6 p-6">
        {/* 頂部功能區域 - 分成多個卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 時間和日期卡片 */}
          <div className="lg:col-span-1">
            <TimeDisplayCard />
          </div>
          
          {/* 打卡系統卡片 */}
          <div className="lg:col-span-1">
            <PunchCardWidget onWorkLogSaved={() => setSummaryKey(k => k + 1)} />
          </div>
          
          {/* 今日統計卡片 */}
          <div className="lg:col-span-1">
            <TodayStatsCard />
          </div>
        </div>

        {/* 今日工作摘要 */}
        <TodayWorkSummary 
          key={summaryKey} 
          onRefresh={() => setSummaryKey(k => k + 1)}
          refreshTrigger={summaryKey}
        />

        {/* 快速操作區域 */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">快速操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <a
              href="/worklog"
              className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/30 rounded-xl p-4 text-center transition-colors"
            >
              <div className="text-blue-300 text-2xl mb-2">📝</div>
              <div className="text-white font-medium">工作記錄</div>
              <div className="text-white/60 text-sm">查看和管理工作日誌</div>
            </a>
            
            <a
              href="/notifications"
              className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-400/30 rounded-xl p-4 text-center transition-colors"
            >
              <div className="text-purple-300 text-2xl mb-2">🔔</div>
              <div className="text-white font-medium">完整通知</div>
              <div className="text-white/60 text-sm">查看所有通知和測試</div>
            </a>
            
            <a
              href="/test-notification"
              className="bg-green-600/20 hover:bg-green-600/30 border border-green-400/30 rounded-xl p-4 text-center transition-colors"
            >
              <div className="text-green-300 text-2xl mb-2">🧪</div>
              <div className="text-white font-medium">測試通知</div>
              <div className="text-white/60 text-sm">發送測試通知</div>
            </a>

            <a
              href="/overtime"
              className="bg-orange-600/20 hover:bg-orange-600/30 border border-orange-400/30 rounded-xl p-4 text-center transition-colors"
            >
              <div className="text-orange-300 text-2xl mb-2">⏱</div>
              <div className="text-white font-medium">加班模式</div>
              <div className="text-white/60 text-sm">紀錄加班開始與結束</div>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}