const fs = require('fs');

const file1 = fs.readFileSync('C:/Users/ovt57/Desktop/habadnet/src/app/HomeEditor.tsx', 'utf8');
const file2 = fs.readFileSync('C:/Users/ovt57/Desktop/community-generator-web/src/app/HomeEditor.tsx', 'utf8');

const cases1 = [...file1.matchAll(/case\s+"([^"]+)":/g)].map(m => m[1]);
const cases2 = [...file2.matchAll(/case\s+"([^"]+)":/g)].map(m => m[1]);

console.log('Habadnet cases:', [...new Set(cases1)]);
console.log('Our cases:', [...new Set(cases2)]);

const imports1 = [...file1.matchAll(/import\s+{([^}]+)}\s+from\s+"[^"]+"/g)].flatMap(m => m[1].split(',').map(s=>s.trim()));
const imports2 = [...file2.matchAll(/import\s+{([^}]+)}\s+from\s+"[^"]+"/g)].flatMap(m => m[1].split(',').map(s=>s.trim()));

const missingInOurs = imports1.filter(i => !imports2.includes(i) && i);
console.log('Imports in Habadnet missing in ours:', missingInOurs);
