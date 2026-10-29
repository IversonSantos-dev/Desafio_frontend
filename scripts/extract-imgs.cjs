const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const imgDir = path.resolve('img');
const outDir = path.resolve('img/extracted');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.zip'));

for (const file of files) {
  const filePath = path.join(imgDir, file);
  console.log('Extracting:', file);
  try {
    execSync(`tar -xf "${filePath}" -C "${outDir}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('Failed to extract:', file, err);
  }
}

console.log('Done extracting.');
