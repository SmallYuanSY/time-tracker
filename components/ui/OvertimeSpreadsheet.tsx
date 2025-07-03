"use client"

import { useState, useEffect, useMemo } from 'react'
import Spreadsheet from 'react-spreadsheet'
// @ts-ignore
import { CSVLink } from 'react-csv'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileSpreadsheet, FileDown } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface WorkLog {
  id: string
  startTime: string
  endTime: string | null
  projectCode: string
  projectName: string
  category: string
  content: string
  isEdited?: boolean
  editReason?: string
  editedAt?: string
  editedBy?: string
  editIpAddress?: string
  isOvertime?: boolean
  user: {
    id: string
    name: string
    email: string
  }
}

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'WEB_ADMIN' | 'EMPLOYEE'
  createdAt: string
}

interface AttendanceSignature {
  id: string
  userId: string
  date: string
  signedBy: string
  signedAt: string
  note?: string
  signerName: string
}

interface CellData {
  value: string
  className?: string
  editable?: boolean
}

interface OvertimeSpreadsheetProps {
  workLogs: WorkLog[]
  signatures: AttendanceSignature[]
  selectedUser: User | null
  currentDate: Date
  onDataChange?: (data: any[][]) => void
  onSelectDates?: (dates: string[]) => void
}

// 加入常數定義
const DAILY_OVERTIME_LIMIT = 4 * 60;  // 4小時 = 240分鐘
const MONTHLY_OVERTIME_LIMIT = 46 * 60;  // 46小時 = 2760分鐘

interface OvertimeStats {
  dailyMinutes: number;
  monthlyMinutes: number;
  isExceedDaily: boolean;
  isExceedMonthly: boolean;
}

