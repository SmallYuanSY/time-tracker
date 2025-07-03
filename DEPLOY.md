# Ubuntu 部署指南

## 系統需求
- Node.js (已安裝)
- Yarn (已安裝)
- Nginx

## 安裝步驟

1. 安裝 Nginx：
```bash
sudo apt update
sudo apt install -y nginx
```

2. 建立部署目錄：
```bash
sudo mkdir -p /opt/time-tracker
sudo chown -R $USER:$USER /opt/time-tracker
cd /opt/time-tracker
```

3. 複製專案文件：
```bash
# 假設您使用 Git
git clone <您的專案倉庫> .
# 或者直接複製檔案到伺服器
```

4. 安裝依賴：
```bash
yarn install
```

5. 建立環境變數文件：
```bash
# 編輯 .env 文件
nano .env

# 加入以下內容（請修改對應的值）
NEXTAUTH_URL=https://您的域名
NEXTAUTH_SECRET=生成的隨機字串
```

6. 建置專案：
```bash
yarn build
```

7. 使用 PM2 管理程序：
```bash
# 安裝 PM2
sudo yarn global add pm2

# 啟動應用
pm2 start yarn --name "time-tracker" -- start
pm2 save
pm2 startup
```

8. 設定 Nginx：
```bash
sudo nano /etc/nginx/sites-available/time-tracker

# 加入以下配置
server {
    listen 80;
    server_name 您的域名;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 建立軟連結
sudo ln -s /etc/nginx/sites-available/time-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

9. 設定 SSL（使用 Let's Encrypt）：
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 您的域名
```

## 備份設定

SQLite 資料庫備份：
```bash
# 建立備份腳本
nano backup.sh

# 加入以下內容
#!/bin/bash
BACKUP_DIR="/opt/backups/time-tracker"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /opt/time-tracker/prisma/data/sqlite.db "$BACKUP_DIR/sqlite_$TIMESTAMP.db"
find $BACKUP_DIR -type f -mtime +30 -delete  # 刪除 30 天前的備份

# 設定執行權限
chmod +x backup.sh

# 加入 crontab
crontab -e
# 加入以下行（每天凌晨 2 點執行備份）
0 2 * * * /opt/time-tracker/backup.sh
```

## 更新流程

當需要更新應用程式時：
```bash
# 拉取最新代碼
git pull

# 安裝依賴
yarn install

# 重新建置
yarn build

# 重啟應用
pm2 restart time-tracker
```

## 常用維護命令

1. 查看應用狀態：
```bash
pm2 status
pm2 logs time-tracker
```

2. 重啟應用：
```bash
pm2 restart time-tracker
```

3. 查看系統資源：
```bash
htop  # 需要先安裝：sudo apt install htop
```

## 故障排除

1. 如果應用無法訪問：
```bash
# 檢查 PM2 狀態
pm2 status
pm2 logs time-tracker

# 檢查 Nginx 日誌
sudo tail -f /var/log/nginx/error.log
```

2. 如果資料庫出現問題：
```bash
# 檢查資料目錄權限
ls -la prisma/data/

# 從備份恢復（如果需要）
cp /opt/backups/time-tracker/最新的備份.db prisma/data/sqlite.db
```

## 安全建議

1. 設定防火牆：
```bash
# 只開放必要的端口
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
```

2. 定期更新系統：
```bash
sudo apt update
sudo apt upgrade -y
```

3. 監控系統日誌：
```bash
sudo tail -f /var/log/syslog
``` 