import { NextRequest, NextResponse } from 'next/server'
import { Novu } from '@novu/api'
import { prisma } from '@/lib/prisma'

const novu = new Novu({ 
  secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY
})

export async function POST(req: NextRequest) {
  try {
    const { subscriberId, message, tags, priority, userId } = await req.json()

    if (!subscriberId) {
      return NextResponse.json(
        { error: '缺少 subscriberId' },
        { status: 400 }
      )
    }

    // 如果有提供 userId，自動更新 Novu subscriber 的資料
    if (userId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId }
        })

        if (user) {
          // 嘗試建立或更新 subscriber 資料（姓名和信箱）
          await novu.subscribers.create({
            subscriberId: subscriberId,
            email: user.email,
            firstName: user.name || undefined,
            data: {
              userId: user.id,
              lastUpdated: new Date().toISOString(),
            }
          })
          console.log(`✅ Subscriber ${subscriberId} 資料已更新`)
        }
      } catch (updateError) {
        // 更新失敗不影響發送通知
        console.log('⚠️ 更新 subscriber 資料失敗，但繼續發送通知:', updateError)
      }
    }

    // 使用 Novu SDK 發送通知
    const result = await novu.trigger({
      workflowId: 'test-notification',
      to: {
        subscriberId: subscriberId,
      },
      payload: {
        title: '測試通知',
        body: message || '這是一個測試通知',
        message: message || '這是一個測試通知', // 保留 message 用於向後相容
        priority: priority || 'normal',
        tags: tags || [],
      },
    })

    return NextResponse.json({ 
      success: true, 
      data: result,
      message: '通知發送成功'
    })
  } catch (error) {
    console.error('發送通知失敗:', error)
    return NextResponse.json(
      { 
        error: '發送通知失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
} 