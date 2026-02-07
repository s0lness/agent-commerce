# Buyer Agent Setup Guide

How to create an autonomous buyer agent that monitors the marketplace and contacts sellers.

## Architecture

The agent uses **OpenClaw's cron system** to periodically check the marketplace, evaluate listings, and initiate contact when interested.

**Key principle:** The agent makes all decisions. External systems just provide triggers and tools.

---

## Setup Steps

### 1. Create Agent Profile

```bash
PROFILE="buyer-switch-fan"
```

### 2. Configure Matrix Access

```bash
# Load bootstrap environment (contains tokens)
source .local/bootstrap.env

# Configure Matrix for the buyer agent
openclaw --profile "$PROFILE" config set --json 'channels.matrix' \
'{
  enabled: true,
  homeserver: "'"$HOMESERVER"'",
  accessToken: "'"$BUYER_TOKEN"'",
  userId: "'"$BUYER_MXID"'",
  encryption: false,
  dm: { policy: "open", allowFrom: ["*"] },
  groupPolicy: "open",
  groups: {
    "*": { requireMention: false },
    "'"$ROOM_ID"'": { allow: true, requireMention: false }
  }
}'
```

### 3. Enable Matrix Plugin

```bash
openclaw --profile "$PROFILE" config set plugins.entries.matrix.enabled true
```

### 4. Set Agent Model

```bash
openclaw --profile "$PROFILE" config set agents.defaults.model.primary "anthropic/claude-sonnet-4-5"
```

### 5. Create Marketplace Monitoring Cron Job

```bash
openclaw --profile "$PROFILE" cron add --json '{
  "name": "monitor-marketplace",
  "schedule": {
    "kind": "every",
    "everyMs": 300000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "MARKETPLACE CHECK:\n\nYour interests: Nintendo Switch consoles (any model), budget max 200€\n\nTask:\n1. Read the last 20 messages from #market:localhost\n2. Look for Switch listings posted in the last 5 minutes\n3. Evaluate each listing: price, condition, seller reputation\n4. If you find a good deal (under 200€, good condition), DM the seller\n5. Ask about: condition, accessories, pickup location, availability\n6. Be natural and conversational\n\nImportant:\n- Only contact listings you haven'\''t already messaged\n- If no new relevant listings, do nothing\n- Be polite and professional",
    "model": "anthropic/claude-sonnet-4-5"
  },
  "sessionTarget": "isolated"
}'
```

### 6. Verify Cron Job

```bash
openclaw --profile "$PROFILE" cron list
```

You should see:
```json
{
  "name": "monitor-marketplace",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "enabled": true
}
```

---

## How It Works

### Every 5 Minutes:

1. **Cron fires** → OpenClaw sends message to agent
2. **Agent receives** → "MARKETPLACE CHECK: ..." message
3. **Agent uses Matrix plugin** → Reads #market:localhost messages
4. **Agent evaluates** → "Is this Switch listing interesting?"
5. **Agent decides** → "Yes, price is good and condition sounds decent"
6. **Agent acts** → DMs seller: "Hi! Still available? What's the condition?"

### Agent Decision Tree:

```
New listing appears: "SELLING Nintendo Switch - 150€"
├─ Agent sees it in market room
├─ Agent thinks: "150€ is within my 200€ budget"
├─ Agent thinks: "I haven't contacted this seller yet"
├─ Agent decides: "This looks good, I should ask"
└─ Agent sends DM: "Hi! Is the Switch still available? What condition?"
```

### No listing:

```
No new Switch listings in last 5 minutes
├─ Agent sees market messages
├─ Agent thinks: "Nothing relevant"
└─ Agent does nothing (silent)
```

---

## Advanced: Multiple Interests

You can create agents with different shopping profiles:

### Bargain Hunter (aggressive)

```json
{
  "message": "You're a bargain hunter. Budget: 150€ max. Look for Nintendo Switch consoles. Always try to negotiate 20% below asking price. Only buy if it's a steal."
}
```

### Quality Focused (selective)

```json
{
  "message": "You care about quality. Budget: 250€ max. Look for Nintendo Switch consoles. Only contact listings that mention excellent condition, original box, and accessories. Price is secondary to quality."
}
```

### Impulse Buyer (fast)

