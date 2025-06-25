"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'

interface OvertimeWidgetProps {
  onStatusChange?: () => void
}

export default function OvertimeWidget({ onStatusChange }: OvertimeWidgetProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [ongoing, setOngoing] = useState(false)
  const [startTime, setStartTime] = useState<string | null>(null)

  const loadStatus = async () => {
    if (!session?.user) return
    try {
      const userId = (session.user as any).id
      const res = await fetch(`/api/overtime?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.ongoing) {
          setOngoing(true)
          setStartTime(format(new Date(data.ongoing.startTime), 'HH:mm'))
        } else {
          setOngoing(false)
          setStartTime(null)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [session])

  const start = async () => {
    if (!session?.user) return
    const userId = (session.user as any).id
    const res = await fetch('/api/overtime/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      await loadStatus()
      if (onStatusChange) onStatusChange()
    }
  }

  const end = async () => {
    if (!session?.user) return
    const userId = (session.user as any).id
    const res = await fetch('/api/overtime/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      await loadStatus()
      if (onStatusChange) onStatusChange()
    }
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-400/30 backdrop-blur-lg shadow-xl h-full py-0">
        <CardContent className="flex items-center justify-center p-6 h-full" style={{ minHeight: '310px' }}>
          <div className="text-white/60">載入加班狀態...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-400/30 backdrop-blur-lg shadow-xl h-full py-0">
      <CardContent className="flex flex-col justify-center items-center p-6 h-full gap-6" style={{ minHeight: '310px' }}>
        <h3 className="text-white text-2xl font-bold text-center">⏱ 加班模式</h3>
        <div className="text-center p-4 bg-white/10 rounded-xl w-full">
          <div className="text-white text-lg font-medium">
            {ongoing ? (startTime ? `⌛ 加班中：${startTime}` : '⌛ 加班中') : '尚未加班'}
          </div>
        </div>
        <div className="w-full">
          {ongoing ? (
            <Button onClick={end} className="w-full bg-red-600 hover:bg-red-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
              結束加班
            </Button>
          ) : (
            <Button onClick={start} className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
              開始加班
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
