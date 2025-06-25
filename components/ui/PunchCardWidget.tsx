"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import WorkLogModal from "@/app/worklog/WorkLogModal"
import { EndOfDayModal } from "@/components/ui/EndOfDayModal"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface PunchCardWidgetProps {
  onWorkLogSaved?: () => void
}

export default function PunchCardWidget({ onWorkLogSaved }: PunchCardWidgetProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [clockedIn, setClockedIn] = useState(false)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)
  const [showWorkLogModal, setShowWorkLogModal] = useState(false)
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isFlipping, setIsFlipping] = useState(false)
  
  // 確保動畫狀態能正確重置
  useEffect(() => {
    if (isFlipping) {
      // 如果動畫開始，設定一個保險的重置機制
      const resetTimer = setTimeout(() => {
        setIsFlipping(false)
      }, 700) // 比動畫時間多一點
      
      return () => clearTimeout(resetTimer)
    }
  }, [isFlipping])
  
  // 使用 useEffect 來處理路由導航，避免在渲染期間呼叫
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // 載入打卡狀態
  useEffect(() => {
    const loadClockStatus = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        const userId = (session.user as any).id
        const response = await fetch(`/api/clock?userId=${userId}`)
        
        if (response.status === 401) {
          // 401 未授權，跳轉回登入頁面
          console.log('身份驗證失敗，跳轉至登入頁面')
          router.push('/login')
          return
        }
        
        if (response.ok) {
          const data = await response.json()
          setClockedIn(data.clockedIn)
          
          // 重置狀態
          setStartTime(null)
          setEndTime(null)
          
          if (data.lastClockIn) {
            setStartTime(format(new Date(data.lastClockIn), "HH:mm"))
          }
          
          if (data.lastClockOut) {
            setEndTime(format(new Date(data.lastClockOut), "HH:mm"))
          }
        } else {
          console.error('載入打卡狀態失敗，狀態碼:', response.status)
        }
      } catch (error) {
        console.error('載入打卡狀態失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      loadClockStatus()
    }
  }, [session, status])

  if (status === 'loading' || loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-400/30 backdrop-blur-lg shadow-xl h-full">
        <CardContent className="flex items-center justify-center p-8 h-full min-h-[200px]">
          <div className="text-white/60">載入打卡狀態...</div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Card className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-400/30 backdrop-blur-lg shadow-xl h-full">
        <CardContent className="flex items-center justify-center p-8 h-full min-h-[200px]">
          <div className="text-white/60">重新導向至登入頁面...</div>
        </CardContent>
      </Card>
    )
  }

  // 重新載入打卡狀態的函數
  const reloadClockStatus = async () => {
    if (!session?.user) return

    try {
      const userId = (session.user as any).id
      const response = await fetch(`/api/clock?userId=${userId}`)
      
      if (response.status === 401) {
        // 401 未授權，跳轉回登入頁面
        console.log('身份驗證失敗，跳轉至登入頁面')
        router.push('/login')
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setClockedIn(data.clockedIn)
        
        // 重置狀態
        setStartTime(null)
        setEndTime(null)
        
        if (data.lastClockIn) {
          setStartTime(format(new Date(data.lastClockIn), "HH:mm"))
        }
        
        if (data.lastClockOut) {
          setEndTime(format(new Date(data.lastClockOut), "HH:mm"))
        }
      } else {
        console.error('重新載入打卡狀態失敗，狀態碼:', response.status)
      }
    } catch (error) {
      console.error('重新載入打卡狀態失敗:', error)
    }
  }

  const handleClockIn = () => {
    // 上班打卡先顯示工作紀錄表單
    setShowWorkLogModal(true)
  }

  const confirmClockIn = async () => {
    setShowWorkLogModal(false)
    
    // 觸發翻轉動畫
    setIsFlipping(true)
    
    try {
      const response = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (session?.user as any)?.id,
          type: 'IN'
        })
      })
      
      if (response.status === 401) {
        // 401 未授權，跳轉回登入頁面
        console.log('打卡時身份驗證失敗，跳轉至登入頁面')
        router.push('/login')
        return
      }
      
      if (response.ok) {
        // 在動畫進行中更新狀態
        setTimeout(async () => {
          await reloadClockStatus()
        }, 300)
      } else {
        console.error('上班打卡失敗，狀態碼:', response.status)
      }
    } catch (error) {
      console.error('上班打卡失敗:', error)
    }
    
    // 600ms 後重置動畫狀態（與 CSS 動畫時長一致）
    setTimeout(() => {
      setIsFlipping(false)
    }, 600)
  }

  const handleClockOut = () => {
    // 下班打卡顯示結束彈窗
    setShowEndOfDayModal(true)
  }

  const confirmClockOut = async () => {
    setShowEndOfDayModal(false)
    
    // 觸發翻轉動畫
    setIsFlipping(true)
    
    try {
      const response = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (session?.user as any)?.id,
          type: 'OUT'
        })
      })
      
      if (response.status === 401) {
        // 401 未授權，跳轉回登入頁面
        console.log('打卡時身份驗證失敗，跳轉至登入頁面')
        router.push('/login')
        return
      }
      
      if (response.ok) {
        // 在動畫進行中更新狀態
        setTimeout(async () => {
          await reloadClockStatus()
          // 下班打卡後也通知主頁刷新今日工作摘要（因為會結算進行中的工作）
          if (onWorkLogSaved) onWorkLogSaved()
        }, 300)
      } else {
        console.error('下班打卡失敗，狀態碼:', response.status)
      }
    } catch (error) {
      console.error('下班打卡失敗:', error)
    }
    
    // 600ms 後重置動畫狀態（與 CSS 動畫時長一致）
    setTimeout(() => {
      setIsFlipping(false)
    }, 600)
  }

  return (
    <>
      <Card className={`bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-400/30 backdrop-blur-lg shadow-xl h-full ${isFlipping ? 'flip' : ''}`}>
        <CardContent className="flex flex-col justify-center items-center p-8 h-full min-h-[200px] gap-6">
          {/* 打卡系統標題 */}
          <h3 className="text-white text-2xl font-bold text-center">⏰ 打卡系統</h3>
          
          {/* 打卡狀態 */}
          <div className="text-center p-4 bg-white/10 rounded-xl w-full">
            <div className="text-white text-lg font-medium">
              {clockedIn ? (
                startTime ? `✅ 已上班：${startTime}` : "✅ 已上班"
              ) : (
                endTime ? `🏁 已下班：${endTime}` : "⚪ 尚未打卡"
              )}
            </div>
            {/* 顯示今日打卡歷史 */}
            {startTime && endTime && !clockedIn && (
              <div className="text-white/60 text-sm mt-2">
                今日：{startTime} - {endTime}
              </div>
            )}
          </div>
          
          {/* 打卡按鈕 */}
          <div className="w-full">
            {!clockedIn ? (
              <Button 
                onClick={handleClockIn} 
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                🟢 上班打卡
              </Button>
            ) : (
              <Button 
                onClick={handleClockOut} 
                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                🔴 下班打卡
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 上班打卡 - 顯示工作紀錄表單（只需要開始時間） */}
      {showWorkLogModal && (
        <WorkLogModal 
          initialMode="start"
          onClose={() => {
            setShowWorkLogModal(false)
            // 取消時不執行打卡
          }}
          onSave={() => {
            confirmClockIn() // 只有儲存時才執行打卡
            // 通知主頁刷新今日工作摘要
            if (onWorkLogSaved) onWorkLogSaved()
          }}
        />
      )}

      {/* 下班打卡 - 顯示結束確認 */}
      {showEndOfDayModal && (
        <EndOfDayModal 
          onClose={() => setShowEndOfDayModal(false)}
          onConfirm={confirmClockOut}
          userId={(session?.user as any)?.id}
        />
      )}
    </>
  )
}
