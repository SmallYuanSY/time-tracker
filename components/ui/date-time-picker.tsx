"use client"

import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { zhTW } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface DateTimePickerProps {
  label?: string
  value?: Date
  onChange?: (date: Date) => void
}

export function DateTimePicker({ label = "選擇日期", value, onChange }: DateTimePickerProps) {
  const [date, setDate] = useState<Date | undefined>(value)

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
            {date ? format(date, "yyyy/MM/dd") : "點擊選擇日期"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            locale={zhTW}
            mode="single"
            selected={date}
            onSelect={(d) => {
              setDate(d)
              onChange?.(d!)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
