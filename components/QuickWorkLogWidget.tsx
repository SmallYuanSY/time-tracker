"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import WorkLogModal from '@/app/worklog/WorkLogModal'

export default function QuickWorkLogWidget({ onSaved }: { onSaved?: () => void }) {
  const [showModal, setShowModal] = useState(false)

  const handleSave = () => {
    setShowModal(false)
    if (onSaved) onSaved()
  }

  return (
    <>
      <Card className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">快速工作紀錄</h2>
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setShowModal(true)}
        >
          ➕ 開始紀錄
        </Button>
      </Card>
      {showModal && (
        <WorkLogModal
          initialMode="quick"
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </>
  )
}
