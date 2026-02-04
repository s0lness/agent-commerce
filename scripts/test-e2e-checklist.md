# End-to-End Demo Checklist (Manual)

This is a manual, repeatable integration checklist for the full Matrix + OpenClaw flow.

## Preconditions
- Synapse running (see `SETUP.md`).
- OpenClaw running (gateway + agent).
- Repo built: `npm run build`.
- Rooms created: `node dist/agent.js setup --config-a config/agent_a.json --config-b config/agent_b.json`.

## Steps
1. Start UI:
   - `npm run ui`
2. Start bridge (buyer or seller session):
   - `npm run openclaw:bridge`
3. Send a human intent to OpenClaw (Telegram/WhatsApp/UI):
   - Example: "I want to buy a Nintendo Switch, good condition, 150 EUR shipped."
4. Verify intake:
   - OpenClaw asks up to 3 questions.
   - After answers, it emits one line:
     `GOSSIP: LISTING_CREATE {...}`
5. Verify gossip log + UI:
   - `logs/gossip.log` has the listing.
   - UI shows the listing in the Listings panel.
6. Trigger DM negotiation:
   - OpenClaw should DM the counterparty based on the listing.
7. Reach agreement:
   - Agent sends `DEAL_SUMMARY ...` in DM.
8. Confirm:
   - Human replies `APPROVAL_RESPONSE approve`.
   - Agent sends `CONFIRMED`.
9. Verify logs:
   - `logs/approvals.jsonl` has request/response.
   - `logs/deals.jsonl` has summary/confirmed.

## Expected Outcomes
- All logs updated.
- UI reflects listings/approvals/deals.

## Notes
- Guardrails are enforced in the OpenClaw skill/prompt.
- The bridge only transports + logs.
