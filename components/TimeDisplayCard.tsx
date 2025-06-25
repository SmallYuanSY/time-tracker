"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"

export default function TimeDisplayCard() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)

  // 確保在客戶端才初始化時間
  useEffect(() => {
    setIsClient(true)
    setCurrentTime(new Date())
  }, [])

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

        {/* 裝飾性小點 */}
        <div className="flex gap-2 mt-4">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-100"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-200"></div>
        </div>
      </CardContent>
    </Card>
  )
} 