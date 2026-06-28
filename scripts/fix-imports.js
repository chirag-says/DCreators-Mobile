const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      if (content.includes('RemoteAssets') && !content.includes('import { RemoteAssets }')) {
        const depth = fullPath.split(path.sep).length - srcDir.split(path.sep).length;
        let importPath = '';
        if (depth === 1) {
          importPath = './lib/assets';
        } else if (depth === 2) {
          importPath = '../lib/assets';
        } else if (depth === 3) {
          importPath = '../../lib/assets';
        }

        const importStatement = `import { RemoteAssets } from '${importPath}';\n`;
        const lines = content.split('\n');
        let lastImportIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ')) lastImportIdx = i;
        }
        if (lastImportIdx !== -1) {
          lines.splice(lastImportIdx + 1, 0, importStatement);
        } else {
          lines.unshift(importStatement);
        }
        content = lines.join('\n');
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Added import to ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
