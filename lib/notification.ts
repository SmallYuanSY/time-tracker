import { Novu } from '@novu/api';

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY
});

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private swRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {
    // 私有建構函數確保單例模式
    if (typeof window !== 'undefined') {
      this.permission = Notification.permission;
      this.initializeServiceWorker();
    }
  }

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // 檢查是否為安全上下文（HTTPS 或 localhost）
        const isSecureContext = window.isSecureContext || 
                               window.location.protocol === 'https:' ||
                               window.location.hostname === 'localhost' ||
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname.match(/^192\.168\./);

        if (!isSecureContext) {
          console.log('Service Worker 需要安全上下文 (HTTPS 或 localhost)');
          return;
        }

        // 在開發環境中，支援 localhost 和本地 IP 地址
        if (process.env.NODE_ENV === 'development') {
          const allowedHosts = ['localhost', '127.0.0.1'];
          const currentHost = window.location.hostname;
          
          // 允許本地 IP 地址（192.168.x.x, 10.x.x.x, 172.16-31.x.x）
          const isLocalIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(currentHost);
          
          if (!allowedHosts.includes(currentHost) && !isLocalIP) {
            console.log('開發環境中支援的主機名:', [...allowedHosts, '本地 IP 地址'].join(', '));
            return;
          }
        }

        // 嘗試註冊 Service Worker，使用重試機制
        await this.registerServiceWorkerWithRetry();
        
        console.log('Service Worker 註冊成功');
      } catch (error) {
        console.error('Service Worker 註冊失敗:', error instanceof Error ? error.message : String(error));
        console.log('推送通知功能將不可用，但應用程式會繼續正常運行');
        this.swRegistration = null;
      }
    }
  }

  private async registerServiceWorkerWithRetry(maxRetries: number = 3): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          // 在開發環境中使用更寬鬆的更新檢查
          updateViaCache: process.env.NODE_ENV === 'development' ? 'none' : 'imports'
        });
        
        // 等待 Service Worker 準備就緒
        if (this.swRegistration.installing) {
          await new Promise((resolve) => {
            this.swRegistration!.installing!.addEventListener('statechange', () => {
              if (this.swRegistration!.installing!.state === 'installed') {
                resolve(void 0);
              }
            });
          });
        }
        
        return; // 成功註冊，退出重試循環
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`Service Worker 註冊嘗試 ${attempt}/${maxRetries} 失敗:`, lastError.message);
        
        if (attempt < maxRetries) {
          // 等待一段時間後重試
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // 所有重試都失敗了
    throw lastError || new Error('Service Worker 註冊失敗');
  }

  public static getInstance(): NotificationService {
    // 確保只在客戶端建立實例
    if (typeof window === 'undefined') {
      // 在伺服器端返回一個模擬的實例
      return {
        requestPermission: async () => false,
        sendNotification: async () => {},
        sendPushNotification: async () => {},
        scheduleNotification: async () => {},
        schedulePushNotification: async () => {},
      } as unknown as NotificationService;
    }
    
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') {
      console.warn('通知服務只能在客戶端使用');
      return false;
    }

    if (!('Notification' in window)) {
      console.warn('此瀏覽器不支援系統通知');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      
      if (this.permission === 'granted') {
        // 如果權限允許，訂閱推送服務
        await this.subscribeToPushNotifications();
      }
      
      return this.permission === 'granted';
    } catch (error) {
      console.error('請求通知權限時發生錯誤:', error);
      return false;
    }
  }

  private async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      console.warn('Service Worker 未註冊，無法訂閱推送通知');
      return null;
    }

    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        console.error('找不到 VAPID public key');
        return null;
      }

      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });

      // 將訂閱資訊儲存到後端
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      return subscription;
    } catch (error) {
      console.error('訂閱推送服務失敗:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  public async scheduleNotification(
    title: string,
    options: NotificationOptions,
    scheduledTime: Date
  ): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('通知服務只能在客戶端使用');
      return;
    }

    if (!('Notification' in window)) {
      console.warn('此瀏覽器不支援系統通知');
      return;
    }

    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('未獲得通知權限');
        return;
      }
    }

    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      console.warn('排程時間已過');
      return;
    }

    setTimeout(() => {
      try {
        const notification = new Notification(title, {
          ...options,
          icon: options.icon || '/favicon.ico',
          badge: options.badge || '/favicon.ico',
          silent: options.silent ?? false,
        });

        // 添加通知事件處理
        notification.onclick = () => {
          console.log('通知被點擊');
          window.focus();
        };

        notification.onshow = () => {
          console.log('通知已顯示');
        };

        notification.onerror = (error) => {
          console.error('通知顯示錯誤:', error);
        };
      } catch (error) {
        console.error('發送通知時發生錯誤:', error);
      }
    }, delay);
  }

  public async sendNotification(
    title: string,
    options: NotificationOptions
  ): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('通知服務只能在客戶端使用');
      return;
    }

    if (!('Notification' in window)) {
      console.warn('此瀏覽器不支援系統通知');
      return;
    }

    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('未獲得通知權限');
        return;
      }
    }

    try {
      const notification = new Notification(title, {
        ...options,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        silent: options.silent ?? false,
      });

      // 添加通知事件處理
      notification.onclick = () => {
        console.log('通知被點擊');
        window.focus();
      };

      notification.onshow = () => {
        console.log('通知已顯示');
      };

      notification.onerror = (error) => {
        console.error('通知顯示錯誤:', error);
      };
    } catch (error) {
      console.error('發送通知時發生錯誤:', error);
      throw error;
    }
  }

  // 移除 sendCombinedNotification 方法，改為只處理瀏覽器通知
  public async sendPushNotification(
    title: string,
    options: {
      body?: string;
      tag?: string;
      icon?: string;
      data?: any;
      url?: string;
    }
  ): Promise<void> {
    try {
      // 如果在客戶端且啟用了通知
      if (typeof window !== 'undefined') {
        const userSettings = await fetch('/api/users/settings').then(res => res.json());
        const notificationsEnabled = userSettings.find((s: any) => s.key === 'ENABLE_NOTIFICATIONS')?.value === 'true';

        if (notificationsEnabled) {
          // 檢查是否已訂閱推送服務
          if (this.swRegistration) {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            if (!subscription) {
              await this.subscribeToPushNotifications();
            }
          }

          // 發送推送通知
          await fetch('/api/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title,
              ...options
            })
          });
        }
      }
    } catch (error) {
      console.error('發送推送通知時發生錯誤:', error);
      throw error;
    }
  }

  // 移除 scheduleCombinedNotification 方法，改為只處理推送通知的排程
  public async schedulePushNotification(
    title: string,
    options: {
      body?: string;
      tag?: string;
      icon?: string;
      data?: any;
      scheduledTime: Date;
    }
  ): Promise<void> {
    const now = new Date();
    const delay = options.scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      console.warn('排程時間已過');
      return;
    }

    setTimeout(() => {
      this.sendPushNotification(title, options);
    }, delay);
  }
}

// 導出單例實例
// 創建一個獲取 notificationService 的函數，而不是在模組載入時立即創建
export const getNotificationService = () => NotificationService.getInstance();

// 為了保持向後兼容，也導出一個懶惰初始化的實例
export const notificationService = {
  get instance() {
    return NotificationService.getInstance();
  },
  
  async sendPushNotification(...args: Parameters<NotificationService['sendPushNotification']>) {
    return this.instance.sendPushNotification(...args);
  },
  
  async requestPermission() {
    return this.instance.requestPermission();
  },
  
  async sendNotification(...args: Parameters<NotificationService['sendNotification']>) {
    return this.instance.sendNotification(...args);
  },
  
  async scheduleNotification(...args: Parameters<NotificationService['scheduleNotification']>) {
    return this.instance.scheduleNotification(...args);
  },
  
  async schedulePushNotification(...args: Parameters<NotificationService['schedulePushNotification']>) {
    return this.instance.schedulePushNotification(...args);
  }
};