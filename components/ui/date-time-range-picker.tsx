import { DateTimePicker } from "./date-time-picker"

interface DateTimeRangePickerProps {
  value: [Date | null, Date | null]
  onChange?: (value: [Date | null, Date | null]) => void
  container?: Element | null
}

export function DateTimeRangePicker({ value, onChange, container }: DateTimeRangePickerProps) {
  const [start, end] = value
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DateTimePicker
        label="開始時間"
        value={start || undefined}
        onChange={(d) => onChange?.([d, end])}
        container={container}
      />
      <DateTimePicker
        label="結束時間"
        value={end || undefined}
        onChange={(d) => onChange?.([start, d])}
        container={container}
      />
    </div>
  )
}
