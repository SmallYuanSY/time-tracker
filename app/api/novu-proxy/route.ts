import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('未授權', { status: 401 });
    }

    const body = await req.json();
    
    if (!process.env.NOVU_SECRET_KEY) {
      console.error('找不到 NOVU_SECRET_KEY 環境變數');
      return new NextResponse('伺服器設定錯誤', { status: 500 });
    }

    // 驗證必要欄位
    if (!body.workflowId || !body.to?.subscriberId) {
      console.error('缺少必要欄位:', body);
      return new NextResponse('缺少必要欄位', { status: 400 });
    }

    const response = await fetch('https://api.novu.co/v1/events/trigger', {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${process.env.NOVU_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Novu API 錯誤:', {
        status: response.status,
        data
      });
    }

    return NextResponse.json(data, {
      status: response.status
    });
  } catch (error) {
    console.error('Novu API 代理錯誤:', error);
    return new NextResponse('伺服器錯誤', { status: 500 });
  }
} 