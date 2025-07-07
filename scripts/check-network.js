const { execSync } = require('child_process');
const os = require('os');

console.log('🔍 網路診斷工具');
console.log('================');

// 獲取本機 IP 地址
const interfaces = os.networkInterfaces();
console.log('\n📡 網路介面:');
Object.keys(interfaces).forEach((name) => {
  interfaces[name].forEach((interface) => {
    if (interface.family === 'IPv4' && !interface.internal) {
      console.log(`  ${name}: ${interface.address}`);
    }
  });
});

// 檢查端口是否被佔用
console.log('\n🔌 檢查端口 3000 狀態:');
try {
  const result = execSync('lsof -i :3000', { encoding: 'utf8' });
  console.log('端口 3000 已被佔用:');
  console.log(result);
} catch (error) {
  console.log('✅ 端口 3000 可用');
}

// 檢查防火牆狀態 (macOS)
console.log('\n🛡️ 檢查防火牆狀態:');
try {
  const firewallStatus = execSync('sudo pfctl -s info', { encoding: 'utf8' });
  console.log('防火牆狀態:');
  console.log(firewallStatus);
} catch (error) {
  console.log('無法檢查防火牆狀態 (可能需要 sudo 權限)');
}

console.log('\n💡 建議:');
console.log('1. 確保您的 IP 地址是 192.168.0.203');
console.log('2. 確保端口 3000 沒有被其他程式佔用');
console.log('3. 如果使用防火牆，確保端口 3000 是開放的');
console.log('4. 嘗試使用: npm run start:https:ip'); 