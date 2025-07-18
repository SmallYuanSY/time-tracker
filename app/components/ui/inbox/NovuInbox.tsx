'use client';

// The Novu inbox component is a React component that allows you to display a notification inbox.
// Learn more: https://docs.novu.co/platform/inbox/overview

import { Inbox } from '@novu/nextjs';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

// import { dark } from '@novu/nextjs/themes'; => To enable dark theme support, uncomment this line.

// Get the subscriber ID based on the auth provider
// const getSubscriberId = () => {};

export default function NovuInbox() {
  const { data: session, status } = useSession();
  const [isClient, setIsClient] = useState(false);
  
  // 確保在客戶端才渲染組件
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // 確保在客戶端才執行 DOM 操作
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 動態設定 Novu 彈出視窗的樣式
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      [data-radix-popper-content-wrapper],
      [role="dialog"],
      [data-state="open"] {
        z-index: 9999 !important;
        position: fixed !important;
      }
    `;
    document.head.appendChild(styleSheet);
    
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, []);
  
  // 根據登入狀態決定 subscriberId
  const getSubscriberId = () => {
    if (status === 'loading') {
      return null; // 載入中，暫不顯示
    }
    
    if (!session?.user) {
      return "guest_user"; // 未登入用戶使用固定 ID
    }
    
    // 使用用戶的資料庫 ID 作為 subscriberId
    // Novu 會自動為這個 ID 建立 subscriber（如果不存在的話）
    return `user_${(session.user as any).id}`;
  };

  const subscriberId = getSubscriberId();
  
  // 檢查必要的環境變數
  const applicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APP_ID;
  
  // 如果還在載入 session，顯示載入狀態
  if (status === 'loading' || !subscriberId || !isClient) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white/70">載入通知中...</div>
      </div>
    );
  }

  // 如果缺少 Novu App ID，顯示設定指導
  if (!applicationIdentifier) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-yellow-400 text-sm text-center max-w-xs">
          <div className="font-semibold mb-2">🔔 設定通知服務</div>
          <div className="text-xs space-y-1">
            <p>1. 前往 <a href="https://dashboard.novu.co" target="_blank" className="text-blue-300 underline">Novu Dashboard</a></p>
            <p>2. 建立 .env.local 檔案</p>
            <p>3. 新增 NEXT_PUBLIC_NOVU_APP_ID</p>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    // Basic tab with no filtering (shows all notifications)
    {
      label: '全部',
      filter: { tags: [] },
    },
  ];

  // 在開發環境下，檢查是否支援必要的 API
  const isSecureContext = typeof window !== 'undefined' && (
    window.isSecureContext || 
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.match(/^192\.168\./)
  );

  if (!isSecureContext && process.env.NODE_ENV === 'development') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-yellow-400 text-sm text-center">
          <div>通知功能需要 HTTPS 環境</div>
          <div className="text-xs mt-1">開發環境請使用 localhost 或本地 IP</div>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="relative z-50">
        <Inbox
          applicationIdentifier={applicationIdentifier}
          subscriberId={subscriberId} 
          tabs={tabs}
          open={undefined}
          renderBell={undefined}
          onActionClick={(actionType, notification) => {
            console.log('Action clicked:', actionType, notification);
            
            // 處理 primary action 點擊
            if (actionType === 'primary' && notification.cta?.data?.url) {
              const url = notification.cta.data.url;
              const target = notification.cta.data.target || '_self';
              
              if (target === '_blank') {
                window.open(url, '_blank');
              } else {
                window.location.href = url;
              }
            }
            
            // 處理 secondary action 點擊
            if (actionType === 'secondary' && notification.cta?.data?.url) {
              const url = notification.cta.data.url;
              const target = notification.cta.data.target || '_self';
              
              if (target === '_blank') {
                window.open(url, '_blank');
              } else {
                window.location.href = url;
              }
            }
          }}
          appearance={{
            // To enable dark theme support, uncomment the following line:
            // baseTheme: dark,
            variables: {
              // The `variables` object allows you to define global styling properties that can be reused throughout the inbox.
              // Learn more: https://docs.novu.co/platform/inbox/react/styling#variables
            },
            elements: {
              // The `elements` object allows you to define styles for these components.
              // Learn more: https://docs.novu.co/platform/inbox/react/styling#elements
              popoverContent: {
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(12px)",
                transformOrigin: "top right",
                marginLeft: "auto",
                marginRight: "0"
              },
              popoverTrigger: {
                background: "rgba(255, 255, 255, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                borderRadius: "50%",
                padding: "12px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                width: "48px",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }
            },
            icons: {
              // The `icons` object allows you to define custom icons for the inbox.
            },
          }} 
        />
      </div>
    );
  } catch (error) {
    console.error('Novu Inbox 渲染錯誤:', error);
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-400 text-sm text-center">
          <div>通知服務暫時無法使用</div>
          <div className="text-xs mt-1">請稍後再試</div>
        </div>
      </div>
    );
  }
}