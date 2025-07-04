"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface MergePreview {
  projectCode: string
  projectName: string
  category: string
  content: string
  count: number
  totalDuration: string
}

interface MergeConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  date: Date
  mergePreview: MergePreview[]
  isLoading: boolean
}

export default function MergeConfirmModal({
  open,
  onClose,
  onConfirm,
  date,
  mergePreview,
  isLoading
}: MergeConfirmModalProps) {
  const formattedDate = format(date, 'MM/dd (EEEE)', { locale: zhTW })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] p-0">
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-white/20 rounded-2xl p-6">
          <DialogTitle className="text-lg font-semibold mb-2 text-white">
            確認合併重疊記錄
          </DialogTitle>
          
          <DialogDescription className="text-white/80 mb-4">
            {formattedDate} 的工作記錄中，發現以下可以合併的項目：
          </DialogDescription>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {mergePreview.map((preview, index) => (
              <div
                key={index}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                    {preview.projectCode}
                  </span>
                  <span className="text-white/90">{preview.projectName}</span>
                </div>
                
                <div className="text-sm text-white/70 mb-2">
                  {preview.category}
                </div>
                
                <div className="text-sm text-white/60 mb-3 whitespace-pre-wrap">
                  {preview.content}
                </div>
                
                <div className="flex items-center gap-4 text-xs">
                  <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded">
                    發現 {preview.count} 筆重複記錄
                  </span>
                  <span className="text-white/50">
                    總時長：{preview.totalDuration}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {mergePreview.length === 0 && (
            <div className="text-center py-8 text-white/50">
              沒有找到可以合併的記錄
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl bg-white/10 text-white border border-white/30 hover:bg-white/20 transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading || mergePreview.length === 0}
              className="px-4 py-2 text-sm rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '合併中...' : '確認合併'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 