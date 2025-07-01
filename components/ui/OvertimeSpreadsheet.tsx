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

    // 只處理有加班記錄的日期
    monthDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayName = format(day, 'EEEE', { locale: zhTW })
      const dayLogs = groupedLogs[dateKey] || []
      const daySignatures = getDateSignatures(dateKey)

      if (dayLogs.length > 0) {
        // 有加班記錄的日期
        dayLogs.forEach(log => {
          const startTime = format(parseISO(log.startTime), 'HH:mm')
          const endTime = log.endTime ? format(parseISO(log.endTime), 'HH:mm') : '-'
          
          // 計算加班時長（以30分鐘為單位）
          let overtimeDuration = '-'
          if (log.endTime) {
            const start = new Date(log.startTime)
            const end = new Date(log.endTime)
            const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
            
            // 如果不滿30分鐘，不顯示
            if (durationMinutes >= 30) {
              // 將分鐘數向下取整到最近的30分鐘
              const roundedMinutes = Math.floor(durationMinutes / 30) * 30
              const hours = Math.floor(roundedMinutes / 60)
              const minutes = roundedMinutes % 60
              
              if (hours === 0) {
                overtimeDuration = `${minutes}分鐘`
              } else if (minutes === 0) {
                overtimeDuration = `${hours}小時`
              } else {
                overtimeDuration = `${hours}小時${minutes}分鐘`
              }
            }
          }

          // 簽名資訊
          const signatureStatus = daySignatures.length > 0 ? `已簽名 (${daySignatures.length}位主管)` : '未簽名'
          const signers = daySignatures.map(sig => sig.signerName).join('、')
          const signTimes = daySignatures.map(sig => format(parseISO(sig.signedAt), 'yyyy-MM-dd HH:mm')).join('、')
          const signNotes = daySignatures.map(sig => sig.note || '').filter(note => note).join('、')

          data.push([
            { value: format(day, 'yyyy/MM/dd'), className: 'text-gray-900 w-32' },
            { value: dayName, className: 'text-gray-900 w-24' },
            { value: startTime, className: 'text-gray-900' },
            { value: endTime, className: 'text-gray-900' },
            { value: log.projectCode, className: 'text-gray-900' },
            { value: log.projectName, className: 'text-gray-900' },
            { value: log.content, className: 'text-gray-900' },
            { value: overtimeDuration, className: 'text-gray-900' },
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
    name: selectedUser.name || selectedUser.email,
    date: row[0].value,
    day: row[1].value,
    startTime: row[2].value,
    endTime: row[3].value,
    projectCode: row[4].value,
    projectName: row[5].value,
    content: row[6].value,
    duration: row[7].value,
    isEdited: row[8].value,
    signStatus: row[9].value,
    signers: row[10].value,
    signTime: row[11].value,
    signNote: row[12].value
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