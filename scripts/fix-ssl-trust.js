#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 SSL 憑證信任設定工具');
console.log('===============================');
console.log('');

const sslDir = path.join(__dirname, '..', 'ssl');
const certPath = path.join(sslDir, 'localhost.crt');

if (!fs.existsSync(certPath)) {
  console.log('❌ 找不到 SSL 憑證檔案');
  console.log('請先執行: pnpm run generate:ssl');
  process.exit(1);
}

console.log('📋 自動信任 SSL 憑證 (macOS)');
console.log('');

try {
  // 檢查是否為 macOS
  const platform = process.platform;
  
  if (platform === 'darwin') {
    console.log('🍎 檢測到 macOS 系統');
    console.log('正在將憑證加入系統鑰匙圈...');
    
    // 將憑證加入系統鑰匙圈並設為信任
    const addCertCommand = `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${certPath}"`;
    
    try {
      execSync(addCertCommand, { stdio: 'inherit' });
      console.log('✅ 憑證已成功加入系統鑰匙圈');
      console.log('');
      console.log('🔄 請重新啟動瀏覽器以套用變更');
      console.log('');
    } catch (error) {
      console.log('⚠️  自動加入憑證失敗 (可能需要管理員權限)');
      console.log('');
      console.log('📋 手動操作步驟：');
      console.log('1. 雙擊憑證檔案:', certPath);
      console.log('2. 選擇「系統」鑰匙圈');
      console.log('3. 點擊「加入」');
      console.log('4. 找到憑證並雙擊');
      console.log('5. 展開「信任」區域');
      console.log('6. 將「使用此憑證時」設為「永遠信任」');
      console.log('7. 輸入密碼確認');
    }
  } else if (platform === 'win32') {
    console.log('🪟 檢測到 Windows 系統');
    console.log('');
    console.log('📋 手動操作步驟：');
    console.log('1. 以管理員身份開啟命令提示字元');
    console.log('2. 執行以下命令：');
    console.log(`   certlm.msc`);
    console.log('3. 展開「受信任的根憑證授權單位」');
    console.log('4. 右鍵點擊「憑證」→「所有工作」→「匯入」');
    console.log('5. 選擇憑證檔案:', certPath);
    console.log('6. 完成匯入精靈');
  } else {
    console.log('🐧 檢測到 Linux 系統');
    console.log('');
    console.log('📋 手動操作步驟：');
    console.log('1. 複製憑證到系統目錄：');
    console.log(`   sudo cp "${certPath}" /usr/local/share/ca-certificates/localhost.crt`);
    console.log('2. 更新憑證存放區：');
    console.log('   sudo update-ca-certificates');
    console.log('3. 重新啟動瀏覽器');
  }
  
  console.log('');
  console.log('🔧 瀏覽器設定 (如果自動信任失敗)：');
  console.log('');
  console.log('Chrome/Edge:');
  console.log('1. 訪問 chrome://settings/certificates');
  console.log('2. 點擊「授權單位」頁籤');
  console.log('3. 點擊「匯入」');
  console.log('4. 選擇憑證檔案');
  console.log('5. 勾選「信任此憑證以識別網站」');
  console.log('');
  
  console.log('Firefox:');
  console.log('1. 訪問 about:preferences#privacy');
  console.log('2. 滾動到「憑證」區域');
  console.log('3. 點擊「檢視憑證」');
  console.log('4. 點擊「授權單位」頁籤');
  console.log('5. 點擊「匯入」');
  console.log('6. 選擇憑證檔案');
  console.log('7. 勾選「信任此 CA 以識別網站」');
  console.log('');
  
  console.log('✅ 完成設定後，Service Worker 和推送通知功能將正常運作');
  
} catch (error) {
  console.error('❌ 發生錯誤:', error.message);
} 