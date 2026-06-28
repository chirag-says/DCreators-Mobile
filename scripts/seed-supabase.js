/**
 * Seed Supabase with creator + portfolio data via REST API.
 * 
 * Usage: node scripts/seed-supabase.js
 * 
 * IMPORTANT: Run the table creation SQL from seed-creators.sql 
 * in Supabase SQL Editor FIRST (just the CREATE TABLE statements).
 * This script only inserts data.
 */

const https = require('https');
const url = require('url');

const SUPABASE_URL = 'https://pkuhdcrcpfvdwbhsnrfg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KPGplniFlImv4f24eJxh9A_b8Ua5tLJ';

function supabaseRequest(path, method, body) {
  const parsed = url.parse(SUPABASE_URL);
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const req = https.request({
      hostname: parsed.hostname,
      path: `/rest/v1/${path}`,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data || '[]') }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const CREATORS = [
  { name: 'Shoumik Sen', code: 'D101', subtitle: 'BA Fine Arts, University of Calcutta', experience: '8 years', expertise: 'Photography, Portraiture', avatar_public_id: 'dcreators/photographer', category: 'photographer' },
  { name: 'Rajdeep Das', code: 'D207', subtitle: 'BDes NID, Ahmedabad', experience: '6 years', expertise: 'UI/UX Design, Branding', avatar_public_id: 'dcreators/designer', category: 'designer' },
  { name: 'Amit Ghosh', code: 'D305', subtitle: 'Diploma in Sculpture, Govt. Art College', experience: '15 years', expertise: 'Sculpture, Installation Art', avatar_public_id: 'dcreators/sculptor', category: 'sculptor' },
  { name: 'Ravi Kumar', code: 'D30', subtitle: 'Traditional Crafts, Self-taught Artisan', experience: '20 years', expertise: 'Handicrafts, Pottery, Weaving', avatar_public_id: 'dcreators/artisan', category: 'artisan' },
  { name: 'Sudip Paul', code: 'D105', subtitle: 'MVA Applied Art Dept. of Visual Arts AUS', experience: '12 years', expertise: 'Photography, Art Direction', avatar_public_id: 'dcreators/photo_archive_1', category: 'photographer' },
  { name: 'Rahul Dey', code: 'D103', subtitle: 'BA Photography, Jadavpur University', experience: '5 years', expertise: 'Wildlife Photography, Editing', avatar_public_id: 'dcreators/photo_archive_3', category: 'photographer' },
  { name: 'Suita Roy', code: 'D207', subtitle: 'MDes IIT Bombay, Industrial Design', experience: '4 years', expertise: 'Product Design, 3D Modeling', avatar_public_id: 'dcreators/design_hub_2', category: 'designer' },
  { name: 'Rajib Sarkar', code: 'D207', subtitle: 'BFA Applied Arts, Kala Bhavan', experience: '7 years', expertise: 'Graphic Design, Typography', avatar_public_id: 'dcreators/design_hub_3', category: 'designer' },
];

const PORTFOLIOS = {
  'Shoumik Sen': ['dcreators/photo_archive_1', 'dcreators/photo_archive_2', 'dcreators/photo_archive_3'],
  'Rajdeep Das': ['dcreators/design_hub_1', 'dcreators/design_hub_2', 'dcreators/design_hub_3'],
  'Amit Ghosh': ['dcreators/photo_archive_3', 'dcreators/design_hub_1', 'dcreators/photo_archive_1'],
  'Ravi Kumar': ['dcreators/design_hub_2', 'dcreators/design_hub_3', 'dcreators/photo_archive_2'],
  'Sudip Paul': ['dcreators/photo_archive_1', 'dcreators/photo_archive_2', 'dcreators/photo_archive_3'],
  'Rahul Dey': ['dcreators/photo_archive_3', 'dcreators/photo_archive_1', 'dcreators/photo_archive_2'],
  'Suita Roy': ['dcreators/design_hub_2', 'dcreators/design_hub_1', 'dcreators/design_hub_3'],
  'Rajib Sarkar': ['dcreators/design_hub_3', 'dcreators/design_hub_2', 'dcreators/design_hub_1'],
};

async function main() {
  console.log('Inserting creators...');
  const res = await supabaseRequest('creators', 'POST', CREATORS);
  
  if (res.status >= 400) {
    console.error('Failed to insert creators:', res.data);
    console.log('\n⚠️  You need to create the tables first!');
    console.log('Copy the CREATE TABLE statements from scripts/seed-creators.sql');
    console.log('and run them in your Supabase Dashboard → SQL Editor');
    return;
  }

  const inserted = res.data;
  console.log(`✓ ${inserted.length} creators inserted`);

  console.log('Inserting portfolios...');
  const portfolioRows = [];
  for (const creator of inserted) {
    const images = PORTFOLIOS[creator.name] || [];
    images.forEach((img, i) => {
      portfolioRows.push({
        creator_id: creator.id,
        image_public_id: img,
        sort_order: i + 1,
      });
    });
  }

  const pRes = await supabaseRequest('portfolios', 'POST', portfolioRows);
  if (pRes.status >= 400) {
    console.error('Failed to insert portfolios:', pRes.data);
    return;
  }
  console.log(`✓ ${portfolioRows.length} portfolio items inserted`);
  console.log('\nDone! Data is live in Supabase.');
}

main().catch(console.error);
