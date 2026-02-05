// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import { ensureDir, fetchRetry, hasDockerContainer, run, sleep } from "./common";

async function main() {
  const root = path.resolve(__dirname, "../../");
  const synapseDir = process.env.SYNAPSE_DIR || path.join(root, ".local", "matrix-synapse");
  const matrixPort = Number(process.env.MATRIX_PORT || 18008);

  const homeserverYaml = path.join(synapseDir, "homeserver.yaml");
  if (!fs.existsSync(homeserverYaml)) {
    ensureDir(synapseDir);
    console.error(`[matrix_up] generating synapse config in ${synapseDir}`);
    run("docker", [
      "run", "--rm", "-u", `${process.getuid()}:${process.getgid()}`,
      "-e", "SYNAPSE_SERVER_NAME=localhost",
      "-e", "SYNAPSE_REPORT_STATS=no",
      "-v", `${synapseDir}:/data`,
      "matrixdotorg/synapse:latest", "generate",
    ], { timeoutMs: 60000 });

    let yaml = fs.readFileSync(homeserverYaml, "utf8");
    if (!/^enable_registration:/m.test(yaml)) yaml += "\nenable_registration: true\n";
    if (!/^enable_registration_without_verification:/m.test(yaml)) {
      yaml += "enable_registration_without_verification: true\n";
    }
    fs.writeFileSync(homeserverYaml, yaml, "utf8");
  }

  run("docker", [
    "run", "--rm", "-v", `${synapseDir}:/data`, "--entrypoint", "/bin/sh",
    "matrixdotorg/synapse:latest", "-c", "chown -R 991:991 /data",
  ], { timeoutMs: 60000, stdio: "pipe" });

  if (hasDockerContainer("clawlist-synapse")) {
    console.error("[matrix_up] synapse already running");
  } else {
    console.error(`[matrix_up] starting synapse on port ${matrixPort}`);
    run("docker", ["rm", "-f", "clawlist-synapse"], { allowFail: true, stdio: "pipe" });
    run("docker", [
      "run", "-d", "--name", "clawlist-synapse",
      "-p", `${matrixPort}:8008`,
      "-e", "SYNAPSE_SERVER_NAME=localhost",
      "-e", "SYNAPSE_REPORT_STATS=no",
      "-v", `${synapseDir}:/data`,
      "matrixdotorg/synapse:latest",
    ]);
  }

  const versions = `http://127.0.0.1:${matrixPort}/_matrix/client/versions`;
  let stable = 0;
  for (let i = 0; i < 120; i += 1) {
    try {
      await fetchRetry(versions, {}, 1);
      stable += 1;
      if (stable >= 2) break;
    } catch {
      stable = 0;
    }
    await sleep(1000);
    if (i === 119) throw new Error("[matrix_up] synapse did not become ready");
  }

  console.error("[matrix_up] ready");
  console.log(`MATRIX_PORT=${matrixPort}`);
  console.log(`HOMESERVER=http://127.0.0.1:${matrixPort}`);
}

main().catch((err) => {
  console.error(err?.message || String(err));
  process.exit(1);
});
