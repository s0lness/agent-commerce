const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { logEvent } = require("../dist/log.js");

function readEvents(dir) {
  const data = fs.readFileSync(path.join(dir, "events.jsonl"), "utf8");
  return data
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("logEvent redacts dm messages when configured", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clawlist-test-"));
  logEvent(
    {
      ts: new Date().toISOString(),
      channel: "dm",
      from: "@a:localhost",
      to: "@b:localhost",
      body: "secret",
      transport: "matrix",
    },
    dir,
    "dm"
  );

  const events = readEvents(dir);
  assert.equal(events.length, 1);
  assert.equal(events[0].body, "[redacted]");
});

test("logEvent leaves gossip messages intact when redacting dm only", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clawlist-test-"));
  logEvent(
    {
      ts: new Date().toISOString(),
      channel: "gossip",
      from: "@a:localhost",
      body: "hello",
      transport: "matrix",
    },
    dir,
    "dm"
  );

  const events = readEvents(dir);
  assert.equal(events.length, 1);
  assert.equal(events[0].body, "hello");
});
