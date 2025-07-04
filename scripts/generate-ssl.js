const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 建立 SSL 憑證目錄
const sslDir = path.join(__dirname, '..', 'ssl');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
}

// 生成自簽名憑證
const certPath = path.join(sslDir, 'localhost.crt');
const keyPath = path.join(sslDir, 'localhost.key');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log('生成自簽名 SSL 憑證...');
  
  const command = `openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=TW/ST=Taiwan/L=Taipei/O=TimeTracker/CN=localhost"`;
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('✅ SSL 憑證生成成功！');
    console.log(`憑證位置: ${certPath}`);
    console.log(`私鑰位置: ${keyPath}`);
  } catch (error) {
    console.error('❌ 生成 SSL 憑證失敗:', error.message);
    console.log('請確保已安裝 OpenSSL');
  }
} else {
  console.log('SSL 憑證已存在');
} 