export default function OvertimeSpreadsheet({
  workLogs,
  signatures,
  selectedUser,
  currentDate,
  onDataChange,
  onSelectDates
}: OvertimeSpreadsheetProps) {
  const [spreadsheetData, setSpreadsheetData] = useState<CellData[][]>([])
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // 按日期分組加班記錄
  const groupWorkLogsByDate = () => {
    const grouped: { [key: string]: WorkLog[] } = {}
    workLogs.forEach(log => {
      const date = format(parseISO(log.startTime), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(log)
    })
    return grouped
  }

  // 獲取日期的簽名記錄
  const getDateSignatures = (dateKey: string) => {
    return signatures.filter(sig => sig.date === dateKey)
  }

  // 準備電子表格資料
  const prepareSpreadsheetData = useMemo(() => {
    const headers: CellData[] = [
      { value: '日期', className: 'font-bold bg-gray-100 text-gray-900 w-32' },
      { value: '星期', className: 'font-bold bg-gray-100 text-gray-900 w-24' },
      { value: '開始時間', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '結束時間', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '專案代號', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '專案名稱', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '工作內容', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '加班時長', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '是否超時', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '當月累計', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '是否編輯', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '簽名狀態', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '簽名者', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '簽名時間', className: 'font-bold bg-gray-100 text-gray-900' },
      { value: '簽名備註', className: 'font-bold bg-gray-100 text-gray-900' }
    ]

    const data: CellData[][] = [headers]
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const groupedLogs = groupWorkLogsByDate()

    // 計算當月總加班時數
    let monthlyOvertimeMinutes = 0

    // 只處理有加班記錄的日期
    monthDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayName = format(day, 'EEEE', { locale: zhTW })
      const dayLogs = groupedLogs[dateKey] || []
      const daySignatures = getDateSignatures(dateKey)

      if (dayLogs.length > 0) {
        // 計算單日加班時數
        let dailyOvertimeMinutes = 0
        
        dayLogs.forEach(log => {
          if (log.endTime) {
            const start = new Date(log.startTime)
            const end = new Date(log.endTime)
            const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
            
            if (durationMinutes >= 30) {
              const roundedMinutes = Math.floor(durationMinutes / 30) * 30
              dailyOvertimeMinutes += roundedMinutes
            }
          }
        })

        // 檢查單日上限
        const isExceedDaily = dailyOvertimeMinutes > DAILY_OVERTIME_LIMIT
        const effectiveDailyMinutes = Math.min(dailyOvertimeMinutes, DAILY_OVERTIME_LIMIT)
        
        // 更新月累計時數（使用有效的單日時數）
        monthlyOvertimeMinutes += effectiveDailyMinutes
        const isExceedMonthly = monthlyOvertimeMinutes > MONTHLY_OVERTIME_LIMIT

        // 格式化時間顯示
        const formatMinutes = (minutes: number) => {
          const hours = Math.floor(minutes / 60)
          const mins = minutes % 60
          return `${hours}小時${mins > 0 ? `${mins}分鐘` : ''}`
        }

        dayLogs.forEach(log => {
          const startTime = format(parseISO(log.startTime), 'HH:mm')
          const endTime = log.endTime ? format(parseISO(log.endTime), 'HH:mm') : '-'
          
          let overtimeDuration = '-'
          if (log.endTime) {
            const start = new Date(log.startTime)
            const end = new Date(log.endTime)
            const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
            
            if (durationMinutes >= 30) {
              const roundedMinutes = Math.floor(durationMinutes / 30) * 30
              overtimeDuration = formatMinutes(roundedMinutes)
            }
          }

          // 簽名資訊
          const signatureStatus = daySignatures.length > 0 ? `已簽名 (${daySignatures.length}位主管)` : '未簽名'
          const signers = daySignatures.map(sig => sig.signerName).join('、')
          const signTimes = daySignatures.map(sig => format(parseISO(sig.signedAt), 'yyyy-MM-dd HH:mm')).join('、')
          const signNotes = daySignatures.map(sig => sig.note || '').filter(note => note).join('、')

          // 超時警告訊息
          let overtimeWarning = '正常'
          let overtimeWarningClass = 'text-green-600'
          
          if (isExceedDaily) {
            overtimeWarning = `超出單日上限 (${formatMinutes(dailyOvertimeMinutes)})`
            overtimeWarningClass = 'text-red-600 font-bold'
          }

          // 月累計顯示
          const monthlyDisplay = formatMinutes(monthlyOvertimeMinutes)
          const monthlyDisplayClass = isExceedMonthly ? 'text-red-600 font-bold' : 'text-gray-900'

          data.push([
            { value: format(day, 'yyyy/MM/dd'), className: 'text-gray-900 w-32' },
            { value: dayName, className: 'text-gray-900 w-24' },
            { value: startTime, className: 'text-gray-900' },
            { value: endTime, className: 'text-gray-900' },
            { value: log.projectCode, className: 'text-gray-900' },
            { value: log.projectName, className: 'text-gray-900' },
            { value: log.content, className: 'text-gray-900' },
            { value: overtimeDuration, className: 'text-gray-900' },
            { value: overtimeWarning, className: overtimeWarningClass },
            { value: monthlyDisplay, className: monthlyDisplayClass },
            { value: log.isEdited ? '是' : '否', className: log.isEdited ? 'text-orange-600' : 'text-gray-900' },
            { value: signatureStatus, className: daySignatures.length > 0 ? 'text-green-600' : 'text-gray-500' },
            { value: signers || '-', className: 'text-gray-900' },
            { value: signTimes || '-', className: 'text-gray-900' },
            { value: signNotes || '-', className: 'text-gray-900' }
          ])
        })
      }
    })

    // 如果沒有任何加班記錄，添加一行提示
    if (data.length === 1) {
      data.push(Array(headers.length).fill({ value: '本月無加班記錄', className: 'text-gray-500 text-center' }))
    }

    // 如果有加班記錄，在最後添加月累計總結
    if (data.length > 1) {
      const summaryRow = Array(headers.length).fill({ value: '', className: 'text-gray-900' })
      summaryRow[0] = { value: '本月總計', className: 'font-bold text-gray-900' }
      summaryRow[7] = { 
        value: `${Math.floor(monthlyOvertimeMinutes / 60)}小時${monthlyOvertimeMinutes % 60}分鐘`,
        className: monthlyOvertimeMinutes > MONTHLY_OVERTIME_LIMIT ? 'font-bold text-red-600' : 'font-bold text-gray-900'
      }
      if (monthlyOvertimeMinutes > MONTHLY_OVERTIME_LIMIT) {
        summaryRow[8] = { 
          value: `⚠️ 超出月上限${Math.floor((monthlyOvertimeMinutes - MONTHLY_OVERTIME_LIMIT) / 60)}小時${(monthlyOvertimeMinutes - MONTHLY_OVERTIME_LIMIT) % 60}分鐘`,
          className: 'font-bold text-red-600'
        }
      }
      data.push(summaryRow)
    }

    return data
  }, [workLogs, signatures, currentDate])

  // 更新表格資料
  useEffect(() => {
    setSpreadsheetData(prepareSpreadsheetData)
    onDataChange?.(prepareSpreadsheetData)
  }, [prepareSpreadsheetData, onDataChange])

  // CSV 匯出設定
  const csvHeaders = [
    { label: '員工姓名', key: 'name' },
    { label: '日期', key: 'date' },
    { label: '星期', key: 'day' },
    { label: '開始時間', key: 'startTime' },
    { label: '結束時間', key: 'endTime' },
    { label: '專案代號', key: 'projectCode' },
    { label: '專案名稱', key: 'projectName' },
    { label: '工作內容', key: 'content' },
    { label: '加班時長', key: 'duration' },
    { label: '是否超時', key: 'isOvertime' },
    { label: '當月累計', key: 'monthlyTotal' },
    { label: '是否編輯', key: 'isEdited' },
    { label: '簽名狀態', key: 'signStatus' },
    { label: '簽名者', key: 'signers' },
    { label: '簽名時間', key: 'signTime' },
    { label: '簽名備註', key: 'signNote' }
  ]

  const csvFilename = `加班記錄_${selectedUser?.name || selectedUser?.email}_${format(currentDate, 'yyyy年MM月')}.csv`

  // 處理行選擇
  const handleRowClick = (dateKey: string, hasRecords: boolean) => {
    if (!hasRecords) return
    
    const newSelectedRows = new Set(selectedRows)
    if (selectedRows.has(dateKey)) {
      newSelectedRows.delete(dateKey)
    } else {
      newSelectedRows.add(dateKey)
    }
    setSelectedRows(newSelectedRows)
    onSelectDates?.(Array.from(newSelectedRows))
  }

  // 處理表格資料變更
  const handleSpreadsheetChange = (data: any[][]) => {
    onDataChange?.(data)
  }

  if (!selectedUser) {
    return (
      <Card className="bg-white/5 backdrop-blur border-white/10">
        <CardContent className="p-6">
          <div className="text-center text-white/60">
            請選擇一個用戶來查看加班記錄
          </div>
        </CardContent>
      </Card>
    )
  }

  // 準備 CSV 資料
  const csvData = spreadsheetData.slice(1).map(row => ({
    name: selectedUser?.name || selectedUser?.email,
    date: row[0].value,
    day: row[1].value,
    startTime: row[2].value,
    endTime: row[3].value,
    projectCode: row[4].value,
    projectName: row[5].value,
    content: row[6].value,
    duration: row[7].value,
    isOvertime: row[8].value,
    monthlyTotal: row[9].value,
    isEdited: row[10].value,
    signStatus: row[11].value,
    signers: row[12].value,
    signTime: row[13].value,
    signNote: row[14].value
  }))

  return (
    <Card className="bg-white/5 backdrop-blur border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            加班記錄電子表格 - {selectedUser.name || selectedUser.email}
          </CardTitle>
          <div className="flex items-center gap-2">
            <CSVLink
              data={csvData}
              headers={csvHeaders}
              filename={csvFilename}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-green-600 bg-green-600 hover:bg-green-700 text-white h-9 px-3"
              encodeKeysBeforeTransform={true}
              separator=","
              uFEFF={true}
            >
              <Download className="w-4 h-4 mr-2" />
              匯出 CSV
            </CSVLink>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-white rounded-lg overflow-hidden">
          <Spreadsheet
            data={spreadsheetData}
            onChange={handleSpreadsheetChange}
            columnLabels={['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']}
            rowLabels={Array.from({ length: spreadsheetData.length }, (_, i) => String(i + 1))}
          />
        </div>
        <div className="mt-4 text-sm text-white/60">
          <p>• 您可以點擊日期列來選擇要簽名的記錄</p>
          <p>• 編輯完成後可以匯出為 CSV 格式</p>
          <p>• 灰色欄位為只讀，無法編輯</p>
        </div>
      </CardContent>
    </Card>
  )
} 