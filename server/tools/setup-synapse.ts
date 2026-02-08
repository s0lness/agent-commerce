// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function run(cmd: string, args: string[], opts: any = {}) {
  const res = spawnSync(cmd, args, { stdio: opts.stdio || "inherit", cwd: opts.cwd, env: opts.env, encoding: "utf8" });
  if (res.error) throw res.error;
  if ((res.status || 0) !== 0) throw new Error(`${cmd} failed with code ${res.status}`);
}

function main() {
  const root = path.resolve(__dirname, "../");
  const dataDir = path.join(root, "synapse");
  const serverName = process.env.SYNAPSE_SERVER_NAME || "localhost";
  fs.mkdirSync(dataDir, { recursive: true });

  console.log(`Generating Synapse config in ${dataDir}...`);
  run("docker", [
    "run", "--rm", "-it", "-v", `${dataDir}:/data`,
    "-e", `SYNAPSE_SERVER_NAME=${serverName}`,
    "-e", "SYNAPSE_REPORT_STATS=no",
    "matrixdotorg/synapse:latest", "generate",
  ]);

  console.log("Creating docker-compose.yml...");
  fs.writeFileSync(path.join(root, "docker-compose.yml"), `version: \"3.8\"
services:
  synapse:
    image: matrixdotorg/synapse:latest
    container_name: synapse
    ports:
      - \"8008:8008\"
    environment:
      - SYNAPSE_SERVER_NAME=${serverName}
      - SYNAPSE_REPORT_STATS=no
    volumes:
      - ./synapse:/data
`, "utf8");

  console.log("Starting Synapse...");
  run("docker", ["compose", "up", "-d"], { cwd: root });

  console.log("Writing matrix.env...");
  fs.writeFileSync(path.join(root, "matrix.env"), `MATRIX_SERVER=http://localhost:8008
SERVER_NAME=${serverName}
`, "utf8");

  console.log("\nSynapse running on http://localhost:8008");
  console.log("To create users:");
  console.log("  docker exec -it synapse register_new_matrix_user -c /data/homeserver.yaml http://localhost:8008");
}

main();
