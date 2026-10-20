// Tell Bing (and so Copilot), Yandex, Seznam and other IndexNow engines about every page in the live sitemap.
// Run after a deploy that adds or changes content:   npm run indexnow
// Optional: pass paths to submit only those, e.g.    npm run indexnow -- /facts /travel-updates
// Uses the public key file in /public (any 32-hex-char .txt whose content equals its name).
import { readdirSync, readFileSync } from 'node:fs';

const SITE = 'https://www.dharamshalastay.com';
const keyFile = readdirSync(new URL('../public/', import.meta.url)).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) { console.error('No IndexNow key file found in public/.'); process.exit(1); }
const key = keyFile.slice(0, -4);
if (readFileSync(new URL('../public/' + keyFile, import.meta.url), 'utf8').trim() !== key) { console.error('Key file content does not match its name.'); process.exit(1); }

// Paths (/facts) or full URLs (https://www.dharamshalastay.com/facts) both work.
let urls = process.argv.slice(2).map((p) => (p.startsWith('http') ? p : SITE + (p.startsWith('/') ? p : '/' + p)));
if (!urls.length) {
  const xml = await (await fetch(SITE + '/sitemap.xml')).text();
  urls = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))];
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: SITE + '/' + keyFile, urlList: urls.slice(0, 10000) }),
});
console.log('IndexNow:', res.status, res.status === 200 || res.status === 202 ? 'accepted' : await res.text(), '--', urls.length, 'URLs');
process.exit(res.ok ? 0 : 1);
