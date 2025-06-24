import { Button } from "@/components/ui/button"
import { Portal } from "@/components/ui/portal"

export function EndOfDayModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur">
        <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
          <h2 className="text-lg font-semibold mb-4">下班總結</h2>
          <p className="text-sm text-muted-foreground mb-2">您今天的工作紀錄將如下結算：</p>
          <ul className="list-disc list-inside space-y-1 mb-4">
            <li>最後一筆自動結束</li>
            <li>總工時檢查</li>
            <li>若未滿 8 小時將顯示提醒</li>
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button variant="default" onClick={onConfirm}>確認下班</Button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
