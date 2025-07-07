#!/bin/bash

# PostgreSQL 快速設置腳本
# 支援 macOS, Ubuntu, CentOS

echo "🐘 PostgreSQL 快速設置腳本"
echo "=================================="

# 檢測作業系統
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macOS"
    elif [[ -f /etc/debian_version ]]; then
        echo "Ubuntu/Debian"
    elif [[ -f /etc/redhat-release ]]; then
        echo "CentOS/RHEL"
    else
        echo "Unknown"
    fi
}

OS=$(detect_os)
echo "檢測到作業系統: $OS"

# 安裝 PostgreSQL
install_postgresql() {
    case $OS in
        "macOS")
            echo "📦 使用 Homebrew 安裝 PostgreSQL..."
            if ! command -v brew &> /dev/null; then
                echo "安裝 Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install postgresql@16
            brew services start postgresql@16
            createuser -s $(whoami) 2>/dev/null || echo "使用者已存在"
            ;;
        "Ubuntu/Debian")
            echo "📦 使用 apt 安裝 PostgreSQL..."
            sudo apt update
            sudo apt install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        "CentOS/RHEL")
            echo "📦 使用 yum 安裝 PostgreSQL..."
            sudo yum install -y postgresql-server postgresql-contrib
            sudo postgresql-setup initdb
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        *)
            echo "❌ 不支援的作業系統: $OS"
            exit 1
            ;;
    esac
}

# 設定資料庫
setup_database() {
    echo "🔧 設定資料庫..."
    
    # 提示輸入資料庫資訊
    read -p "輸入資料庫使用者名稱 (預設: timetracker): " DB_USER
    DB_USER=${DB_USER:-timetracker}
    
    read -s -p "輸入資料庫密碼: " DB_PASSWORD
    echo
    
    read -p "輸入資料庫名稱 (預設: time_tracker_db): " DB_NAME
    DB_NAME=${DB_NAME:-time_tracker_db}
    
    # 建立使用者和資料庫
    case $OS in
        "macOS")
            psql postgres << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
ALTER USER $DB_USER CREATEDB;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
\q
EOF
            ;;
        "Ubuntu/Debian"|"CentOS/RHEL")
            sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
ALTER USER $DB_USER CREATEDB;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
\q
EOF
            ;;
    esac
    
    echo "✅ 資料庫設定完成"
    echo "📋 連線資訊:"
    echo "   使用者: $DB_USER"
    echo "   資料庫: $DB_NAME"
    echo "   連線字串: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
}

# 測試連線
test_connection() {
    echo "🔍 測試資料庫連線..."
    psql -U $DB_USER -d $DB_NAME -h localhost -c "SELECT version();" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ 連線測試成功"
    else
        echo "❌ 連線測試失敗"
        echo "請檢查設定或手動測試: psql -U $DB_USER -d $DB_NAME -h localhost"
    fi
}

# 產生環境變數檔案
generate_env() {
    echo "📝 產生環境變數檔案..."
    cat > .env.postgresql << EOF
# PostgreSQL 設定
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# 如果需要遠端連線，請修改 localhost 為實際 IP
# DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@192.168.1.100:5432/$DB_NAME"
EOF
    echo "✅ 環境變數檔案已建立: .env.postgresql"
}

# 主要執行流程
main() {
    echo "開始安裝 PostgreSQL..."
    install_postgresql
    
    echo
    echo "設定資料庫..."
    setup_database
    
    echo
    test_connection
    
    echo
    generate_env
    
    echo
    echo "🎉 PostgreSQL 設置完成！"
    echo
    echo "📋 下一步："
    echo "1. 複製 .env.postgresql 的內容到你的專案 .env 檔案"
    echo "2. 執行 npm run db:migrate 建立資料表"
    echo "3. 執行 npm run db:seed 初始化資料"
    echo
    echo "🔧 常用指令："
    echo "   連線資料庫: psql -U $DB_USER -d $DB_NAME -h localhost"
    echo "   檢查狀態: npm run db:status"
    echo "   切換資料庫: npm run db:postgres"
}

# 檢查是否有必要的工具
check_requirements() {
    if ! command -v psql &> /dev/null; then
        echo "PostgreSQL 未安裝，開始安裝..."
        return 1
    else
        echo "PostgreSQL 已安裝"
        return 0
    fi
}

# 執行主程式
if check_requirements; then
    echo "PostgreSQL 已安裝，跳過安裝步驟"
    setup_database
    test_connection
    generate_env
else
    main
fi 