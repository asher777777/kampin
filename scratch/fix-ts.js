const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // .then(s => ...
    const r1 = /\.then\((s|snap|doc|d)\s=>/g;
    if (r1.test(content)) {
      content = content.replace(r1, '.then(($1: any) =>');
      changed = true;
    }

    // .map(doc => ...
    const r2 = /\.map\((doc|d|p|item|page)\s=>/g;
    if (r2.test(content)) {
      content = content.replace(r2, '.map(($1: any) =>');
      changed = true;
    }

    // .forEach(doc => ...
    const r3 = /\.forEach\((doc|d|p|item|page)\s=>/g;
    if (r3.test(content)) {
      content = content.replace(r3, '.forEach(($1: any) =>');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed', filePath);
    }
  }
});
