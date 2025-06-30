'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layouts/DashboardLayout";
import SmartPunchWidget from "@/components/ui/SmartPunchWidget";
import NovuInbox from "@/app/components/ui/inbox/NovuInbox";
import TodayWorkSummary from "@/components/TodayWorkSummary";
import ScheduledWorkList from "@/components/worklog/ScheduledWorkList";
import ScheduledWorkModal from "@/components/ui/ScheduledWorkModal";
import WorkLogModal from "@/app/worklog/WorkLogModal";
import TimeDisplayCard from "@/components/TimeDisplayCard";
import TodayStatsCard from "@/components/TodayStatsCard";
import { Portal } from "@/components/ui/portal";
import { Clock, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addDays, subDays } from "date-fns";

interface ScheduledWork {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  priority: number
  isCompleted: boolean
  workType: 'SCHEDULED' | 'URGENT'
  scheduledStartDate: string
  scheduledEndDate: string
  createdAt: string
  updatedAt: string
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summaryKey, setSummaryKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'today' | 'scheduled'>('today');
  
  // 預定工作相關狀態
  const [showScheduledWorkModal, setShowScheduledWorkModal] = useState(false);
  const [editingScheduledWork, setEditingScheduledWork] = useState<ScheduledWork | null>(null);
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [workLogFromScheduled, setWorkLogFromScheduled] = useState<ScheduledWork | null>(null);
  const [scheduledWorkRefreshKey, setScheduledWorkRefreshKey] = useState(0);

  // 週導航相關狀態
  const [scheduledWorkMode, setScheduledWorkMode] = useState<'week' | 'all'>('all');
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // 計算週的開始和結束日期
  const weekStart = new Date(currentWeek);
  weekStart.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // 週一
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // 週日

  // 週導航函數
  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(prev => subDays(prev, 7));
    } else {
      setCurrentWeek(prev => addDays(prev, 7));
    }
  };

  // 處理預定工作編輯
  const handleEditScheduledWork = (work: ScheduledWork) => {
    setEditingScheduledWork(work);
    setShowScheduledWorkModal(true);
  };

  // 處理開始工作（從預定工作轉為工作記錄）
  const handleStartWork = (work: ScheduledWork) => {
    setWorkLogFromScheduled(work);
    setShowWorkLogModal(true);
  };

  // 處理預定工作複製
  const handleCopyScheduledWork = (work: ScheduledWork) => {
    setWorkLogFromScheduled(work);
    setShowWorkLogModal(true);
  };

  // 處理預定工作模態框關閉
  const handleScheduledWorkModalClose = () => {
    setShowScheduledWorkModal(false);
    setEditingScheduledWork(null);
  };

  // 處理預定工作保存
  const handleScheduledWorkSave = () => {
    setScheduledWorkRefreshKey(k => k + 1);
    handleScheduledWorkModalClose();
  };

  // 處理工作記錄模態框關閉
  const handleWorkLogModalClose = () => {
    setShowWorkLogModal(false);
    setWorkLogFromScheduled(null);
  };

  // 處理工作記錄保存
  const handleWorkLogSave = () => {
    setSummaryKey(k => k + 1);
    setScheduledWorkRefreshKey(k => k + 1);
    handleWorkLogModalClose();
  };

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
                {/* 預定工作標題、模式切換和導航 */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                  {/* 左側：標題和模式切換 */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white">📅 預定工作管理</h2>
                      <p className="text-white/60 text-sm mt-1">安排和管理您的工作計劃</p>
                    </div>
                    
                    {/* 顯示模式切換 */}
                    <div className="flex bg-white/10 rounded-lg p-1">
                      <button
                        onClick={() => setScheduledWorkMode('week')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          scheduledWorkMode === 'week'
                            ? 'bg-purple-500 text-white'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        本週範圍
                      </button>
                      <button
                        onClick={() => setScheduledWorkMode('all')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          scheduledWorkMode === 'all'
                            ? 'bg-purple-500 text-white'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        所有時間
                      </button>
                    </div>
                  </div>
                  
                  {/* 右側：週導航和新增按鈕 */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* 週導航 - 只在本週範圍模式下顯示 */}
                    {scheduledWorkMode === 'week' && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => navigateWeek('prev')}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          ← 上週
                        </Button>
                        <span className="text-white/80 text-sm px-3 whitespace-nowrap">
                          {format(weekStart, 'yyyy/MM/dd')} - {format(weekEnd, 'yyyy/MM/dd')}
                        </span>
                        <Button
                          onClick={() => navigateWeek('next')}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          下週 →
                        </Button>
                      </div>
                    )}
                    
                    {/* 新增按鈕 */}
                    <Button
                      onClick={() => setShowScheduledWorkModal(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      新增預定工作
                    </Button>
                  </div>
                </div>
                
                <ScheduledWorkList
                  key={scheduledWorkRefreshKey}
                  mode={scheduledWorkMode}
                  currentWeek={currentWeek}
                  onEdit={handleEditScheduledWork}
                  onStartWork={handleStartWork}
                  onCopy={handleCopyScheduledWork}
                  onRefresh={(refreshFn) => {
                    // 可以在這裡保存 refreshFn 以供後續使用
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 預定工作編輯/新增模態框 */}
      <ScheduledWorkModal
        open={showScheduledWorkModal}
        onClose={handleScheduledWorkModalClose}
        onSave={handleScheduledWorkSave}
        editData={editingScheduledWork}
      />

      {/* 工作記錄模態框 (從預定工作開始) */}
      {showWorkLogModal && workLogFromScheduled && (
        <WorkLogModal
          onClose={handleWorkLogModalClose}
          onSave={handleWorkLogSave}
          initialMode="start"
          copyData={{
            id: '',
            projectCode: workLogFromScheduled.projectCode,
            projectName: workLogFromScheduled.projectName,
            category: workLogFromScheduled.category,
            content: workLogFromScheduled.content,
            startTime: new Date().toISOString(),
            endTime: null,
          }}
        />
      )}
    </DashboardLayout>
  )
}