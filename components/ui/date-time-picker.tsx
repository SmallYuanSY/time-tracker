"use client"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { SimpleTimePicker } from "./simple-time-picker"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

interface DateTimePickerProps {
  label?: string
  value?: Date
  onChange?: (date: Date) => void
}

export function DateTimePicker({ label = "選擇日期時間", value, onChange }: DateTimePickerProps) {
  const [date, setDate] = useState<Date | undefined>(value)
  const [time, setTime] = useState(() => {
    if (value) {
      const h = value.getHours().toString().padStart(2, "0")
      const m = value.getMinutes().toString().padStart(2, "0")
      return `${h}:${m}`
    }
    return "09:00"
  })
  const [open, setOpen] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const container = document.getElementById('portal-root')
    if (container) {
      // 清理可能影響顯示的屬性
      container.removeAttribute('aria-hidden')
      container.removeAttribute('data-aria-hidden')
      setPortalContainer(container)
    }
  }, [])

  const update = (d: Date | undefined, t: string) => {
    if (!d) return
    const [h, m] = t.split(":")
    const result = new Date(d)
    result.setHours(parseInt(h), parseInt(m))
    setDate(result)
    onChange?.(result)
  }

  useEffect(() => {
    if (value) {
      setDate(value)
      const h = value.getHours().toString().padStart(2, "0")
      const m = value.getMinutes().toString().padStart(2, "0")
      setTime(`${h}:${m}`)
    }
  }, [value])

  return (
    <div className="grid gap-2">
      {label && <label className="text-sm text-muted-foreground">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "yyyy/MM/dd HH:mm") : "點擊選擇日期時間"}
          </Button>
        </PopoverTrigger>
        {portalContainer && (
          <PopoverPrimitive.Portal container={portalContainer}>
            <PopoverPrimitive.Content
              className="z-[10002] w-auto p-0 bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin) rounded-md border shadow-md outline-hidden"
              align="start"
              sideOffset={4}
              avoidCollisions={true}
              collisionPadding={8}
            >
              <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-fit">
                <Calendar
                  locale={zhTW}
                  mode="single"
                  selected={date}
                  onSelect={(d) => update(d, time)}
                  initialFocus
                />
                <div className="mt-4">
                  <SimpleTimePicker value={time} onChange={(t) => { setTime(t); update(date, t) }} />
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        )}
      </Popover>
    </div>
  )
}
