'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import SmartPunchWidget from "@/components/ui/SmartPunchWidget";
import NovuInbox from "@/app/components/ui/inbox/NovuInbox";
import TodayWorkSummary from "@/components/TodayWorkSummary";
import ScheduledWorkList from "@/components/worklog/ScheduledWorkList";
import TimeDisplayCard from "@/components/TimeDisplayCard";
import TodayStatsCard from "@/components/TodayStatsCard";
import { Portal } from "@/components/ui/portal";
import { Clock, Calendar } from "lucide-react";


export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summaryKey, setSummaryKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'today' | 'scheduled'>('today');

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

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 space-y-6 p-6">
        {/* 頂部功能區域 - 分成多個卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 時間和日期卡片 */}
          <div className="lg:col-span-1">
            <TimeDisplayCard />
          </div>
          
          {/* 智能打卡系統卡片 */}
          <div className="lg:col-span-1">
            <SmartPunchWidget onWorkLogSaved={() => setSummaryKey(k => k + 1)} />
          </div>
          
          {/* 今日統計卡片 */}
          <div className="lg:col-span-1">
            <TodayStatsCard />
          </div>
        </div>

        {/* 工作內容切換區域 */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden">
          {/* 切換標籤 */}
          <div className="relative flex bg-white/5 p-1 rounded-t-2xl">
            {/* 滑動背景 */}
            <div
              className={`absolute top-1 bottom-1 w-1/2 bg-gradient-to-r from-purple-600/30 to-blue-600/30 backdrop-blur border border-white/20 rounded-xl transition-all duration-300 ease-out ${
                activeTab === 'today' ? 'left-1' : 'left-1/2'
              }`}
            />
            
            {/* 今日工作標籤 */}
            <button
              onClick={() => setActiveTab('today')}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-300 ${
                activeTab === 'today'
                  ? 'text-white scale-105'
                  : 'text-white/60 hover:text-white/80 scale-100'
              }`}
            >
              <Clock className="h-4 w-4" />
              今日工作
              {activeTab === 'today' && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              )}
            </button>
            
            {/* 預定工作標籤 */}
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-300 ${
                activeTab === 'scheduled'
                  ? 'text-white scale-105'
                  : 'text-white/60 hover:text-white/80 scale-100'
              }`}
            >
              <Calendar className="h-4 w-4" />
              預定工作
              {activeTab === 'scheduled' && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              )}
            </button>
          </div>
          
          {/* 內容區域 */}
          <div className="relative overflow-hidden">
            {/* 今日工作內容 */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                activeTab === 'today'
                  ? 'opacity-100 transform translate-x-0'
                  : 'opacity-0 transform -translate-x-full absolute inset-0'
              }`}
            >
              <div className="p-6">
                <TodayWorkSummary 
                  key={summaryKey} 
                  onRefresh={() => setSummaryKey(k => k + 1)}
                  refreshTrigger={summaryKey}
                />
              </div>
            </div>
            
            {/* 預定工作內容 */}
            <div
              className={`transition-all duration-500 ease-in-out ${
                activeTab === 'scheduled'
                  ? 'opacity-100 transform translate-x-0'
                  : 'opacity-0 transform translate-x-full absolute inset-0'
              }`}
            >
              <div className="p-6">
                <ScheduledWorkList />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}