```json
{
  "message": "You're an impulse buyer. Budget: 200€ max. Look for Nintendo Switch consoles. If the price seems fair and it's available now, buy immediately. Don't overthink."
}
```

---

## Monitoring

### Check agent activity:

```bash
# View cron job runs
openclaw --profile "$PROFILE" cron runs --jobId <job-id>

# View agent sessions
openclaw --profile "$PROFILE" sessions list

# Check logs
tail -f ~/.openclaw-$PROFILE/logs/gateway.log
```

### What to look for:

**Good signs:**
- Agent reads market messages
- Agent evaluates listings in thinking
- Agent DMs sellers when appropriate
- Agent skips irrelevant listings

**Bad signs:**
- Agent spams every listing
- Agent never contacts anyone (too cautious)
- Agent DMs same seller multiple times
- Agent contacts listings outside budget

### Tune the mission:

If agent is too aggressive:
```
"Only contact listings that are exceptional deals (at least 30% below market value)"
```

If agent is too passive:
```
"Be proactive - if the price is within budget and condition sounds okay, reach out immediately"
```

---

## Stopping the Agent

### Pause monitoring:

```bash
openclaw --profile "$PROFILE" cron update --jobId <job-id> --json '{"enabled": false}'
```

### Delete cron job:

```bash
openclaw --profile "$PROFILE" cron remove --jobId <job-id>
```

### Delete agent profile:

```bash
rm -rf ~/.openclaw-$PROFILE
```

---

## Troubleshooting

### Agent not running:

```bash
# Check cron status
openclaw --profile "$PROFILE" cron status

# Check if cron job exists
openclaw --profile "$PROFILE" cron list
```

### Agent not seeing messages:

```bash
# Test Matrix connection
openclaw --profile "$PROFILE" system event --text "Test: can you read messages from #market:localhost?"
```

### Agent too spammy:

- Increase `everyMs` (e.g., 600000 for 10 minutes)
- Add to mission: "Track which listings you've already contacted"
- Add to mission: "Wait at least 1 hour between messages to the same seller"

### Agent too quiet:

- Check if mission is too restrictive
- Verify budget range is reasonable
- Add to mission: "Be proactive and don't overthink"

---

## Example: Full Setup Script

```bash
#!/bin/bash
set -e

PROFILE="buyer-switch-fan"

# Load environment
source .local/bootstrap.env

# Configure agent
openclaw --profile "$PROFILE" config set gateway.mode local
openclaw --profile "$PROFILE" config set agents.defaults.model.primary "anthropic/claude-sonnet-4-5"
openclaw --profile "$PROFILE" config set plugins.entries.matrix.enabled true

# Configure Matrix
openclaw --profile "$PROFILE" config set --json 'channels.matrix' \
'{
  enabled: true,
  homeserver: "'"$HOMESERVER"'",
  accessToken: "'"$BUYER_TOKEN"'",
  userId: "'"$BUYER_MXID"'",
  encryption: false,
  dm: { policy: "open", allowFrom: ["*"] },
  groupPolicy: "open",
  groups: {
    "*": { requireMention: false },
    "'"$ROOM_ID"'": { allow: true, requireMention: false }
  }
}'

# Add cron job
openclaw --profile "$PROFILE" cron add --json '{
  "name": "monitor-marketplace",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "payload": {
    "kind": "agentTurn",
    "message": "Check #market:localhost for Nintendo Switch listings under 200€. If you find a good deal, DM the seller asking about condition and availability."
  },
  "sessionTarget": "isolated"
}'

echo "✅ Buyer agent configured! Monitoring marketplace every 5 minutes."
```

Save as `setup-buyer-agent.sh` and run:

```bash
chmod +x setup-buyer-agent.sh
./setup-buyer-agent.sh
```

---

## Best Practices

1. **Start conservative:** Long intervals (10+ min), strict criteria
2. **Tune based on activity:** Adjust frequency and mission based on results
3. **Monitor costs:** Each cron run costs tokens (Claude Sonnet ~$0.01/run)
4. **Track state:** Consider adding memory file for "already contacted" tracking
5. **Test first:** Use short duration scenarios before deploying persistent agents

---

## See Also

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Agent Autonomy Principle
- [README.md](../README.md) - General setup guide
- OpenClaw cron docs: `openclaw cron --help`
