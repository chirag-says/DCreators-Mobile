const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

const map = {
  'bg-texture.png': 'RemoteAssets.bgTexture',
  'dcreators-logo.png': 'RemoteAssets.dcreatorsLogo',
  'd-icon.png': 'RemoteAssets.dIcon',
  'photographer.png': 'RemoteAssets.photographer',
  'designer.png': 'RemoteAssets.designer',
  'sculptor.png': 'RemoteAssets.sculptor',
  'artisan.png': 'RemoteAssets.artisan',
  'photo_archive_1.png': 'RemoteAssets.photoArchive1',
  'photo_archive_2.png': 'RemoteAssets.photoArchive2',
  'photo_archive_3.png': 'RemoteAssets.photoArchive3',
  'design_hub_1.png': 'RemoteAssets.designHub1',
  'design_hub_2.png': 'RemoteAssets.designHub2',
  'design_hub_3.png': 'RemoteAssets.designHub3',
  'page_1.png': 'RemoteAssets.page1',
  'page_3.png': 'RemoteAssets.page3'
};

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      const requireRegex = /require\(['"]\.\.\/(?:\.\.\/)?assets\/([^'"]+)['"]\)/g;
      
      content = content.replace(requireRegex, (match, p1) => {
        if (map[p1]) {
          modified = true;
          return `{ uri: ${map[p1]} }`;
        }
        return match;
      });

      if (modified) {
        // Need to add import
        // Determine path to lib/assets
        const depth = fullPath.split(path.sep).length - srcDir.split(path.sep).length;
        let importPath = '';
        if (depth === 1) {
          importPath = './lib/assets';
        } else if (depth === 2) {
          importPath = '../lib/assets';
        } else if (depth === 3) {
          importPath = '../../lib/assets';
        }

        if (!content.includes('RemoteAssets')) {
           const importStatement = `import { RemoteAssets } from '${importPath}';\n`;
           // insert after last import or at top
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
        }
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
