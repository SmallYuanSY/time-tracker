#!/usr/bin/env node

// 命令行時區遷移腳本
const { execSync } = require('child_process');
const path = require('path');

console.log('🌏 台灣時區遷移工具');
console.log('==================');
console.log('');

// 詢問用戶確認
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('⚠️  重要警告：');
  console.log('• 這個操作會永久修改資料庫中的時間資料');
  console.log('• 將所有 UTC 時間轉換為台灣時間（UTC+8）');
  console.log('• 建議在執行前先備份資料庫');
  console.log('');

  const confirm1 = await askQuestion('❓ 您是否已經備份了資料庫？ (y/N): ');
  if (confirm1.toLowerCase() !== 'y' && confirm1.toLowerCase() !== 'yes') {
    console.log('❌ 請先備份資料庫再執行遷移');
    process.exit(1);
  }

  const confirm2 = await askQuestion('❓ 確定要執行時區遷移嗎？ (y/N): ');
  if (confirm2.toLowerCase() !== 'y' && confirm2.toLowerCase() !== 'yes') {
    console.log('❌ 遷移已取消');
    process.exit(1);
  }

  console.log('');
  console.log('🚀 開始執行遷移...');

  try {
    // 使用 ts-node 執行 TypeScript 腳本
    const scriptPath = path.join(__dirname, '..', 'lib', 'scripts', 'migrate-timezone.ts');
    
    // 執行遷移腳本
    execSync(`npx ts-node -P tsconfig.json "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log('');
    console.log('✨ 遷移完成！');
    console.log('');
    console.log('📋 後續步驟：');
    console.log('• 重新啟動應用程式');
    console.log('• 檢查時間顯示是否正確');
    console.log('• 驗證新建立的記錄時間');

  } catch (error) {
    console.error('');
    console.error('❌ 遷移失敗：', error.message);
    console.error('');
    console.error('💡 可能的解決方案：');
    console.error('• 檢查資料庫連線');
    console.error('• 確保沒有其他程序正在使用資料庫');
    console.error('• 查看完整錯誤訊息');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(console.error);