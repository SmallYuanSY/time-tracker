// app/worklog/page.tsx
'use client'

import { useEffect, useState } from 'react'
import WorkLogModal from './WorkLogModal'
import WorkCard from '@/components/WorkCard'

export default function WorkLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/worklog?userId=user123&date=${today}`)
      .then(res => res.json())
      .then(setLogs)
  }, [])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">🗓️ 今日工作日誌</h1>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded"
        onClick={() => setShowModal(true)}
      >
        ➕ 新增工作
      </button>

      {logs.map(log => (
        <WorkCard key={log.id} data={log} />
      ))}

      {showModal && <WorkLogModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
