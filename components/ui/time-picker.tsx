import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  label?: string
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

function currentTime() {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
}

export function TimePicker({ value = "09:00", onChange, label }: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(value)

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
    <div className="grid gap-2">
      {label && <label className="text-sm text-muted-foreground">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal backdrop-blur bg-white/10 border border-white/30 text-white">
            {internalValue || "選擇時間"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 flex space-x-2 bg-white/10 backdrop-blur border border-white/20 rounded-xl">
          <ScrollArea className="h-40 w-16">
            {hours.map((h) => (
              <div
                key={h}
                className={cn(
                  "px-2 py-1 rounded hover:bg-white/10 cursor-pointer text-center",
                  h === hour && "bg-white/20 text-white font-bold"
                )}
                onClick={() => setTime(h, minute)}
              >
                {h}
              </div>
            ))}
          </ScrollArea>
          <ScrollArea className="h-40 w-16">
            {minutes.map((m) => (
              <div
                key={m}
                className={cn(
                  "px-2 py-1 rounded hover:bg-white/10 cursor-pointer text-center",
                  m === minute && "bg-white/20 text-white font-bold"
                )}
                onClick={() => setTime(hour, m)}
              >
                {m}
              </div>
            ))}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}