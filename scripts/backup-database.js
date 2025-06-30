#!/usr/bin/env node

// 資料庫備份腳本
const fs = require('fs');
const path = require('path');

function backupDatabase() {
  const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ 找不到資料庫檔案:', dbPath);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, '..', 'backups', `dev-${timestamp}.db`);
  const backupDir = path.dirname(backupPath);

  // 確保備份目錄存在
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log('✅ 資料庫備份完成');
    console.log('📁 備份檔案:', backupPath);
    
    // 計算檔案大小
    const stats = fs.statSync(backupPath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
    console.log(`📊 檔案大小: ${fileSizeInMB} MB`);
    
    return backupPath;
  } catch (error) {
    console.error('❌ 備份失敗:', error.message);
    process.exit(1);
  }
}

// 如果直接執行這個腳本
if (require.main === module) {
  console.log('🗄️  資料庫備份工具');
  console.log('================');
  console.log('');
  
  backupDatabase();
}

module.exports = { backupDatabase }; 