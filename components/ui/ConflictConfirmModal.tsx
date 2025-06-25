"use client"

import { Portal } from '@/components/ui/portal'

interface ConflictInfo {
  id: string
  projectCode: string
  projectName: string
  category: string
  content: string
  startTime: string
  endTime: string
  action: string
}

interface ConflictConfirmModalProps {
  conflicts: ConflictInfo[]
  onConfirm: () => void
  onCancel: () => void
}

export default function ConflictConfirmModal({ conflicts, onConfirm, onCancel }: ConflictConfirmModalProps) {
  return (
    <Portal>
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-md">
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-hidden">
          <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            ⚠️ 檢測到時間衝突
          </h2>
          
          <p className="text-amber-200 mb-4 text-sm">
            新增的工作時間與以下 {conflicts.length} 個現有記錄有衝突，系統將自動調整這些記錄：
          </p>

          <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 mb-4 max-h-60 overflow-y-auto">
            {conflicts.map((conflict, index) => (
              <div key={conflict.id} className="mb-4 last:mb-0 bg-white/5 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-white flex items-center gap-2">
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                        {conflict.projectCode}
                      </span>
                      {conflict.projectName}
                    </div>
                    <div className="text-xs text-white/70 mt-1">
                      {conflict.category} | {conflict.startTime} - {conflict.endTime}
                    </div>
                    <div className="text-xs text-white/60 mt-1 truncate">
                      {conflict.content}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 p-2 bg-orange-900/30 border border-orange-600/40 rounded">
                  <div className="text-xs text-orange-200 font-medium">
                    📝 處理方式：{conflict.action}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-4">
            <div className="text-blue-200 text-sm">
              💡 <strong>說明：</strong>這些調整是為了避免時間重疊，確保工作記錄的準確性。調整後的記錄仍會保留原本的專案和內容資訊。
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 transition"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md transition"
            >
              確認並處理衝突
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
} 