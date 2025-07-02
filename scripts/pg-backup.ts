const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const execAsync = promisify(exec);

// 載入環境變數
dotenv.config();

async function getDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('找不到 DATABASE_URL 環境變數');
  }
  return dbUrl;
}

async function backupDatabase() {
  try {
    const dbUrl = await getDatabaseUrl();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    const backupPath = path.join(backupDir, `backup-${timestamp}.sql`);

    // 確保備份目錄存在
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 從 DATABASE_URL 解析連接資訊
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port;
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    // 設定環境變數以避免在命令行中暴露密碼
    const env = {
      ...process.env,
      PGPASSWORD: password
    };

    // 執行 pg_dump
    const command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p -f "${backupPath}"`;
    
    console.log('🗄️  開始備份資料庫...');
    await execAsync(command, { env });

    const stats = fs.statSync(backupPath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ 資料庫備份完成');
    console.log('📁 備份檔案:', backupPath);
    console.log(`📊 檔案大小: ${fileSizeInMB} MB`);

    return backupPath;
  } catch (error) {
    console.error('❌ 備份失敗:', error);
    throw error;
  }
}

async function restoreDatabase(backupPath: string) {
  try {
    const dbUrl = await getDatabaseUrl();
    
    // 檢查備份檔案是否存在
    if (!fs.existsSync(backupPath)) {
      throw new Error(`找不到備份檔案: ${backupPath}`);
    }

    // 從 DATABASE_URL 解析連接資訊
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port;
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    // 設定環境變數以避免在命令行中暴露密碼
    const env = {
      ...process.env,
      PGPASSWORD: password
    };

    // 執行 psql 還原
    const command = `psql -h ${host} -p ${port} -U ${username} -d ${database} -f "${backupPath}"`;
    
    console.log('🗄️  開始還原資料庫...');
    await execAsync(command, { env });

    console.log('✅ 資料庫還原完成');
  } catch (error) {
    console.error('❌ 還原失敗:', error);
    throw error;
  }
}

// 如果直接執行這個腳本
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const backupPath = args[1];

  if (command === 'backup') {
    backupDatabase()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (command === 'restore' && backupPath) {
    restoreDatabase(backupPath)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.log('使用方法:');
    console.log('備份: npm run pg-backup backup');
    console.log('還原: npm run pg-backup restore <備份檔案路徑>');
    process.exit(1);
  }
} 