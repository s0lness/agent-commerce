# Security notes (local development)

This repo includes tooling that interacts with real services (Matrix, Telegram, OpenClaw). Treat all tokens/keys like passwords.

## Hard rules
- **Never commit** credentials (Telegram bot token, Matrix access tokens, OpenClaw gateway tokens).
- Do not paste secrets into docs, issues, or PRs.
- Assume transcripts (`*.jsonl`) may contain sensitive content. Don’t share publicly without review.

## Where secrets must live
- Use **environment variables** or a **local-only** file that is gitignored.
- Local secrets file (recommended): `clawlist-matrix-run/.local/secrets.env`
  - must be created with `umask 077`
  - must be `chmod 600`

## Logs & artifacts
- `meta.json` must not include raw tokens (mask if needed).
- `summary.json` must never include secrets.
