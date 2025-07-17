"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface WorkLogDeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  message: string
  clocksCount: number
}

export function WorkLogDeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  message,
  clocksCount
}: WorkLogDeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>確認刪除工作記錄</DialogTitle>
          <DialogDescription>
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-medium text-yellow-300">警告</span>
            </div>
            <p className="text-sm text-yellow-200/90 mt-1">
              刪除後將同時移除 {clocksCount} 筆打卡記錄，此操作無法復原。
            </p>
          </div>
          
          <div className="text-sm text-white/70">
            <p>這將會刪除：</p>
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li>工作記錄</li>
              <li>當天的所有打卡記錄 ({clocksCount} 筆)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            取消
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            確認刪除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}