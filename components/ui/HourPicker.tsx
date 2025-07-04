"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface HourPickerProps {
  value?: number
  onChange?: (value: number) => void
  label?: string
}

const hours = Array.from({ length: 24 }, (_, i) => i)

export function HourPicker({ value = 9, onChange, label }: HourPickerProps) {
  const hourScrollRef = React.useRef<HTMLDivElement>(null)

  // 滾動到當前選中的時間
  React.useEffect(() => {
    const scrollToSelected = () => {
      if (hourScrollRef.current) {
        const hourElement = hourScrollRef.current.querySelector(`[data-hour="${value}"]`)
        if (hourElement) {
          hourElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }

    // 延遲執行以確保 DOM 已渲染
    setTimeout(scrollToSelected, 100)
  }, [value])

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-sm text-muted-foreground">
          {label}
        </div>
      )}
      
      {/* 滾輪式時間選擇器 */}
      <div 
        className="flex space-x-3 bg-background border rounded-xl p-3"
        role="group"
        aria-label={label || "時間選擇器"}
      >
        {/* 小時選擇器 */}
        <div className="flex flex-col items-center flex-1">
          <ScrollArea className="h-32 w-16 border rounded-lg" ref={hourScrollRef}>
            <div className="py-8">
              {hours.map((h) => (
                <div
                  key={h}
                  data-hour={h}
                  className={cn(
                    "px-3 py-2 text-center transition-all duration-200 select-none cursor-pointer",
                    "hover:bg-accent hover:scale-105",
                    h === value ? "bg-primary/10 font-bold text-lg scale-110" : "text-sm opacity-60"
                  )}
                  onClick={() => onChange?.(h)}
                >
                  {h.toString().padStart(2, '0')}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
} 