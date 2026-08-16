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
      if (content.includes('חב"ד') || content.includes('chabad') || content.includes('Chabad')) {
        results.push(file);
      }
    }
  });
  return results;
}

console.log(walk('C:/Users/ovt57/Desktop/community-generator-web/src'));
