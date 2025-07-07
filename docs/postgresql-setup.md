# PostgreSQL 設置指南

## macOS 安裝

### 方法 1: 使用 Homebrew (推薦)
```bash
# 安裝 Homebrew (如果還沒有)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安裝 PostgreSQL
brew install postgresql@16

# 啟動 PostgreSQL 服務
brew services start postgresql@16

# 建立初始使用者 (通常是你的系統使用者名稱)
createuser -s $(whoami)
```

### 方法 2: 使用 Postgres.app
1. 下載 [Postgres.app](https://postgresapp.com/)
2. 拖拽到 Applications 資料夾
3. 啟動應用程式
4. 點擊 "Initialize" 建立第一個資料庫

## Windows 安裝

### 方法 1: 官方安裝程式
1. 前往 [PostgreSQL 官網](https://www.postgresql.org/download/windows/)
2. 下載 Windows 安裝程式
3. 執行安裝程式，記住設定的密碼
4. 安裝完成後，psql 會在開始選單中

### 方法 2: 使用 Chocolatey
```powershell
# 安裝 Chocolatey (以管理員身份執行 PowerShell)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安裝 PostgreSQL
choco install postgresql
```

## Ubuntu/Debian 安裝

```bash
# 更新套件列表
sudo apt update

# 安裝 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 啟動 PostgreSQL 服務
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 切換到 postgres 使用者
sudo -i -u postgres

# 建立新的使用者
createuser --interactive
```

## CentOS/RHEL/Fedora 安裝

```bash
# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Fedora
sudo dnf install postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 🔧 基本設定

### 1. 建立資料庫使用者
```bash
# 連接到 PostgreSQL
sudo -u postgres psql

# 在 psql 中執行
CREATE USER your_username WITH PASSWORD 'your_password';
ALTER USER your_username CREATEDB;
\q
```

### 2. 建立專案資料庫
```bash
# 使用新建立的使用者
psql -U your_username -h localhost
```

在 psql 中：
```sql
CREATE DATABASE time_tracker_db;
\l  -- 列出所有資料庫
\q  -- 退出
```

### 3. 測試連線
```bash
psql -U your_username -d time_tracker_db -h localhost
```

## 🌐 遠端連線設定

### 1. 修改 PostgreSQL 設定檔

找到 `postgresql.conf` 檔案：
- **macOS (Homebrew)**: `/opt/homebrew/var/postgresql@16/postgresql.conf`
- **Ubuntu**: `/etc/postgresql/16/main/postgresql.conf`
- **Windows**: `C:\Program Files\PostgreSQL\16\data\postgresql.conf`

修改以下設定：
```conf
# 允許所有 IP 連線 (生產環境請設定具體 IP)
listen_addresses = '*'

# 設定連接埠
port = 5432
```

### 2. 修改認證設定

找到 `pg_hba.conf` 檔案並添加：
```conf
# 允許密碼認證
host    all             all             0.0.0.0/0               md5
```

### 3. 重啟 PostgreSQL 服務
```bash
# macOS (Homebrew)
brew services restart postgresql@16

# Ubuntu/Debian
sudo systemctl restart postgresql

# Windows
# 在服務管理員中重啟 PostgreSQL 服務
```

## 🔍 常用 psql 指令

### 連線指令
```bash
# 本地連線
psql -d database_name

# 遠端連線
psql -h hostname -p port -U username -d database_name

# 範例
psql -h 192.168.1.100 -p 5432 -U myuser -d time_tracker_db
```

### psql 內部指令
```sql
-- 列出所有資料庫
\l

-- 連接到資料庫
\c database_name

-- 列出所有資料表
\dt

-- 描述資料表結構
\d table_name

-- 列出所有使用者
\du

-- 顯示目前連線資訊
\conninfo

-- 執行 SQL 檔案
\i /path/to/file.sql

-- 退出
\q
```

## 🚀 專案設定

### 1. 環境變數設定
在專案根目錄建立 `.env.local`：
```env
DATABASE_URL="postgresql://username:password@hostname:5432/time_tracker_db"
```

### 2. 測試連線
```bash
# 使用專案的資料庫管理工具
npm run db:status
```

## 🔒 安全性建議

### 1. 建立專用使用者
```sql
-- 建立專用的應用程式使用者
CREATE USER timetracker_user WITH PASSWORD 'secure_password';

-- 授予必要權限
GRANT ALL PRIVILEGES ON DATABASE time_tracker_db TO timetracker_user;
```

### 2. 限制連線 IP
在 `pg_hba.conf` 中設定具體的 IP 範圍：
```conf
# 只允許特定 IP 連線
host    time_tracker_db    timetracker_user    192.168.1.0/24    md5
```

### 3. 使用 SSL 連線
```bash
psql "sslmode=require host=hostname dbname=database_name user=username"
```

## 🛠️ 疑難排解

### 1. 連線被拒絕
```bash
# 檢查 PostgreSQL 是否執行
sudo systemctl status postgresql

# 檢查連接埠是否開放
sudo netstat -tlnp | grep 5432
```

### 2. 認證失敗
- 檢查 `pg_hba.conf` 設定
- 確認使用者密碼正確
- 檢查使用者權限

### 3. 找不到資料庫
```sql
-- 列出所有資料庫
\l

-- 建立缺少的資料庫
CREATE DATABASE time_tracker_db;
```

## 📚 實用資源

- [PostgreSQL 官方文件](https://www.postgresql.org/docs/)
- [psql 指令參考](https://www.postgresql.org/docs/current/app-psql.html)
- [PostgreSQL 教學](https://www.postgresqltutorial.com/) 