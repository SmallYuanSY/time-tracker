import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Novu } from '@novu/api';

const novu = new Novu({ 
  secretKey: process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('未授權', { status: 401 });
    }

    if (!process.env.NOVU_SECRET_KEY) {
      return new NextResponse('找不到 NOVU_SECRET_KEY', { status: 500 });
    }

    const subscriberId = `user_${(session.user as any).id}`;
    
    // 使用 Novu SDK 發送測試通知
    const result = await novu.trigger({
      workflowId: 'projoin-notification',
      to: { subscriberId: subscriberId },
      payload: {
        title: '測試通知',
        body: '這是一個測試通知，用於驗證通知系統功能。',
        message: '這是一個測試通知，用於驗證通知系統功能。',
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: result,
      subscriberId,
      message: '測試通知已發送'
    });
  } catch (error) {
    console.error('測試通知 API 錯誤:', error);
    return new NextResponse('伺服器錯誤', { status: 500 });
  }
}