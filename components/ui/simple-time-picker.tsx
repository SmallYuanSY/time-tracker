"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface SimpleTimePickerProps {
  value?: string
  onChange?: (value: string) => void
  label?: string
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

export function SimpleTimePicker({ value = "09:00", onChange, label }: SimpleTimePickerProps) {
  const [internalValue, setInternalValue] = React.useState(value)
  const fieldId = React.useId()
  const hourScrollRef = React.useRef<HTMLDivElement>(null)
  const minuteScrollRef = React.useRef<HTMLDivElement>(null)

  const [hour, minute] = internalValue.split(":")

  const setTime = (h: string, m: string) => {
    const newValue = `${h}:${m}`
    setInternalValue(newValue)
    onChange?.(newValue)
  }

  // 滾動到當前選中的時間
  React.useEffect(() => {
    const scrollToSelected = () => {
      if (hourScrollRef.current) {
        const hourElement = hourScrollRef.current.querySelector(`[data-hour="${hour}"]`)
        if (hourElement) {
          hourElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
      
      if (minuteScrollRef.current) {
        const minuteElement = minuteScrollRef.current.querySelector(`[data-minute="${minute}"]`)
        if (minuteElement) {
          minuteElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }

    // 延遲執行以確保 DOM 已渲染
    setTimeout(scrollToSelected, 100)
  }, [hour, minute])

  return (
    <div className="space-y-2">
      {label && (
        <div 
          id={fieldId}
          className="text-sm text-white font-medium block"
        >
          {label}
        </div>
      )}
      
             {/* 滾輪式時間選擇器 */}
       <div 
         className="flex space-x-3 bg-white/5 border border-white/20 rounded-xl p-3"
         role="group"
         aria-labelledby={label ? fieldId : undefined}
         aria-label={!label ? "時間選擇器" : undefined}
       >
         {/* 小時選擇器 */}
         <div className="flex flex-col items-center flex-1">
           <div className="text-xs text-white/70 mb-2">時</div>
           <ScrollArea className="h-32 w-full border border-white/20 rounded-lg bg-white/5" ref={hourScrollRef}>
             <div className="py-8">
               {hours.map((h) => (
                 <div
                   key={h}
                   data-hour={h}
                   className={cn(
                     "px-3 py-2 text-center text-white transition-all duration-200 select-none cursor-pointer",
                     "hover:bg-white/20 hover:scale-105",
                     h === hour ? "bg-white/30 font-bold text-lg scale-110" : "text-sm opacity-60"
                   )}
                   onClick={() => setTime(h, minute)}
                 >
                   {h}
                 </div>
               ))}
             </div>
           </ScrollArea>
         </div>
         
         <div className="flex items-center text-white/60 text-lg font-bold pt-8">:</div>
         
         {/* 分鐘選擇器 */}
         <div className="flex flex-col items-center flex-1">
           <div className="text-xs text-white/70 mb-2">分</div>
           <ScrollArea className="h-32 w-full border border-white/20 rounded-lg bg-white/5" ref={minuteScrollRef}>
             <div className="py-8">
               {minutes.map((m) => (
                 <div
                   key={m}
                   data-minute={m}
                   className={cn(
                     "px-3 py-2 text-center text-white transition-all duration-200 select-none cursor-pointer",
                     "hover:bg-white/20 hover:scale-105",
                     m === minute ? "bg-white/30 font-bold text-lg scale-110" : "text-sm opacity-60"
                   )}
                   onClick={() => setTime(hour, m)}
                 >
                   {m}
                 </div>
               ))}
             </div>
           </ScrollArea>
         </div>
       </div>
    </div>
  )
} 