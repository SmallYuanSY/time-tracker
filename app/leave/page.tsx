'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Button } from '@/components/ui/button'

export default function LeavePage() {
  const { data: session } = useSession()
  const [agentEmail, setAgentEmail] = useState('')
  const [reason, setReason] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const submitRequest = async () => {
    if (!session?.user) return
    setLoading(true)
    try {
      const userId = (session.user as any).id
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          agentEmail,
          reason,
          startDate,
          endDate,
        })
      })
      if (res.ok) {
        setMessage('已送出請假申請')
        setAgentEmail('')
        setReason('')
        setStartDate('')
        setEndDate('')
      } else {
        const data = await res.json()
        setMessage(data.error || '送出失敗')
      }
    } catch (e) {
      console.error(e)
      setMessage('送出失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">請假申請</h1>
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 space-y-4">
          <input
            type="email"
            placeholder="代理人 Email"
            value={agentEmail}
            onChange={(e) => setAgentEmail(e.target.value)}
            className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <textarea
            placeholder="請假原因"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <div className="flex gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 rounded-xl bg-white/20 border border-white/30 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          <Button
            onClick={submitRequest}
            disabled={loading || !agentEmail || !reason || !startDate || !endDate}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? '送出中...' : '送出請假'}
          </Button>
          {message && <div className="text-white mt-2">{message}</div>}
        </div>
      </div>
    </DashboardLayout>
  )
}
