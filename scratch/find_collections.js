const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, files);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      files.push(filePath);
    }
  }
  return files;
}

const files = getFiles(path.join(__dirname, '../src'));
const collections = new Set();
const regex = /\.collection\(\s*["']([^"']+)["']\s*\)/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    collections.add(match[1]);
  }
}

console.log(Array.from(collections).sort().join('\n'));
