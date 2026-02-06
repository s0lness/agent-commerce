import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] || 'out';
const metaPath = process.argv[3] || path.join(outDir, 'meta.json');

function die(msg) {
  console.error(`[assert] FAIL: ${msg}`);
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function readJsonl(p) {
  if (!fs.existsSync(p)) return [];
  const txt = fs.readFileSync(p, 'utf8').trim();
  if (!txt) return [];
  return txt
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function isMessageEvent(e) {
  return e?.type === 'm.room.message' && typeof e?.sender === 'string';
}

const meta = readJson(metaPath);
const sellerMxid = meta?.seller?.mxid;
const buyerMxid = meta?.buyer?.mxid;
if (!sellerMxid || !buyerMxid) die('meta.json missing seller.mxid or buyer.mxid');

const market = readJsonl(path.join(outDir, 'market.jsonl'));
const dm = readJsonl(path.join(outDir, 'dm.jsonl'));
const events = [...market, ...dm].filter(isMessageEvent);

const sawSeller = events.some((e) => e.sender === sellerMxid);
const sawBuyer = events.some((e) => e.sender === buyerMxid);

if (!events.length) {
  die('no message events found in market.jsonl or dm.jsonl');
}
if (!sawSeller) {
  die(`did not observe any messages from seller ${sellerMxid}`);
}
if (!sawBuyer) {
  die(`did not observe any messages from buyer ${buyerMxid}`);
}

console.log(`[assert] PASS: saw messages from both seller and buyer (events=${events.length})`);
