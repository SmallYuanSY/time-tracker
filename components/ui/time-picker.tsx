import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  label?: string
  container?: Element | null
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

function currentTime() {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
}

export function TimePicker({ value = "09:00", onChange, label, container }: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(value)
  
  // 生成唯一的 ID 用於關聯 label 和 button
  const fieldId = React.useId()

  const [hour, minute] = internalValue.split(":")
  if (!minute || !hour) {
    setInternalValue(currentTime())
  }

  const setTime = (h: string, m: string) => {
    const newValue = `${h}:${m}`
    setInternalValue(newValue)
    onChange?.(newValue)
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={fieldId}
          className="text-sm text-white font-medium block bg-transparent"
        >
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            id={fieldId}
            variant="outline" 
            className={cn(
              "w-full justify-start text-left font-normal backdrop-blur bg-white/10 border border-white/30 text-white hover:bg-white/20 hover:text-white focus:ring-2 focus:ring-white/30",
              open && "ring-2 ring-blue-400 bg-white/20"
            )}
            aria-label={label ? `${label}: ${internalValue}` : `時間選擇器: ${internalValue}`}
            aria-expanded={open}
          >
            {internalValue || "選擇時間"}
            {open && <span className="ml-auto text-white/60">⌄</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl !z-[10003]"
          sideOffset={8}
          align="start"
          side="bottom"
          role="dialog"
          aria-label="時間選擇器"
          avoidCollisions={true}
          sticky="always"
          container={container}
        >
          <div className="flex space-x-2">
            {/* 小時選擇器 */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-white/70 mb-1">時</div>
              <ScrollArea 
                className="h-40 w-16 rounded-lg border border-white/20 overflow-hidden"
                aria-label="選擇小時"
              >
                <div className="p-1 space-y-0.5">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className={cn(
                        "px-2 py-1 rounded cursor-pointer text-center text-white transition-all duration-150 select-none text-sm",
                        "hover:bg-white/20",
                        h === hour ? "bg-white/30 font-bold shadow-sm" : "hover:bg-white/10"
                      )}
                      onClick={() => setTime(h, minute)}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* 分鐘選擇器 */}
            <div className="flex flex-col items-center">
              <div className="text-xs text-white/70 mb-1">分</div>
              <ScrollArea 
                className="h-40 w-16 rounded-lg border border-white/20 overflow-hidden"
                aria-label="選擇分鐘"
              >
                <div className="p-1 space-y-0.5">
                  {minutes.map((m) => (
                    <div
                      key={m}
                      className={cn(
                        "px-2 py-1 rounded cursor-pointer text-center text-white transition-all duration-150 select-none text-sm",
                        "hover:bg-white/20",
                        m === minute ? "bg-white/30 font-bold shadow-sm" : "hover:bg-white/10"
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
        </PopoverContent>
      </Popover>
    </div>
  )
}