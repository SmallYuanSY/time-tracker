"use client"

import { useState, useEffect, useMemo } from 'react'
import Spreadsheet from 'react-spreadsheet'
// @ts-ignore
import { CSVLink } from 'react-csv'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileSpreadsheet } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface ClockRecord {
  id: string
  type: 'IN' | 'OUT'
  timestamp: string
  isEdited?: boolean
  editReason?: string
  editedAt?: string
  editedBy?: string
  editIpAddress?: string
  originalTimestamp?: string
  user: {
    id: string
    name: string
    email: string
  }
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

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'WEB_ADMIN' | 'EMPLOYEE'
  createdAt: string
}

interface AttendanceSpreadsheetProps {
  clockRecords: ClockRecord[]
  signatures: AttendanceSignature[]
  selectedUser: User | null
  currentDate: Date
  onDataChange?: (data: any[][]) => void
}

type CellData = {
  value: string | number
  readOnly?: boolean
}

export default function AttendanceSpreadsheet({
  clockRecords,
  signatures,
  selectedUser,
  currentDate,
  onDataChange
}: AttendanceSpreadsheetProps) {
  const [spreadsheetData, setSpreadsheetData] = useState<CellData[][]>([])

  // 按日期分組打卡記錄
  const groupClockRecordsByDate = () => {
    const grouped: { [key: string]: ClockRecord[] } = {}
    clockRecords.forEach(record => {
      const date = format(parseISO(record.timestamp), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(record)
    })
    return grouped
  }

  // 獲取日期的簽名記錄
  const getDateSignatures = (dateKey: string) => {
    return signatures.filter(sig => sig.date === dateKey)
  }

  // 準備電子表格資料
  const prepareSpreadsheetData = useMemo(() => {
    if (!selectedUser) return []

    const data: CellData[][] = []
    
    // 表頭
    const headers = [
      '員工姓名', '日期', '星期', '上班時間', '下班時間', 
      '工作時長', '加班時長', '是否編輯', '簽名狀態', '簽名者', '簽名時間', '簽名備註'
    ]
    
    data.push(headers.map(header => ({ value: header, readOnly: true })))

    // 獲取當月所有日期
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const groupedRecords = groupClockRecordsByDate()

    // 確保至少顯示31行
    const minRows = 31
    const daysToShow = Math.max(monthDays.length, minRows - 1) // -1 是因為表頭佔一行

    monthDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const dayName = format(day, 'EEEE', { locale: zhTW })
      const dayRecords = groupedRecords[dateKey] || []
      
      if (dayRecords.length === 0) {
        // 沒有打卡記錄的日期
        data.push([
          { value: selectedUser.name || selectedUser.email, readOnly: true },
          { value: format(day, 'yyyy-MM-dd'), readOnly: true },
          { value: dayName, readOnly: true },
          { value: '', readOnly: false },
          { value: '', readOnly: false },
          { value: '', readOnly: false },
          { value: '', readOnly: false },
          { value: '', readOnly: true },
          { value: '', readOnly: true },
          { value: '', readOnly: true },
          { value: '', readOnly: true },
          { value: '', readOnly: true }
        ])
      } else {
        // 有打卡記錄的日期
        const workRecords = dayRecords.filter(r => r.type === 'IN' || r.type === 'OUT')
        const workStart = workRecords.find(r => r.type === 'IN')
        const workEnd = workRecords.filter(r => r.type === 'OUT').pop()
        
        // 計算工作時長（扣除午休時間）
        let totalWorkTime = ''
        if (workStart && workEnd) {
          const startTime = new Date(workStart.timestamp)
          const endTime = new Date(workEnd.timestamp)
          
          // 基本工作時間（毫秒）
          let workTimeMs = endTime.getTime() - startTime.getTime()
          
          // 檢查是否跨越午休時間 (12:30-13:30)
          const lunchStart = new Date(startTime)
          lunchStart.setHours(12, 30, 0, 0)
          const lunchEnd = new Date(startTime)
          lunchEnd.setHours(13, 30, 0, 0)
          
          // 如果工作時間跨越午休時間，則扣除1小時
          if (startTime < lunchEnd && endTime > lunchStart) {
            // 計算實際的午休重疊時間
            const overlapStart = startTime > lunchStart ? startTime : lunchStart
            const overlapEnd = endTime < lunchEnd ? endTime : lunchEnd
            
            if (overlapStart < overlapEnd) {
              workTimeMs -= (overlapEnd.getTime() - overlapStart.getTime())
            }
          }
          
          const totalMinutes = workTimeMs / (1000 * 60)
          const hours = Math.floor(totalMinutes / 60)
          const minutes = Math.round(totalMinutes % 60)
          
          if (totalMinutes < 0) {
            totalWorkTime = '0分鐘'
          } else if (hours === 0) {
            totalWorkTime = `${minutes}分鐘`
          } else {
            totalWorkTime = minutes > 0 ? `${hours}小時${minutes}分鐘` : `${hours}小時`
          }
        }
        
        // 檢查是否有編輯
        const hasEditedRecords = dayRecords.some(r => r.isEdited)
        
        // 獲取簽名資訊
        const daySignatures = getDateSignatures(dateKey)
        const signatureStatus = daySignatures.length > 0 ? `已簽名 (${daySignatures.length}位主管)` : '未簽名'
        const signers = daySignatures.map(sig => sig.signerName).join('、')
        const signTimes = daySignatures.map(sig => format(parseISO(sig.signedAt), 'yyyy-MM-dd HH:mm')).join('、')
        const signNotes = daySignatures.map(sig => sig.note || '').filter(note => note).join('、')

        // 計算加班時間範圍（18:00後或6:00前的時間）
        let overtimeInfo = ''
        if (dayRecords.length > 0) {
          // 分析所有打卡記錄，找出加班時段
          const allRecords = dayRecords.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          
          let earliestOvertimeStart: Date | null = null
          let latestOvertimeEnd: Date | null = null
          let totalOvertimeMinutes = 0
          
          // 檢查每個記錄是否在加班時段
          allRecords.forEach(record => {
            const recordTime = new Date(record.timestamp)
            const hour = recordTime.getHours()
            
            // 18:00後或6:00前算加班時段
            if (hour >= 18 || hour < 6) {
              if (record.type === 'IN') {
                earliestOvertimeStart = recordTime
              } else if (record.type === 'OUT') {
                latestOvertimeEnd = recordTime
              }
            }
          })
          
          // 如果有加班記錄，計算總時長
          if (earliestOvertimeStart && latestOvertimeEnd) {
            const startTime = earliestOvertimeStart as Date
            const endTime = latestOvertimeEnd as Date
            totalOvertimeMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60)
            
            // 只有滿30分鐘才顯示
            if (totalOvertimeMinutes >= 30) {
              const startTimeStr = format(startTime, 'HH:mm')
              const endTimeStr = format(endTime, 'HH:mm')
              
              const hours = Math.floor(totalOvertimeMinutes / 60)
              const minutes = Math.round(totalOvertimeMinutes % 60)
              let durationStr = ''
              
              if (hours === 0) {
                durationStr = `${minutes}分鐘`
              } else {
                durationStr = minutes > 0 ? `${hours}小時${minutes}分鐘` : `${hours}小時`
              }
              
              overtimeInfo = `${startTimeStr}-${endTimeStr} (${durationStr})`
            }
          }
        }

        data.push([
          { value: selectedUser.name || selectedUser.email, readOnly: true },
          { value: format(day, 'yyyy-MM-dd'), readOnly: true },
          { value: dayName, readOnly: true },
          { value: workStart ? format(parseISO(workStart.timestamp), 'HH:mm') : '', readOnly: false },
          { value: workEnd ? format(parseISO(workEnd.timestamp), 'HH:mm') : '', readOnly: false },
          { value: totalWorkTime, readOnly: false },
          { value: overtimeInfo, readOnly: false },
          { value: hasEditedRecords ? '是' : '否', readOnly: true },
          { value: signatureStatus, readOnly: true },
          { value: signers, readOnly: true },
          { value: signTimes, readOnly: true },
          { value: signNotes, readOnly: true }
        ])
      }
    })

    // 如果實際天數少於31天，填充空行
    const remainingRows = minRows - data.length
    if (remainingRows > 0) {
      for (let i = 0; i < remainingRows; i++) {
        data.push([
          { value: selectedUser.name || selectedUser.email, readOnly: true },
          { value: '', readOnly: true },
          { value: '', readOnly: true },
          { value: '', readOnly: false },
          { value: '', readOnly: false },
          { value: '', readOnly: false },
          { value: '', readOnly: false },
          { value: '', readOnly: true },
          { value: '', readOnly: true },
          { value: '', readOnly: true },
          { value: '', readOnly: true },
          { value: '', readOnly: true }
        ])
      }
    }

    return data
  }, [clockRecords, signatures, selectedUser, currentDate])

  useEffect(() => {
    setSpreadsheetData(prepareSpreadsheetData)
  }, [prepareSpreadsheetData])

  // 處理資料變更
  const handleDataChange = (data: any) => {
    const processedData = data.map((row: any) => 
      row.map((cell: any) => ({
        value: cell?.value || '',
        readOnly: cell?.readOnly || false
      }))
    )
    setSpreadsheetData(processedData)
    if (onDataChange) {
      const plainData = processedData.map((row: any) => row.map((cell: any) => cell.value))
      onDataChange(plainData)
    }
  }



  // 準備 CSV 資料
  const csvData = useMemo(() => {
    if (!selectedUser || spreadsheetData.length === 0) return []
    
    return spreadsheetData.map(row => 
      row.map(cell => cell.value)
    )
  }, [selectedUser, spreadsheetData])

  const csvHeaders = [
    { label: '員工姓名', key: 'name' },
    { label: '日期', key: 'date' },
    { label: '星期', key: 'day' },
    { label: '上班時間', key: 'startTime' },
    { label: '下班時間', key: 'endTime' },
    { label: '工作時長', key: 'duration' },
    { label: '加班時長', key: 'overtime' },
    { label: '是否編輯', key: 'isEdited' },
    { label: '簽名狀態', key: 'signStatus' },
    { label: '簽名者', key: 'signers' },
    { label: '簽名時間', key: 'signTime' },
    { label: '簽名備註', key: 'signNote' }
  ]

  const csvFilename = `考勤記錄_${selectedUser?.name || selectedUser?.email}_${format(currentDate, 'yyyy年MM月')}.csv`

  if (!selectedUser) {
    return (
      <Card className="bg-white/5 backdrop-blur border-white/10">
        <CardContent className="p-6">
          <div className="text-center text-white/60">
            請選擇一個用戶來查看考勤記錄
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/5 backdrop-blur border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            考勤記錄電子表格 - {selectedUser.name || selectedUser.email}
          </CardTitle>
                     <div className="flex items-center gap-2">
             <CSVLink
               data={csvData}
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
            onChange={handleDataChange}
            columnLabels={['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']}
            rowLabels={Array.from({ length: spreadsheetData.length }, (_, i) => String(i + 1))}
          />
        </div>
                 <div className="mt-4 text-sm text-white/60">
           <p>• 您可以直接在表格中編輯可編輯的欄位（上班時間、下班時間、工作時長）</p>
           <p>• 編輯完成後可以匯出為 CSV 格式</p>
           <p>• 灰色欄位為只讀，無法編輯</p>
         </div>
      </CardContent>
    </Card>
  )
} 