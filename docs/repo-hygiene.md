# Repo Hygiene

This project keeps a clear boundary between public source and local runtime artifacts.

## Public Surface (Tracked)
- `src/`
- `tools/`
- `tests/`
- `docs/`
- `config/*.example.json`

## Internal Kitchen (Untracked)
- runtime logs and artifacts: `logs/`, `runs/`
- local Synapse state: `.local/`, `synapse/`
- local secrets and machine-specific config: `config/agent_*.json`, `config/scenario.local.json`, `*.env`, `*secrets.env`

## Local Scenario Workflow
1. Copy local template:
```bash
cp config/scenario.local.example.json config/scenario.local.json
```
2. Edit `config/scenario.local.json` for your machine.
3. Run scenario:
```bash
npm run scenario
```

## Commit Guard
Install once per clone:
```bash
npm run hooks:install
```

What the guard does (`tools/precommit-check.ts`):
- blocks staged files from internal paths
- scans staged added lines for likely secrets/tokens
- allows known placeholders like `changeme`

You can run it manually:
```bash
npm run check:repo
```
