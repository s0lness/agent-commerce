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

function parseApproval(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith("APPROVAL_REQUEST")) {
    const reason = trimmed.slice("APPROVAL_REQUEST".length).trim();
    if (!reason) throw new Error("approval request missing reason");
    return { type: "APPROVAL_REQUEST", reason };
  }
  if (trimmed.startsWith("APPROVAL_RESPONSE")) {
    const reason = trimmed.slice("APPROVAL_RESPONSE".length).trim();
    const decision = reason.split(/\s+/)[0]?.toLowerCase();
    if (decision !== "approve" && decision !== "decline") {
      throw new Error("approval response must be approve or decline");
    }
    return { type: "APPROVAL_RESPONSE", reason };
  }
  return null;
}

function parseDeal(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith("Deal Summary:") || trimmed.startsWith("DEAL_SUMMARY")) {
    return { type: "DEAL_SUMMARY", text: trimmed };
  }
  if (trimmed === "CONFIRMED" || trimmed === "Confirmed") {
    return { type: "CONFIRMED", text: trimmed };
  }
  return null;
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

const approvalValid = [
  "APPROVAL_REQUEST price above budget",
  "APPROVAL_RESPONSE approve",
  "APPROVAL_RESPONSE decline need more info",
];

const approvalInvalid = ["APPROVAL_REQUEST", "APPROVAL_RESPONSE", "APPROVAL_RESPONSE maybe"];

for (const line of approvalValid) {
  const data = parseApproval(line);
  assert.ok(data && data.type, `valid approval should parse: ${line}`);
}

for (const line of approvalInvalid) {
  let failed = false;
  try {
    parseApproval(line);
  } catch {
    failed = true;
  }
  assert.ok(failed, `invalid approval should fail: ${line}`);
}

const dealValid = ["DEAL_SUMMARY buyer agrees at $150", "Deal Summary: buyer agrees", "CONFIRMED", "Confirmed"];
const dealInvalid = ["Deal summary: lower-case", "CONFIRM"];

for (const line of dealValid) {
  const data = parseDeal(line);
  assert.ok(data && data.type, `valid deal should parse: ${line}`);
}

for (const line of dealInvalid) {
  const data = parseDeal(line);
  assert.ok(!data, `invalid deal should not parse: ${line}`);
}

console.log("protocol tests passed");
