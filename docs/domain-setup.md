# 🌐 網域配置指南

這個指南將幫助你為時間追蹤系統配置自訂網域。

## 🚀 快速配置

使用我們提供的自動配置工具：

```bash
npm run configure:domain
```

這個工具會：
- 詢問你的網域名稱
- 選擇部署方式
- 自動更新必要的配置檔案
- 提供詳細的部署步驟

## 📋 部署選項

### 1. Vercel 部署（推薦）

**優點：**
- 自動 SSL 憑證
- 全球 CDN
- 自動部署
- 零配置 HTTPS

**步驟：**
1. 連接 GitHub 倉庫到 Vercel
2. 在 Vercel 儀表板添加自訂網域
3. 按照 DNS 設定指示操作

### 2. 自架伺服器部署

**適用於：**
- 完全控制伺服器
- 自訂配置需求
- 內部部署

**需要：**
- Ubuntu/CentOS 伺服器
- Nginx
- Let's Encrypt SSL 憑證
- PM2 或類似的程序管理器

### 3. Docker 部署

**適用於：**
- 容器化部署
- 微服務架構
- 簡化的依賴管理

## 🔧 手動配置

如果你想手動配置，以下是必要的設定：

### 環境變數

在 `.env` 檔案中設定：

```env
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"
DATABASE_URL="your-database-connection-string"
```

### Vercel 配置

更新 `vercel.json`：

```json
{
  "env": {
    "NEXTAUTH_URL": "https://your-domain.com"
  }
}
```

### Nginx 配置範例

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_private_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🌍 DNS 設定

### Vercel 部署
```
類型: CNAME
名稱: your-subdomain (或 @)
值: cname.vercel-dns.com
```

### 自架伺服器
```
類型: A
名稱: your-subdomain (或 @)
值: your-server-ip
```

## 🔒 SSL 憑證

### Vercel
- 自動提供 SSL 憑證
- 支援萬用字元憑證

### 自架伺服器
使用 Let's Encrypt：

```bash
sudo certbot --nginx -d your-domain.com
```

## ✅ 測試配置

配置完成後，測試以下功能：

1. **HTTPS 訪問**：確保 `https://your-domain.com` 可以正常訪問
2. **登入功能**：測試使用者註冊和登入
3. **推送通知**：在設定頁面測試瀏覽器通知
4. **響應式設計**：在不同裝置上測試

## 🐛 故障排除

### 常見問題

**1. DNS 傳播延遲**
- DNS 變更可能需要 24-48 小時才能完全傳播
- 使用 `nslookup your-domain.com` 檢查 DNS 解析

**2. SSL 憑證問題**
- 確保網域正確指向伺服器
- 檢查防火牆設定（開放 80 和 443 端口）

**3. 登入重定向問題**
- 確認 `NEXTAUTH_URL` 設定正確
- 檢查網域末尾沒有多餘的斜線

**4. 推送通知無法運作**
- HTTPS 是必需的
- 檢查瀏覽器權限設定

## 📞 需要協助？

如果遇到問題：

1. 檢查配置檔案是否正確
2. 查看伺服器日誌
3. 確認 DNS 設定
4. 驗證 SSL 憑證狀態

使用以下命令檢查部署狀態：

```bash
npm run deploy:check
``` 