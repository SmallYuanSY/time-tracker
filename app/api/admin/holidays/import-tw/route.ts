import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole, HolidayType } from '@prisma/client'
import yaml from 'yaml'

interface TaiwanHoliday {
  date: string
  weekday: string
  holiday: number
  name: string
  description?: string
}

interface TaiwanHolidayData {
  year: number
  generated_at: string
  holidays: TaiwanHoliday[]
  special_working_days: any[]
}

// 從 GitHub 獲取假日資料
async function fetchHolidayData() {
  const currentYear = new Date().getFullYear()
  const nextYear = currentYear + 1
  
  const years = [currentYear, nextYear]
  const allHolidays = []

  for (const year of years) {
    const url = `https://raw.githubusercontent.com/SmallYuanSY/TaiwanHoliday/main/data/taiwan_holidays_${year}.yml`
    const response = await fetch(url)
    if (!response.ok) continue
    
    const data = await response.text()
    // 解析 YAML 格式的假日資料
    const holidays = parseYamlHolidays(data)
    allHolidays.push(...holidays)
  }

  return allHolidays
}

// 解析 YAML 格式的假日資料
function parseYamlHolidays(yamlContent: string) {
  try {
    const data = yaml.parse(yamlContent) as TaiwanHolidayData
    if (!data) return []

    const allHolidays = []

    // 處理一般假日
    if (data.holidays) {
      const holidays = data.holidays.map(holiday => {
        // 判斷假日類型
        let type: HolidayType
        let isHoliday = holiday.holiday === 1

        if (holiday.name === '例假日') {
          type = HolidayType.WEEKEND
        } else if (holiday.name.includes('補假')) {
          type = HolidayType.TRANSFER_HOLIDAY
        } else if (holiday.name.includes('補班')) {
          type = HolidayType.MAKEUP_WORKDAY
          isHoliday = false
        } else {
          type = HolidayType.NATIONAL_HOLIDAY
        }

        return {
          date: holiday.date,
          name: holiday.name,
          type,
          isHoliday,
          description: `${holiday.weekday}${holiday.description ? ` - ${holiday.description}` : ''}`
        }
      })
      allHolidays.push(...holidays)
    }

    // 處理補班日
    if (data.special_working_days) {
      const makeupDays = data.special_working_days.map(day => ({
        date: day.date,
        name: '補班日',
        type: HolidayType.MAKEUP_WORKDAY,
        isHoliday: false,
        description: `${day.weekday}${day.description ? ` - ${day.description}` : ''}`
      }))
      allHolidays.push(...makeupDays)
    }

    return allHolidays
  } catch (error) {
    console.error('解析 YAML 失敗:', error)
    return []
  }
}

// 檢查管理員權限
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return false
  }
  const role = session.user.role as UserRole
  return role === UserRole.ADMIN || role === UserRole.WEB_ADMIN
}

export async function POST() {
  try {
    const hasPermission = await checkAdminPermission()
    if (!hasPermission) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 獲取假日資料
    const holidays = await fetchHolidayData()

    // 批量創建假日記錄
    for (const holiday of holidays) {
      await prisma.holiday.upsert({
        where: { date: holiday.date },
        update: holiday,
        create: holiday
      })
    }

    return NextResponse.json({ message: '假日資料導入成功', count: holidays.length })
  } catch (error) {
    console.error('Error importing holidays:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 