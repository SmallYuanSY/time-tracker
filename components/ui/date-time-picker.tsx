"use client"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { SimpleTimePicker } from "./simple-time-picker"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface DateTimePickerProps {
  label?: string
  value?: Date
  onChange?: (date: Date) => void
  container?: Element | null
}

export function DateTimePicker({ label = "選擇日期時間", value, onChange, container }: DateTimePickerProps) {
  const [date, setDate] = useState<Date | undefined>(value)
  const [time, setTime] = useState(() => {
    if (value) {
      const h = value.getHours().toString().padStart(2, "0")
      const m = value.getMinutes().toString().padStart(2, "0")
      return `${h}:${m}`
    }
    return "09:00"
  })

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
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "yyyy/MM/dd HH:mm") : "點擊選擇日期"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" {...(container ? { container } : {})}>
          <div className="p-2 space-y-2">
            <Calendar
              locale={zhTW}
              mode="single"
              selected={date}
              onSelect={(d) => update(d, time)}
              initialFocus
            />
            <SimpleTimePicker value={time} onChange={(t) => { setTime(t); update(date, t) }} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
