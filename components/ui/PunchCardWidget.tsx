"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import WorkLogModal from "@/app/worklog/WorkLogModal"
import { EndOfDayModal } from "@/components/ui/EndOfDayModal"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function PunchCardWidget() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [clockedIn, setClockedIn] = useState(false)
  const [startTime, setStartTime] = useState<string | null>(null)
  const [endTime, setEndTime] = useState<string | null>(null)
  const [showWorkLogModal, setShowWorkLogModal] = useState(false)
  const [showEndOfDayModal, setShowEndOfDayModal] = useState(false)
  
  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }else if (status === 'loading') {
    return <div>Loading...</div>
  }

  const handleClockIn = () => {
    // 上班打卡先顯示工作紀錄表單
    setShowWorkLogModal(true)
  }

  const confirmClockIn = async () => {
    const now = new Date()
    setStartTime(format(now, "HH:mm"))
    setClockedIn(true)
    
    // 呼叫上班打卡 API
    try {
      await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (session?.user as any)?.id,
          type: 'IN'
        })
      })
    } catch (error) {
      console.error('上班打卡失敗:', error)
    }
    
    setShowWorkLogModal(false)
  }

  const handleClockOut = () => {
    // 下班打卡顯示結束彈窗
    setShowEndOfDayModal(true)
  }

  const confirmClockOut = async () => {
    const now = new Date()
    setEndTime(format(now, "HH:mm"))
    setClockedIn(false)
    
    // 呼叫下班打卡 API
    try {
      await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: (session?.user as any)?.id,
          type: 'OUT'
        })
      })
    } catch (error) {
      console.error('下班打卡失敗:', error)
    }
    
    setShowEndOfDayModal(false)
  }

  return (
    <>
      <Card className="w-full max-w-md mx-auto bg-white/10 border border-white/20 backdrop-blur rounded-2xl p-4 shadow-lg">
        <CardContent className="flex flex-col items-center gap-4">
          <h2 className="text-white text-lg font-bold">打卡系統</h2>
          <div className="text-white/80">
            {clockedIn
              ? `上班時間：${startTime}`
              : endTime
              ? `下班時間：${endTime}`
              : "尚未打卡"}
          </div>
          <div className="flex gap-2">
            {!clockedIn ? (
              <Button onClick={handleClockIn} className="bg-green-600 hover:bg-green-700 text-white">
                上班打卡
              </Button>
            ) : (
              <Button onClick={handleClockOut} className="bg-red-600 hover:bg-red-700 text-white">
                下班打卡
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 上班打卡 - 顯示工作紀錄表單 */}
      {showWorkLogModal && (
        <WorkLogModal 
          onClose={() => {
            setShowWorkLogModal(false)
            // 取消時不執行打卡
          }}
          onSave={() => {
            setShowWorkLogModal(false)
            confirmClockIn() // 只有儲存時才執行打卡
          }}
        />
      )}

      {/* 下班打卡 - 顯示結束確認 */}
      {showEndOfDayModal && (
        <EndOfDayModal 
          onClose={() => setShowEndOfDayModal(false)}
          onConfirm={confirmClockOut}
        />
      )}
    </>
  )
}
