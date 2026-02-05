import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] || 'out';
const metaPath = process.argv[3] || path.join(outDir, 'meta.json');

function die(msg) {
  console.error(msg);
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

const HS = meta.homeserver;
const marketRoomId = meta.marketRoomId;
let sellerToken = meta.sellerToken;
let buyerToken = meta.buyerToken;

const secretsPath = path.join(outDir, 'secrets.env');
if ((!sellerToken || !buyerToken) && fs.existsSync(secretsPath)) {
  const lines = fs.readFileSync(secretsPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key === 'SELLER_TOKEN') sellerToken = val;
    if (key === 'BUYER_TOKEN') buyerToken = val;
  }
}

async function httpJson(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...headers,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${url} -> ${res.status} ${res.statusText}\n${text}`);
  }
  return res.json();
}

async function listJoinedRooms(token) {
  const j = await httpJson(`${HS}/_matrix/client/v3/joined_rooms`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return j.joined_rooms || [];
}

async function findDmRoomId() {
  // Heuristic: the DM room is any joined room that isn't the market room and is shared by both users.
  const sellerRooms = new Set(await listJoinedRooms(sellerToken));
  const buyerRooms = new Set(await listJoinedRooms(buyerToken));

  const shared = [...sellerRooms].filter((r) => buyerRooms.has(r) && r !== marketRoomId);
  // If multiple, pick the newest-ish by checking last event id via /messages small pull.
  if (shared.length === 0) return null;
  return shared[0];
}

async function exportRoom(roomId, token, outFile) {
  const events = [];
  let from;

  // Pull up to ~1000 events in chunks (best effort)
  for (let i = 0; i < 10; i++) {
    const url = new URL(`${HS}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages`);
    url.searchParams.set('dir', 'b');
    url.searchParams.set('limit', '100');
    if (from) url.searchParams.set('from', from);

    const j = await httpJson(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const chunk = j.chunk || [];
    events.push(...chunk);

    if (!j.end || chunk.length === 0) break;
    from = j.end;
  }

  fs.writeFileSync(outFile, events.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
}

async function main() {
  if (!HS || !marketRoomId || !sellerToken || !buyerToken) {
    die(`missing required fields (homeserver, marketRoomId, sellerToken, buyerToken). If tokens are not in meta.json, ensure secrets.env exists.`);
  }

  fs.mkdirSync(outDir, { recursive: true });

  await exportRoom(marketRoomId, sellerToken, path.join(outDir, 'market.jsonl'));

  const dmRoomId = await findDmRoomId();
  if (dmRoomId) {
    await exportRoom(dmRoomId, sellerToken, path.join(outDir, 'dm.jsonl'));
    meta.dmRoomId = dmRoomId;
  } else {
    meta.dmRoomId = null;
  }

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  console.log(`[export] wrote ${path.join(outDir, 'market.jsonl')} and dm=${dmRoomId || 'none'}`);
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
