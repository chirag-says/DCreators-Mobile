/**
 * Batch upload local assets to Cloudinary.
 * 
 * Usage:
 *   node scripts/upload-to-cloudinary.js
 * 
 * Requires env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Outputs: scripts/cloudinary-map.json  (filename → publicId)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = 'dcreators';

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  process.exit(1);
}

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Only upload these known assets
const FILES = [
  'bg-texture.png',
  'dcreators-logo.png',
  'd-icon.png',
  'photographer.png',
  'designer.png',
  'sculptor.png',
  'artisan.png',
  'photo_archive_1.png',
  'photo_archive_2.png',
  'photo_archive_3.png',
  'design_hub_1.png',
  'design_hub_2.png',
  'design_hub_3.png',
];

async function uploadFile(filePath, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${FOLDER}&public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  const fileData = fs.readFileSync(filePath);
  const base64 = `data:image/png;base64,${fileData.toString('base64')}`;

  const body = JSON.stringify({
    file: base64,
    api_key: API_KEY,
    timestamp,
    signature,
    public_id: publicId,
    folder: FOLDER,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.cloudinary.com',
        path: `/v1_1/${CLOUD_NAME}/image/upload`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const parsed = JSON.parse(data);
          if (parsed.error) reject(parsed.error);
          else resolve(parsed);
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const map = {};
  for (const file of FILES) {
    const filePath = path.join(ASSETS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${file} not found`);
      continue;
    }
    const publicId = file.replace(/\.[^.]+$/, ''); // strip extension
    console.log(`Uploading ${file} → ${FOLDER}/${publicId}...`);
    try {
      const result = await uploadFile(filePath, publicId);
      map[file] = result.public_id;
      console.log(`  ✓ ${result.public_id}`);
    } catch (err) {
      console.error(`  ✗ ${file}:`, err);
    }
  }
  const outPath = path.join(__dirname, 'cloudinary-map.json');
  fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
  console.log(`\nDone. Map saved to ${outPath}`);
}

main();
