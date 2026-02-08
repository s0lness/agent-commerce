import {
  createClient,
  register,
  createRoom,
  joinRoom,
  setPowerLevel,
  setRoomVisibility,
  checkServer,
} from './matrix-api.js';
import { readEnvFile, writeEnvFile, log } from './common.js';
import { join } from 'node:path';

const HOMESERVER = 'http://127.0.0.1:18008';
const MARKET_ALIAS = '#market:localhost';

export interface BootstrapResult {
  sellerMxid: string;
  sellerToken: string;
  buyerMxid: string;
  buyerToken: string;
  roomId: string;
  roomAlias: string;
  homeserver: string;
}

/** Bootstrap Matrix users and market room */
export async function bootstrap(rootDir: string): Promise<BootstrapResult> {
  log('bootstrap', `ensuring synapse reachable at ${HOMESERVER}`);

  if (!(await checkServer(HOMESERVER))) {
    throw new Error(`Synapse not reachable at ${HOMESERVER}`);
  }

  const secretsPath = join(rootDir, '.local', 'secrets.env');
  const bootstrapPath = join(rootDir, '.local', 'bootstrap.env');

  // Try to load cached tokens
  const secrets = await readEnvFile(secretsPath);
  let sellerToken = secrets.SELLER_TOKEN;
  let buyerToken = secrets.BUYER_TOKEN;
  let sellerMxid = secrets.SELLER_MXID;
  let buyerMxid = secrets.BUYER_MXID;

  // Create/login seller
  const sellerClient = createClient(HOMESERVER);
  if (sellerToken && sellerMxid) {
    log('bootstrap', `reusing cached seller token for ${sellerMxid}`);
    sellerClient.accessToken = sellerToken;
    sellerClient.userId = sellerMxid;
  } else {
    log('bootstrap', 'creating seller user');
    const sellerLogin = await register(sellerClient, 'switch_seller', 'test');
    sellerToken = sellerLogin.access_token;
    sellerMxid = sellerLogin.user_id;
  }

  // Create/login buyer
  const buyerClient = createClient(HOMESERVER);
  if (buyerToken && buyerMxid) {
    log('bootstrap', `reusing cached buyer token for ${buyerMxid}`);
    buyerClient.accessToken = buyerToken;
    buyerClient.userId = buyerMxid;
  } else {
    log('bootstrap', 'creating buyer user');
    const buyerLogin = await register(buyerClient, 'switch_buyer', 'test');
    buyerToken = buyerLogin.access_token;
    buyerMxid = buyerLogin.user_id;
  }

  // Create/login admin account for human observers
  let adminToken = secrets.ADMIN_TOKEN;
  let adminMxid = secrets.ADMIN_MXID;
  const adminClient = createClient(HOMESERVER);
  
  if (adminToken && adminMxid) {
    log('bootstrap', `reusing cached admin token for ${adminMxid}`);
    adminClient.accessToken = adminToken;
    adminClient.userId = adminMxid;
  } else {
    log('bootstrap', 'creating admin user for human observers');
    const adminLogin = await register(adminClient, 'admin', 'changeme');
    adminToken = adminLogin.access_token;
    adminMxid = adminLogin.user_id;
  }

  // Save tokens
  await writeEnvFile(secretsPath, {
    SELLER_TOKEN: sellerToken,
    SELLER_MXID: sellerMxid,
    BUYER_TOKEN: buyerToken,
    BUYER_MXID: buyerMxid,
    ADMIN_TOKEN: adminToken,
    ADMIN_MXID: adminMxid,
  });

  // Create or join market room
  let roomId: string;
  try {
    log('bootstrap', `creating market room ${MARKET_ALIAS}`);
    const roomResult = await createRoom(sellerClient, {
      name: 'Marketplace',
      alias: MARKET_ALIAS,
      topic: 'Buy and sell stuff',
      preset: 'public_chat',
      visibility: 'public',
    });
    roomId = roomResult.room_id;
  } catch (err: any) {
    if (err.message.includes('already') || err.message.includes('409') || err.message.includes('400')) {
      log('bootstrap', `market room already exists, joining`);
      const joinResult = await joinRoom(sellerClient, MARKET_ALIAS);
      roomId = joinResult.room_id;
    } else {
      throw err;
    }
  }

  // Ensure buyer is joined
  try {
    await joinRoom(buyerClient, roomId);
  } catch (err: any) {
    if (!err.message.includes('already in')) {
      throw err;
    }
  }

  // Ensure admin is joined
  try {
    await joinRoom(adminClient, roomId);
    log('bootstrap', 'admin joined market room');
  } catch (err: any) {
    if (!err.message.includes('already in')) {
      throw err;
    }
  }

  // Grant admin power level
  try {
    await setPowerLevel(sellerClient, roomId, adminMxid, 100);
    log('bootstrap', 'admin granted elevated permissions');
  } catch (err: any) {
    log('bootstrap', `failed to set admin power level: ${err.message}`);
  }

  // Publish to directory
  try {
    await setRoomVisibility(sellerClient, roomId, 'public');
  } catch (err: any) {
    log('bootstrap', `failed to publish room: ${err.message}`);
  }

  // Write bootstrap env
  const result: BootstrapResult = {
    sellerMxid,
    sellerToken,
    buyerMxid,
    buyerToken,
    roomId,
    roomAlias: MARKET_ALIAS,
    homeserver: HOMESERVER,
  };

  await writeEnvFile(bootstrapPath, {
    HOMESERVER: HOMESERVER,
    SELLER_MXID: sellerMxid,
    SELLER_TOKEN: sellerToken,
    BUYER_MXID: buyerMxid,
    BUYER_TOKEN: buyerToken,
    ROOM_ID: roomId,
    ROOM_ALIAS: MARKET_ALIAS,
  });

  log('bootstrap', `market room: ${MARKET_ALIAS} (${roomId})`);
  log('bootstrap', `wrote: ${secretsPath}, ${bootstrapPath}`);

  // Print credentials for human observers
  console.log('\n✅ Bootstrap complete!\n');
  console.log('📺 Element Web: http://127.0.0.1:18080');
  console.log('👤 Login: admin / changeme');
  console.log('🏠 Room: #market:localhost\n');

  return result;
}
