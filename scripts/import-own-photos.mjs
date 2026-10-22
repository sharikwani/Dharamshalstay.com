// Usage: node scripts/import-own-photos.mjs photo-inbox/mapping-YYYY-MM-DD.json
// Mapping: [{ "file": "name.jpeg", "key": "own-subject", "alt": "..." }]
// Files are read from photo-inbox/, resized to max 1600px wide and saved as
// public/images/places/<key>.jpg (EXIF/GPS stripped), then originals move to photo-inbox/done/.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const mapFile = process.argv[2];
if (!mapFile) { console.error('Usage: node scripts/import-own-photos.mjs <mapping.json>'); process.exit(1); }
const inbox = 'photo-inbox';
const outDir = path.join('public', 'images', 'places');
const doneDir = path.join(inbox, 'done');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(doneDir, { recursive: true });

const entries = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
let ok = 0;
for (const { file, key } of entries) {
  const src = path.join(inbox, file);
  if (!/^own-[a-z0-9-]+$/.test(key)) { console.error('Bad key, skipped:', key); continue; }
  if (!fs.existsSync(src)) { console.error('Missing, skipped:', file); continue; }
  const dest = path.join(outDir, key + '.jpg');
  if (fs.existsSync(dest)) { console.error('Already exists, skipped:', dest); continue; }
  await sharp(src).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(dest);
  fs.renameSync(src, path.join(doneDir, file));
  ok++;
  console.log('OK', key);
}
console.log(`${ok}/${entries.length} imported`);
