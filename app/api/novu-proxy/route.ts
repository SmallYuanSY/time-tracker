import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Novu } from '@novu/api';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('未授權', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const subscriberId = searchParams.get('subscriberId');

    if (!process.env.NOVU_SECRET_KEY) {
      console.error('找不到 NOVU_SECRET_KEY 環境變數');
      return new NextResponse('伺服器設定錯誤', { status: 500 });
    }

    if (action === 'unseenCount' && subscriberId) {
      const novuClient = new Novu({
        secretKey: process.env.NOVU_SECRET_KEY
      });

      try {
        // Use direct fetch for unseenCount as it's not available in the new SDK structure
        const response = await fetch(`https://api.novu.co/v1/subscribers/${subscriberId}/notifications/unseen`, {
          method: 'GET',
          headers: {
            'Authorization': `ApiKey ${process.env.NOVU_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        const count = data?.data?.count || 0;
        return NextResponse.json({ count });
      } catch (error) {
        console.error('Novu SDK 錯誤:', error);
        return NextResponse.json({ count: 0 }, { status: 200 });
      }
    }

    if (action === 'notifications' && subscriberId) {
      const novuClient = new Novu({
        secretKey: process.env.NOVU_SECRET_KEY
      });

      try {
        const page = parseInt(searchParams.get('page') || '0');
        const limit = parseInt(searchParams.get('limit') || '10');
        
        // Use direct fetch for feed as the SDK structure has changed
        const response = await fetch(`https://api.novu.co/v1/subscribers/${subscriberId}/notifications/feed?page=${page}&limit=${limit}`, {
          method: 'GET',
          headers: {
            'Authorization': `ApiKey ${process.env.NOVU_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        return NextResponse.json({
          data: result?.data || [],
          totalCount: result?.totalCount || 0,
          page: page,
          pageSize: limit
        });
      } catch (error) {
        console.error('Novu 獲取通知列表錯誤:', error);
        return NextResponse.json({ 
          data: [], 
          totalCount: 0, 
          page: 0, 
          pageSize: 10 
        }, { status: 200 });
      }
    }

    if (action === 'markAsRead' && subscriberId) {
      // 標記通知為已讀
      console.log('=== markAsRead API 開始 ===');
      console.log('subscriberId:', subscriberId);
      console.log('action:', action);
      console.log('所有查詢參數:', Object.fromEntries(searchParams.entries()));
      
      const novuClient = new Novu({
        secretKey: process.env.NOVU_SECRET_KEY
      });

      try {
        const notificationId = searchParams.get('notificationId');
        console.log('notificationId:', notificationId);
        
        if (!notificationId) {
          console.error('錯誤: 缺少 notificationId');
          return new NextResponse('缺少 notificationId', { status: 400 });
        }

        console.log('準備調用 Novu markAllAs:');
        console.log('  - subscriberId:', subscriberId);
        console.log('  - notificationId:', notificationId);
        console.log('  - markAs: read');

        // 使用正確的 Novu API 方法
        const markResult = await novuClient.subscribers.messages.markAllAs({
          messageId: [notificationId],
          markAs: "read"
        }, subscriberId);
        
        console.log('Novu markAllAs 成功回應:', markResult);
        return NextResponse.json({ success: true, data: markResult });
      } catch (error: any) {
        console.error('=== Novu 標記通知為已讀錯誤 ===');
        console.error('錯誤類型:', error?.constructor?.name);
        console.error('錯誤訊息:', error?.message);
        console.error('完整錯誤:', error);
        return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
      }
    }

    if (action === 'markAsSeen' && subscriberId) {
      // 標記通知為已看見
      const novuClient = new Novu({
        secretKey: process.env.NOVU_SECRET_KEY
      });

      try {
        const notificationId = searchParams.get('notificationId');
        if (!notificationId) {
          return new NextResponse('缺少 notificationId', { status: 400 });
        }

        // 使用正確的 Novu API 方法
        const seenResult = await novuClient.subscribers.messages.markAllAs({
          messageId: [notificationId],
          markAs: "seen"
        }, subscriberId);
        
        return NextResponse.json({ success: true, data: seenResult });
      } catch (error: any) {
        console.error('Novu 標記通知為已看見錯誤:', error);
        return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
      }
    }

    return new NextResponse('不支持的操作', { status: 400 });
  } catch (error) {
    console.error('Novu API 代理錯誤:', error);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}

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

    // 使用 Novu SDK 觸發事件
    const novuClient = new Novu({
      secretKey: process.env.NOVU_SECRET_KEY
    });

    try {
      // 構建觸發事件的 payload
      const triggerPayload: any = {
        name: body.workflowId,
        to: body.to,
        payload: body.payload || {},
        ...(body.actor && { actor: body.actor })
      };

      // 如果有提供 CTA 設定，加入到 payload 中
      if (body.primaryAction) {
        triggerPayload.payload.primaryAction = body.primaryAction;
      }
      
      if (body.secondaryAction) {
        triggerPayload.payload.secondaryAction = body.secondaryAction;
      }

      // 如果有提供直接的 URL 導向設定
      if (body.redirectUrl) {
        triggerPayload.payload.primaryAction = {
          label: body.actionLabel || "查看詳情",
          redirect: {
            url: body.redirectUrl,
            target: body.redirectTarget || "_blank"
          }
        };
      }

      const triggerResult = await novuClient.trigger(triggerPayload);

      return NextResponse.json(triggerResult);
    } catch (error: any) {
      console.error('Novu SDK 觸發事件錯誤:', error);
      return NextResponse.json(
        { error: error?.message || 'SDK 錯誤' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Novu API 代理錯誤:', error);
    return new NextResponse('伺服器錯誤', { status: 500 });
  }
} 