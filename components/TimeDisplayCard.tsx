"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { useSession } from "next-auth/react"
import { Bell } from "lucide-react"
import NotificationList from "./NotificationList"

export default function TimeDisplayCard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [unseenCount, setUnseenCount] = useState<number>(0)
  const { data: session, status } = useSession()
  
  // 獲取訂閱者ID用於Novu
  const getSubscriberId = () => {
    if (status === 'loading') return null
    if (!session?.user) return null
    return `user_${(session.user as any).id}`
  }
  
  const subscriberId = getSubscriberId()
  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APP_ID

  // 確保在客戶端才初始化時間
  useEffect(() => {
    setIsClient(true)
    setCurrentTime(new Date())
  }, [])

  // 獲取未讀通知數量
  useEffect(() => {
    if (!isClient || !subscriberId || !applicationIdentifier) return

    const fetchUnseenCount = async () => {
      try {
        const response = await fetch(`/api/novu-proxy?action=unseenCount&subscriberId=${subscriberId}`)
        if (response.ok) {
          const data = await response.json()
          setUnseenCount(data.count || 0)
        }
      } catch (error) {
        console.error('獲取未讀通知數量失敗:', error)
      }
    }

    fetchUnseenCount()
    
    // 每30秒檢查一次未讀數量
    const interval = setInterval(fetchUnseenCount, 30000)
    
    return () => clearInterval(interval)
  }, [isClient, subscriberId, applicationIdentifier])

  // 每秒更新時間
  useEffect(() => {
    if (!isClient) return

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [isClient])

  if (!isClient || !currentTime) {
    return (
      <Card className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 border-blue-400/30 backdrop-blur-lg shadow-xl h-full py-0">
        <CardContent className="flex flex-col justify-center items-center p-6 h-full" style={{ minHeight: '310px' }}>
          <div className="text-white/60">載入中...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 border-blue-400/30 backdrop-blur-lg shadow-xl h-full py-0">
      <CardContent className="flex flex-col justify-center items-center p-6 h-full" style={{ minHeight: '310px' }}>
        {/* 大時鐘顯示 */}
        <div className="text-center mb-4">
          <h1 className="text-4xl md:text-5xl font-mono font-bold text-white mb-2 tracking-wider">
            {format(currentTime, 'HH:mm:ss')}
          </h1>
          <div className="h-1 w-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded mx-auto mb-3"></div>
        </div>

        {/* 日期資訊 */}
        <div className="text-center space-y-1">
          <p className="text-white/90 text-lg font-medium">
            {format(currentTime, 'yyyy年MM月dd日', { locale: zhTW })}
          </p>
          <p className="text-white/70 text-base">
            {format(currentTime, 'EEEE', { locale: zhTW })}
          </p>
        </div>

        {/* 通知顯示區域 */}
        {subscriberId && unseenCount > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center justify-center mt-3 px-3 py-1.5 bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors cursor-pointer">
                <Bell className="w-4 h-4 text-orange-300 mr-1.5" />
                <span className="text-white/90 text-sm font-medium">
                  {unseenCount} 條通知未讀
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] bg-white/95 backdrop-blur-lg border-white/20">
              <DialogHeader>
                <DialogTitle className="text-gray-800">通知中心</DialogTitle>
                <DialogDescription className="text-gray-600">
                  查看您的所有通知和訊息
                </DialogDescription>
              </DialogHeader>
              <NotificationList onNotificationRead={() => {
                // 重新獲取未讀數量
                if (subscriberId) {
                  fetch(`/api/novu-proxy?action=unseenCount&subscriberId=${subscriberId}`)
                    .then(res => res.json())
                    .then(data => setUnseenCount(data.count || 0))
                    .catch(console.error)
                }
              }} />
            </DialogContent>
          </Dialog>
        )}
        

        {/* 裝飾性小點 */}
        <div className="flex gap-2 mt-4">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse "></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse "></div>
        </div>
      </CardContent>
    </Card>
  )
} 