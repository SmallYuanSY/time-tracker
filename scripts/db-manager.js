#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const command = args[0];

function getCurrentDatabase() {
  const envPath = path.join(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL="([^"]*)"/);
  if (match) {
    const url = match[1];
    if (url.includes('postgresql://') || url.includes('postgres://')) {
      return 'PostgreSQL';
    } else if (url.includes('file:')) {
      return 'SQLite';
    }
  }
  return 'Unknown';
}

function showStatus() {
  const currentDb = getCurrentDatabase();
  console.log('📊 資料庫狀態');
  console.log('='.repeat(40));
  console.log(`目前使用: ${currentDb}`);
  console.log('');
  
  // 檢查 SQLite 檔案
  const sqlitePath = path.join(process.cwd(), 'prisma', 'data', 'sqlite.db');
  const sqliteExists = fs.existsSync(sqlitePath);
  const sqliteSize = sqliteExists ? fs.statSync(sqlitePath).size : 0;
  console.log(`SQLite 檔案: ${sqliteExists ? '✅ 存在' : '❌ 不存在'}`);
  if (sqliteExists) {
    console.log(`  大小: ${(sqliteSize / 1024).toFixed(2)} KB`);
  }
  
  // 檢查 PostgreSQL 連線
  try {
    execSync('psql -d time_tracker_db -c "SELECT 1;" > /dev/null 2>&1');
    console.log('PostgreSQL 連線: ✅ 正常');
  } catch (error) {
    console.log('PostgreSQL 連線: ❌ 無法連線');
  }
}

function showHelp() {
  console.log('🗄️  資料庫管理工具');
  console.log('='.repeat(40));
  console.log('用法: node scripts/db-manager.js <command>');
  console.log('');
  console.log('可用指令:');
  console.log('  status     - 顯示資料庫狀態');
  console.log('  postgres   - 切換到 PostgreSQL');
  console.log('  sqlite     - 切換到 SQLite');
  console.log('  migrate    - 執行資料庫遷移');
  console.log('  seed       - 初始化資料');
  console.log('  reset      - 重置資料庫');
  console.log('  backup     - 備份資料庫');
  console.log('  help       - 顯示此說明');
}

async function main() {
  switch (command) {
    case 'status':
      showStatus();
      break;
    
    case 'postgres':
      console.log('🔄 切換到 PostgreSQL...');
      execSync('node scripts/switch-to-postgresql.js', { stdio: 'inherit' });
      break;
    
    case 'sqlite':
      console.log('🔄 切換到 SQLite...');
      execSync('node scripts/switch-to-sqlite.js', { stdio: 'inherit' });
      break;
    
    case 'migrate':
      console.log('🔄 執行資料庫遷移...');
      execSync('npx prisma migrate dev', { stdio: 'inherit' });
      break;
    
    case 'seed':
      console.log('🌱 初始化資料...');
      execSync('npx prisma db seed', { stdio: 'inherit' });
      break;
    
    case 'reset':
      console.log('🔄 重置資料庫...');
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
      break;
    
    case 'backup':
      console.log('💾 備份資料庫...');
      const currentDb = getCurrentDatabase();
      if (currentDb === 'SQLite') {
        execSync('node scripts/backup-sqlite.sh', { stdio: 'inherit' });
      } else {
        execSync('node scripts/pg-backup.ts', { stdio: 'inherit' });
      }
      break;
    
    case 'help':
    default:
      showHelp();
      break;
  }
}

main().catch(console.error); 