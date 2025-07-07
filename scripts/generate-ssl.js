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

// 支援自定義 IP 地址
const customIP = process.argv[2] || 'localhost';
const commonName = process.argv[3] || customIP;

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath) || process.argv.includes('--force')) {
  console.log(`生成自簽名 SSL 憑證 (CN: ${commonName})...`);
  
  // 建立 OpenSSL 配置檔案
  const configPath = path.join(sslDir, 'openssl.conf');
  const configContent = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = TW
ST = Taiwan
L = Taipei
O = TimeTracker
CN = ${commonName}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = ${commonName}
IP.1 = 127.0.0.1
${customIP !== 'localhost' ? `IP.2 = ${customIP}` : ''}
`;

  fs.writeFileSync(configPath, configContent);
  
  const command = `openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -config ${configPath}`;
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('✅ SSL 憑證生成成功！');
    console.log(`憑證位置: ${certPath}`);
    console.log(`私鑰位置: ${keyPath}`);
    console.log(`支援的主機名: localhost, ${commonName}`);
    if (customIP !== 'localhost') {
      console.log(`支援的 IP: 127.0.0.1, ${customIP}`);
    }
    
    // 清理配置檔案
    fs.unlinkSync(configPath);
  } catch (error) {
    console.error('❌ 生成 SSL 憑證失敗:', error.message);
    console.log('請確保已安裝 OpenSSL');
  }
} else {
  console.log('SSL 憑證已存在');
  console.log('如需重新生成，請使用: npm run generate:ssl -- --force');
  console.log('或為特定 IP 生成: npm run generate:ssl -- 192.168.0.203');
} 