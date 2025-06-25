"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import PunchCardWidget from '@/components/ui/PunchCardWidget'
import OvertimeWidget from '@/components/ui/OvertimeWidget'

interface SmartPunchWidgetProps {
  onWorkLogSaved?: () => void
}

export default function SmartPunchWidget({ onWorkLogSaved }: SmartPunchWidgetProps) {
  const { data: session, status } = useSession()
  const [shouldShowOvertime, setShouldShowOvertime] = useState(false)
  const [clockedIn, setClockedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showingWidget, setShowingWidget] = useState<'punch' | 'overtime'>('punch')

  // 檢查當前時間是否為加班時段
  const isOvertimePeriod = () => {
    const now = new Date()
    const hour = now.getHours()
    
    // 加班時段：18:00 (下午6點) 到隔天 08:00 (早上8點)
    return hour >= 18 || hour < 8
  }

  // 載入用戶打卡狀態
  const loadClockStatus = async () => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    try {
      const userId = (session.user as any).id
      const response = await fetch(`/api/clock?userId=${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        setClockedIn(data.clockedIn)
        
        // 決定顯示模式的邏輯：
        const overtimePeriod = isOvertimePeriod()
        let newShouldShowOvertime = false
        
        if (data.clockedIn) {
          // 如果目前是上班狀態，始終顯示正常打卡模組讓用戶下班
          newShouldShowOvertime = false
        } else {
          // 如果目前是下班狀態
          if (overtimePeriod) {
            // 在加班時段 (18:00-次日8:00)，顯示加班模組
            const now = new Date()
            const hour = now.getHours()
            
            if (hour >= 18) {
              // 晚上 18:00 之後，顯示加班模組
              newShouldShowOvertime = true
            } else if (hour < 8) {
              // 隔天早上 8:00 之前，檢查是否應該顯示加班模組
              if (data.lastClockOut || !data.lastClockIn) {
                // 有下班記錄或沒有任何打卡記錄，顯示加班模組
                newShouldShowOvertime = true
              } else {
                // 沒有下班記錄但有上班記錄，可能是昨天忘記下班
                newShouldShowOvertime = false
              }
            }
          } else {
            // 在正常上班時段 (8:00-18:00)
            if (data.lastClockOut && data.lastClockIn) {
              // 有完整的上下班記錄，表示今天已經下班，可以加班
              newShouldShowOvertime = true
            } else if (!data.lastClockIn && !data.lastClockOut) {
              // 今天還沒有任何打卡記錄，顯示正常打卡
              newShouldShowOvertime = false
            } else {
              // 其他情況（例如只有上班記錄沒有下班記錄），顯示正常打卡
              newShouldShowOvertime = false
            }
          }
        }
        
        // 如果狀態需要切換，觸發動畫
        if (newShouldShowOvertime !== shouldShowOvertime && !loading) {
          await animateTransition(newShouldShowOvertime)
        } else {
          setShouldShowOvertime(newShouldShowOvertime)
          setShowingWidget(newShouldShowOvertime ? 'overtime' : 'punch')
        }
      }
    } catch (error) {
      console.error('載入打卡狀態失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 動畫切換函數
  const animateTransition = async (toOvertime: boolean) => {
    setIsTransitioning(true)
    
    // 先淡出當前元件 (500ms 動畫的一半)
    await new Promise(resolve => setTimeout(resolve, 250))
    
    // 切換元件
    setShouldShowOvertime(toOvertime)
    setShowingWidget(toOvertime ? 'overtime' : 'punch')
    
    // 淡入新元件 (剩餘的 250ms)
    await new Promise(resolve => setTimeout(resolve, 250))
    setIsTransitioning(false)
  }

  useEffect(() => {
    if (status === 'authenticated') {
      loadClockStatus()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [session, status]) // eslint-disable-line react-hooks/exhaustive-deps

  // 每分鐘檢查一次時間，確保在時間切換點正確切換模組
  useEffect(() => {
    const interval = setInterval(() => {
      if (status === 'authenticated') {
        loadClockStatus()
      }
    }, 60000) // 每分鐘檢查一次

    return () => clearInterval(interval)
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  // 當加班狀態變化時重新載入 - 包含動畫觸發
  const handleStatusChange = async () => {
    // 立即重新載入狀態，可能觸發動畫
    await loadClockStatus()
    if (onWorkLogSaved) {
      onWorkLogSaved()
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-400/30 backdrop-blur-lg shadow-xl h-full rounded-2xl">
        <div className="flex items-center justify-center p-8 h-full min-h-[200px]">
          <div className="text-white/60">載入中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`transition-all duration-500 ease-in-out transform ${
      isTransitioning 
        ? 'opacity-0 scale-95 rotate-1' 
        : 'opacity-100 scale-100 rotate-0'
    }`}>
      {showingWidget === 'overtime' ? (
        <OvertimeWidget onStatusChange={handleStatusChange} />
      ) : (
        <PunchCardWidget onWorkLogSaved={handleStatusChange} />
      )}
    </div>
  )
} 