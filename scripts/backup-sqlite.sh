#!/bin/bash

# 設定變數
BACKUP_DIR="/opt/backups/time-tracker"
APP_DIR="/opt/time-tracker"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="sqlite_$TIMESTAMP.db"
RETENTION_DAYS=30

# 確保備份目錄存在
mkdir -p $BACKUP_DIR

# 確保資料庫檔案存在
if [ ! -f "$APP_DIR/data/sqlite.db" ]; then
    echo "錯誤：找不到資料庫檔案"
    exit 1
fi

# 建立備份
echo "開始備份..."
cp "$APP_DIR/data/sqlite.db" "$BACKUP_DIR/$BACKUP_FILE"

# 檢查備份是否成功
if [ $? -eq 0 ]; then
    echo "備份成功：$BACKUP_FILE"
else
    echo "備份失敗"
    exit 1
fi

# 壓縮備份
echo "壓縮備份檔案..."
gzip "$BACKUP_DIR/$BACKUP_FILE"

# 刪除舊備份
echo "清理舊備份..."
find $BACKUP_DIR -type f -name "sqlite_*.db.gz" -mtime +$RETENTION_DAYS -delete

# 列出現有備份
echo "現有備份檔案："
ls -lh $BACKUP_DIR

echo "備份程序完成" 