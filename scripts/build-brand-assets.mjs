// Builds every raster brand asset from the SVG masters in public/brand.
// Run after changing the logo:  node scripts/build-brand-assets.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const pub = path.resolve('public');
const brand = path.join(pub, 'brand');
const svg = (name) => fs.readFileSync(path.join(brand, name));

async function png(src, size, out, opts = {}) {
  const buf = await sharp(svg(src), { density: Math.max(72, Math.ceil((size / 64) * 72 * 1.5)) })
    .resize(opts.w || size, opts.h || size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(out, buf);
  return buf;
}

/** A .ico holding PNG images (supported by every current browser). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, o); header.writeUInt8(size >= 256 ? 0 : size, o + 1);
    header.writeUInt8(0, o + 2); header.writeUInt8(0, o + 3);
    header.writeUInt16LE(1, o + 4); header.writeUInt16LE(32, o + 6);
    header.writeUInt32LE(buf.length, o + 8); header.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.buf)]);
}

const f16 = await png('app-icon.svg', 16, path.join(pub, 'favicon-16x16.png'));
const f32 = await png('app-icon.svg', 32, path.join(pub, 'favicon-32x32.png'));
const f48 = await sharp(svg('app-icon.svg'), { density: 160 }).resize(48, 48).png().toBuffer();
fs.writeFileSync(path.join(pub, 'favicon.ico'), ico([{ size: 16, buf: f16 }, { size: 32, buf: f32 }, { size: 48, buf: f48 }]));

// Full-bleed tiles: iOS and Android round the corners themselves (also safe as a maskable icon).
await png('app-icon-square.svg', 180, path.join(pub, 'apple-touch-icon.png'));
await png('app-icon-square.svg', 192, path.join(pub, 'icon-192.png'));
await png('app-icon-square.svg', 512, path.join(pub, 'icon-512.png'));

// Brand kit downloads (profile pictures, print, partners).
await png('app-icon-square.svg', 1024, path.join(brand, 'app-icon-1024.png'));
await png('logo-badge.svg', 1024, path.join(brand, 'logo-badge-1024.png'));
await png('logo-badge.svg', 512, path.join(brand, 'logo-badge-512.png'));
await png('logo-mark.svg', 1024, path.join(brand, 'logo-mark-1024.png'));
await png('logo-mark.svg', 512, path.join(brand, 'logo-mark-512.png'));
await png('logo-mark-white.svg', 512, path.join(brand, 'logo-mark-white-512.png'));
await png('logo-horizontal.svg', 0, path.join(brand, 'logo-horizontal.png'), { w: 1260, h: 288 });
await png('logo-horizontal-dark.svg', 0, path.join(brand, 'logo-horizontal-dark.png'), { w: 1260, h: 288 });
// Email header (email apps do not show SVG): white mark, 2x for sharp retina display.
await png('logo-mark-white.svg', 96, path.join(brand, 'email-mark.png'));

console.log('brand assets written');
