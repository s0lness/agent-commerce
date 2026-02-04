const assert = require("assert");

function parseListing(line) {
  if (!line.startsWith("LISTING_CREATE ")) return null;
  const json = line.slice("LISTING_CREATE ".length).trim();
  const data = JSON.parse(json);
  const required = ["id", "type", "item", "price", "currency"];
  for (const key of required) {
    if (!data[key]) throw new Error(`Missing field: ${key}`);
  }
  if (!["buy", "sell"].includes(data.type)) {
    throw new Error(`Invalid type: ${data.type}`);
  }
  if (typeof data.price !== "number") {
    throw new Error("price must be number");
  }
  return data;
}

const valid = [
  'LISTING_CREATE {"id":"lst_1","type":"buy","item":"Nintendo Switch","price":120,"currency":"EUR","condition":"good","ship":"included","location":"EU"}',
  'LISTING_CREATE {"id":"lst_2","type":"sell","item":"Nintendo Switch OLED","price":150,"currency":"EUR"}',
];

const invalid = [
  'LISTING_CREATE {"id":"lst_3","type":"trade","item":"Switch","price":120,"currency":"EUR"}',
  'LISTING_CREATE {"id":"lst_4","type":"buy","item":"Switch","price":"120","currency":"EUR"}',
  "LISTING_CREATE not-json",
];

for (const line of valid) {
  const data = parseListing(line);
  assert.ok(data && data.id, "valid listing should parse");
}

for (const line of invalid) {
  let failed = false;
  try {
    parseListing(line);
  } catch {
    failed = true;
  }
  assert.ok(failed, `invalid listing should fail: ${line}`);
}

console.log("protocol tests passed");
