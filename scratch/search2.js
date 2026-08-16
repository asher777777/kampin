const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (stat && stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('חב"ד') || line.includes('chabad') || line.includes('Chabad')) {
          results.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  });
  return results;
}

const res = walk('C:/Users/ovt57/Desktop/community-generator-web/src');
res.forEach(r => console.log(r));
