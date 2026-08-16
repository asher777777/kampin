const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, files);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      files.push(filePath);
    }
  }
  return files;
}

const files = getFiles(path.join(__dirname, '../src'));
let output = '';

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('export interface') || content.includes('export type')) {
    output += `\n\n--- FILE: ${file} ---\n`;
    
    // Extractor: Find all interface and type declarations
    const regex = /export (interface|type) \w+[^\{]*\{[\s\S]*?\}/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      output += match[0] + '\n\n';
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'all_types.txt'), output);
console.log('Types extracted to scratch/all_types.txt');
