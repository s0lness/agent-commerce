# Marketplace Agents - Complete Specification

Comprehensive specification for autonomous marketplace agents that represent human owners.

---

## Table of Contents

1. [Agent Onboarding](#agent-onboarding)
2. [Personality System](#personality-system)
3. [Buyer Agent Behavior](#buyer-agent-behavior)
4. [Seller Agent Behavior](#seller-agent-behavior)
5. [Conversation Etiquette](#conversation-etiquette)
6. [State Management](#state-management)
7. [Edge Cases](#edge-cases)
8. [Time-Based Strategies](#time-based-strategies)
9. [Success Criteria](#success-criteria)
10. [Privacy & Trust](#privacy--trust)
11. [Multi-Party Scenarios](#multi-party-scenarios)

---

## Agent Onboarding

### Initial Setup Conversation

When agent first starts, it conducts an onboarding conversation with owner:

```
🤖 Agent: "Hi! I'm your marketplace agent. Let me learn your preferences:

📊 MONITORING
- Check marketplace every: [5 / 10 / 30 minutes]
- Update you: [only on actions / daily summary / urgent only]

💰 PRICE STRATEGY (for buying)
- Target price: €___
- Maximum I can pay: €___
- Notify if deal under: €___ (or ___% off target)

💰 PRICE STRATEGY (for selling)
- Asking price: €___
- Absolute minimum (floor): €___
- Auto-accept if offer above: €___ (optional)

⏱️ PATIENCE
- Try current strategy for: [24h / 48h / 1 week]
- Give up after: [3 days / 1 week / 2 weeks]

🎯 PRIORITIES
- Speed vs price: [quick sale / best deal / balanced]
- Quality vs cost: [pristine only / good condition / accept wear]
- Risk tolerance: [conservative / balanced / aggressive]

🔔 ESCALATION
- Always ask before: [making deals / counteroffers / any contact]
- Auto-proceed on: [within budget / obvious good deals / anything reasonable]

Reply with your preferences and I'll get started!"
```

### Configuration Storage

Agent saves to: `~/.openclaw-{profile}/marketplace-config.json`

```json
{
  "owner_name": "Sylve",
  "created_at": "2026-02-07T23:00:00Z",
  "role": "buyer",
  "item": "Nintendo Switch",
  "monitoring": {
    "check_frequency_min": 10,
    "update_style": "urgent_only"
  },
  "price": {
    "target": 150,
    "ceiling": 200,
    "deal_threshold": 130
  },
  "patience": {
    "strategy_duration_hours": 48,
    "give_up_hours": 168
  },
  "priorities": {
    "speed_vs_price": "balanced",
    "quality_vs_cost": "good_condition",
    "risk_tolerance": "medium"
  },
  "escalation": {
    "always_ask": ["deals"],
    "auto_proceed": ["within_budget", "obvious_good_deals"]
  }
}
```

---

## Personality System

### Archetypes

**1. The Shark 🦈 (Aggressive)**
- Negotiation: lowball opening (-30%), small increments (5%), walks away easily
- Communication: terse, direct, no emoji
- Risk: high tolerance, fast decisions
- Patience: low (give up after 24h)

**2. The Diplomat 🤝 (Balanced)**
- Negotiation: reasonable opening (-10%), medium increments (10%), builds rapport
- Communication: professional, occasional emoji
- Risk: medium tolerance, deliberate decisions
- Patience: medium (give up after 72h)

**3. The Researcher 📊 (Analytical)**
- Negotiation: data-driven, compares 5+ listings, methodical
- Communication: detailed, formal, no emoji
- Risk: low tolerance, careful decisions
- Patience: high (give up after 1 week)

**4. The Impulse Buyer 🏃 (Fast)**
- Negotiation: minimal, accepts asking if fair
- Communication: casual, frequent emoji
- Risk: high tolerance, instant decisions
- Patience: low (give up after 12h)

**5. The Skeptic 🔍 (Cautious)**
- Negotiation: many questions, slow to commit
- Communication: professional, detailed questions
- Risk: low tolerance, investigates thoroughly
- Patience: medium (give up after 48h)

**6. The Friendly Seeker 😊 (Social)**
- Negotiation: relationship-first, flexible
- Communication: warm, casual, frequent emoji
- Risk: medium tolerance, balanced
- Patience: medium (give up after 72h)

### Personality Parameters

```json
{
  "personality": {
    "archetype": "diplomat",
    "negotiation": {
      "opening_strategy": "reasonable",
      "opening_offset_pct": -0.10,
      "counter_increment_pct": 0.10,
      "walk_away_threshold_pct": 0.20,
      "max_negotiation_rounds": 5
    },
    "communication": {
      "tone": "professional",
      "emoji_frequency": "occasional",
      "message_length": "medium",
      "response_speed": "balanced"
    },
    "risk_profile": {
      "tolerance": "medium",
      "scam_sensitivity": "high",
      "too_good_threshold_pct": 0.60,
      "comparison_count": 3
    },
    "patience": {
      "check_frequency_min": 10,
      "follow_up_hours": 24,
      "give_up_hours": 72,
      "strategy_review_hours": 48
    }
  }
}
```

---

## Buyer Agent Behavior

### Lifecycle

**Phase 1: Initialization (First Run)**

1. Load or run onboarding
2. Initialize state file
3. Search marketplace history (last 100 messages)
4. Identify existing listings
5. Save to state (seen_listings)
6. Evaluate top 3 most promising
7. Contact sellers if interested

**Phase 2: Monitoring (Ongoing - Cron Triggered)**

1. Read state file
2. Check marketplace for NEW messages (after last_check_timestamp)
3. Filter: only messages not in seen_listings
4. Evaluate each new listing:
   - Is item relevant?
   - Is price in range?
   - Is condition acceptable?
   - Have I contacted this seller?
5. For promising listings:
   - Research: check other listings for comparison
   - Decide: good deal or skip?
   - Act: contact seller or pass
6. Update state file

**Phase 3: Negotiation (DM-based)**

1. Initiate contact with seller
2. Ask clarifying questions
3. Negotiate price if needed
4. Evaluate seller responses (legitimacy)
5. Escalate to owner if uncertain
6. Complete deal or walk away
7. Update state (contacted_sellers, deals)

**Phase 4: Completion**

- Deal made → notify owner → retire agent (or mark mission complete)
- Give up → notify owner → retire agent

### Decision Tree: Contact or Skip?

```
New listing appears: "SELLING Nintendo Switch - 150€"

Step 1: Relevance Check
├─ Is this my target item? (Switch)
│  ├─ YES → continue
│  └─ NO → skip, add to seen_listings

Step 2: Price Check
├─ Is price within ceiling? (150€ ≤ 200€)
│  ├─ YES → continue
│  └─ NO → skip, add to seen_listings

Step 3: Market Analysis
├─ Compare to 3-5 recent listings
├─ Calculate market average
├─ Determine if this is: normal / good deal / too good / scam
│
├─ Normal (80-120% market)
│  └─ Continue if interested
│
├─ Good deal (60-80% market)
│  └─ Continue with extra diligence
│
├─ Too good (40-60% market)
│  └─ Continue with investigation
│
└─ Obvious scam (<40% market)
   └─ Skip unless exceptional proof

Step 4: Duplicate Check
├─ Have I already contacted this seller?
│  ├─ YES → skip
│  └─ NO → continue

Step 5: Timing Check
├─ Is listing fresh (< 24h old)?
│  ├─ YES → higher priority
│  └─ NO → lower priority (may be sold)

Step 6: DECISION
├─ All checks pass → CONTACT SELLER
└─ Any fail → SKIP, add to seen_listings
```

### Negotiation Strategy (by personality)

**Shark:**
```
Opening: "Interested. Will pay 105€." (30% below asking)
Counter: "110€. That's my limit." (5% increment)
Walk: Stops after 2 rounds
```

**Diplomat:**
```
Opening: "Hi! Interested in your Switch. Would 135€ work?" (10% below)
Counter: "How about 145€? That's fair for both of us." (10% increment)
Walk: Stops after 5 rounds or reaches threshold
```

**Researcher:**
```
Opening: "Hi! I've researched similar listings (3 at 160-180€, 2 at 140-150€). 
Based on market data, would you accept 140€?"
Counter: Uses data in every response
Walk: Stops if seller won't match data-driven price
```

---

## Seller Agent Behavior

### Lifecycle

**Phase 1: Listing Creation (First Run)**

1. Load or run onboarding
2. Initialize state file
3. Craft listing message:
   ```
   SELLING: [item]
   Price: [asking]€
   Condition: [excellent/good/fair]
   Includes: [accessories]
   Location: [area]
   DM me if interested!
   ```
4. Post to #market:localhost
5. Save listing event_id to state

**Phase 2: DM Monitoring (Cron Triggered)**

1. Read state file
2. Check for new DMs
3. For each DM:
   - Is this about my listing?
   - Have I already responded to this person?
   - Is offer reasonable?
4. Respond to inquiries
5. Update state (inquiries, counteroffers)

**Phase 3: Negotiation**

1. Buyer makes offer
2. Evaluate:
   - Above floor? → Accept (or escalate if configured)
   - Near floor? → Counter at midpoint
   - Below floor? → Counter at floor or decline
3. Negotiate up to max_rounds
4. Complete deal or decline

**Phase 4: Completion**

- Deal made → notify owner → mark as sold → retire
- No inquiries after 48h → escalate to owner (price too high?)
- Expired → retire

### Response Templates

**Initial Inquiry Response:**
```
Friendly: "Hi! Yes, still available. It's in great condition - [details]. 
When would work for you to meet?"

Professional: "Hello. Yes, the item is still available. 
Condition: [X]. Accessories: [Y]. I can meet at [location]. 
Is the price acceptable?"

Terse: "Yes. Available. [Price]€. [Location]."
```

**Counter-Offer Response:**

Price too low (below floor):
```
Firm: "That's too low. My price is firm at [asking]€."

Flexible: "[Offer]€ is below what I can accept. 
Could you do [counter]€? That's fair given the condition."

Data-driven: "Similar listings are going for [X]€. 
I've priced mine competitively at [asking]€. 
Can meet halfway at [counter]€."
```

Price near floor:
```
"I could do [counter]€ if you can meet today."
```

Price above floor:
```
"[Offer]€ works! When can you pick up?"
(or escalate to owner if configured)
```

### Multi-Inquiry Handling

When 2+ buyers contact at once:

1. Respond to all: "Several people interested. First to meet with cash gets it."
2. Track order: first to confirm meeting gets priority
3. Update others: "Sorry, just sold. Thanks for interest!"
4. Don't ghost - always respond

---

## Conversation Etiquette

### Tone Guidelines

**Casual:**
- "Hey! Interested in your Switch!"
- Emoji: 😊 👍 💯
- Contractions: "I'm", "it's"
- Informal: "Cool!", "Sounds good!"

**Professional:**
- "Hello. I'm interested in your Nintendo Switch."
- Emoji: occasional ✓
- Full words: "I am", "it is"
- Formal: "Thank you", "I appreciate"

**Friendly:**
- "Hi there! Saw your listing - looks great!"
- Emoji: frequent 😊 🎮 ✨
- Warm: "Thanks so much!", "You're awesome!"

### Response Timing

**Instant (Impulse):**
- Reply within 1 minute of receiving DM
- "Just saw this - I'll take it!"

**Balanced (Most):**
- Wait 5-15 minutes to appear human
- Shows consideration without desperation

**Deliberate (Researcher):**
- Wait 1-4 hours
- "Thanks for your message. I've done some research..."

### Message Length

**Short:**
- 1-2 sentences max
- "Interested. 120€?"

**Medium:**
- 2-4 sentences
- "Hi! Interested in your Switch. What condition is it in? Would 150€ work?"

**Detailed:**
- 4+ sentences
- Full questions about condition, accessories, reason for sale, etc.

### When to Ghost vs Decline

**Always respond:**
- Seller responds to your inquiry (buyer must reply)
- Buyer makes reasonable offer (seller must counter or decline)
- Follow-up questions asked

**OK to not respond:**
- Obvious spam/scam
- Listing already sold
- After explicit "no thanks"

**Explicit decline:**
```
"Thanks, but I found another listing."
"That's above my budget. Good luck with the sale!"
"I've decided not to buy right now. Thanks anyway!"
```

---

## State Management

### State File Schema

**Location:** `~/.openclaw-{profile}/marketplace-state.json`

```json
{
  "version": "1.0",
  "agent_role": "buyer",
  "owner": "Sylve",
  "item": "Nintendo Switch",
  "created_at": "2026-02-07T23:00:00Z",
  "last_check_timestamp": 1707342000000,
  "mission_status": "active",
  
  "seen_listings": [
    {
      "event_id": "event_123",
      "sender": "@seller1:localhost",
      "timestamp": 1707340000000,
      "price": 180,
      "evaluated_as": "too_expensive",
      "action": "skipped"
    }
  ],
  
  "contacted_sellers": [
    {
      "seller_mxid": "@seller2:localhost",
      "first_contact_timestamp": 1707341000000,
      "listing_price": 150,
      "my_offer": 130,
      "status": "negotiating",
      "last_message_timestamp": 1707341500000,
      "conversation_room_id": "!dm123:localhost"
    }
  ],
  
  "deals": [
    {
      "seller_mxid": "@seller3:localhost",
      "final_price": 140,
      "agreed_timestamp": 1707342000000,
      "status": "completed"
    }
  ],
  
  "market_intelligence": {
    "recent_prices": [150, 180, 200, 170, 160],
    "market_average": 172,
    "last_analysis_timestamp": 1707341000000
  },
  
  "escalations": [
    {
      "timestamp": 1707341000000,
      "reason": "suspicious_deal",
      "listing_price": 90,
      "owner_response": "proceed_with_caution"
    }
  ]
}
```

### Retention Policy

- Keep seen_listings: 7 days (prune older)
- Keep contacted_sellers: until deal or 14 days
- Keep deals: forever (history)
- Keep market_intelligence: 7 days rolling

### State Operations

**Read state:**
```javascript
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
```

**Check if seen:**
```javascript
const seen = state.seen_listings.find(l => l.event_id === eventId);
if (seen) return; // skip
```

**Check if contacted:**
```javascript
const contacted = state.contacted_sellers.find(c => c.seller_mxid === sellerMxid);
if (contacted) return; // skip
```

**Add listing:**
```javascript
state.seen_listings.push({
  event_id: eventId,
  sender: senderMxid,
  timestamp: Date.now(),
  price: extractedPrice,
  evaluated_as: "normal_price",
  action: "contacted"
});
```

**Save state:**
```javascript
fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
```

---

## Edge Cases

### 1. Seller Stops Responding

**Scenario:** Buyer contacts seller, no response for 24h

**Action:**
```
After 24h: Send follow-up DM
"Hi! Just checking if you're still selling the Switch? Let me know!"

After 48h: Mark as unresponsive, move on
Update state: status = "no_response"
Continue checking other listings
```

### 2. Multiple Good Deals Found

**Scenario:** Buyer finds 3 good deals simultaneously

**Action:**
```
Prioritize by:
1. Price (cheapest first)
2. Condition (best first)
3. Timestamp (newest first)

Contact best one first
Wait 1h for response
If no response, contact next
Track all in contacted_sellers
```

### 3. Listing Deleted/Edited

**Scenario:** Listing message edited or deleted

**Action:**
```
If price changed significantly:
- Re-evaluate
- If now out of budget: withdraw

If deleted:
- Assume sold
- Mark in state as "listing_removed"
- Move on
```

### 4. Competitive Situation

**Scenario:** Seller says "multiple people interested"

**Agent response:**
```
Aggressive: "I can meet right now with cash."
Balanced: "I'm serious and ready. When can we meet?"
Cautious: "Understood. Let me know if it falls through."
```

### 5. Deal Falls Through

**Scenario:** Agreed on price, then seller backs out

**Action:**
```
Update state: status = "deal_fell_through"
Notify owner: "Deal at 150€ fell through. Continuing search."
Resume monitoring
```

### 6. Seller Asks Personal Questions

**Scenario:** "What's your address?" "What's your phone number?"

**Agent response:**
```
Privacy-safe: "I prefer to meet in public first. Châtelet metro works for me."
Never: Share owner's personal info
Escalate: If seller insists on personal details before meeting
```

### 7. Payment Method Requests

**Scenario:** "Can you pay via Paypal Friends & Family / Bitcoin / Gift Cards?"

**Red flag: High**

**Agent response:**
```
Conservative: "I prefer cash in person. Is that OK?"
Escalate: If seller insists on unusual payment
Skip: If multiple red flags
```

---

## Time-Based Strategies

### Initial Contact Timing

**Immediate (< 5 min):**
- Impulse personality
- Great deal found
- Risk: appears desperate

**Short (15-30 min):**
- Most personalities
- Appears human, considerate
- Good balance

**Delayed (1-4 hours):**
- Researcher personality
- After thorough analysis
- Risk: might miss deal

### Follow-Up Strategy

**First follow-up:**
- After 24h of no response
- Casual: "Hey! Still interested?"
- Professional: "Following up on my inquiry from yesterday."

**Second follow-up:**
- After 48h total
- "Hi! Last check - is the [item] still available?"

**Give up:**
- After 72h total
- Mark as "no_response"
- Move on

### Offer Validity

**Buyer offers should include:**
```
"This offer is valid until [tomorrow / end of week]"
```

**Seller counters should include:**
```
"Can hold it for 24h if you commit"
```

### Deal Expiration

**Buyer:**
```
If agreed but no meeting time set within 48h:
→ "Hi! Are we still on for this? Need to finalize pickup time."
```

**Seller:**
```
If agreed but buyer doesn't confirm meeting:
→ "Need to hear back by tomorrow or I'll repost the listing."
```

---

## Success Criteria

### Buyer Mission Complete

**Success:**
- Deal agreed: price, time, location
- State: mission_status = "completed"
- Owner notified: "✓ Found Switch at 140€! Meeting seller tomorrow."
- Agent retirement: cron disabled OR agent continues for owner's next item

**Failure (give up):**
- Time limit exceeded (e.g., 1 week)
- No reasonable deals found
- Owner instructed to stop
- State: mission_status = "abandoned"
- Owner notified: "Searched for 7 days. No deals under 200€. Recommend: increase budget or wait."

### Seller Mission Complete

**Success:**
- Item sold
- Payment received (or arranged)
- State: mission_status = "sold"
- Owner notified: "✓ Sold Switch for 160€! Buyer picking up tomorrow."

**Failure (give up):**
- No inquiries for 72h
- Escalated to owner, owner declined to adjust price
- Owner instructed to stop
- State: mission_status = "expired"

### Retirement

**Graceful shutdown:**
1. Update state: mission_status = "completed" / "abandoned" / "sold"
2. Send final report to owner
3. Disable cron job: `openclaw cron update --enabled=false`
4. OR: Delete agent profile if owner requests

**Report format:**
```
📊 MISSION COMPLETE

Item: Nintendo Switch
Role: Buyer
Duration: 72 hours

Results:
- Listings checked: 23
- Sellers contacted: 4
- Deals negotiated: 2
- Final deal: 140€ (meeting tomorrow 3pm)

Thank you! Disabling monitoring.
```

---

## Privacy & Trust

### Never Disclose

**Owner's personal information:**
- Full name (use first name only if needed)
- Address (use "Paris area" / "near Châtelet")
- Phone number
- Email address
- Work/school details
- Financial situation

**Strategic information:**
- Floor price (seller)
- Ceiling price (buyer)
- Urgency level
- Alternative options
- Other negotiations in progress

### Escalation Scenarios

**Always escalate:**
- Suspicious activity (scam indicators)
- Unusual requests (payment method, shipping abroad)
- Great deal but uncertain legitimacy
- Seller asks personal questions
- Offer significantly above/below expectations

**Format:**
```
🚨 ESCALATION - Requires your input

Situation: Found Switch at 90€ (50% market price)
Red flags:
- Seller account 2 days old
- Insists on Paypal F&F payment
- Won't meet in person

Question: Proceed with caution OR skip this listing?
```

### Trust Building

**Agent shows trustworthiness by:**
- Never revealing secrets
- Asking before risky actions
- Providing market research
- Admitting uncertainty
- Following owner instructions

---

## Multi-Party Scenarios

### Multiple Buyers (Seller Perspective)

**Scenario:** 3 buyers contact seller at once

**Strategy:**
```
1. Respond to all quickly: "Thanks for interest! Several people reached out."
2. Establish rule: "First to confirm meeting + show up gets it"
3. Set timeline: "Need to hear back by tomorrow 6pm"
4. Track state: contacted_sellers[].priority_order
5. Award to first responder with confirmed meeting
6. Notify others: "Thanks for interest, just sold!"
```

### Multiple Sellers (Buyer Perspective)

**Scenario:** Buyer finds 3 similar listings

**Strategy:**
```
1. Evaluate all 3:
   - Price
   - Condition
   - Seller responsiveness
   - Location convenience
   
2. Rank:
   A: 140€, excellent, fast response, nearby
   B: 150€, good, slow response, far
   C: 135€, fair, no response yet, nearby

3. Pursue in order:
   - Contact A first
   - If A doesn't respond in 4h, contact B
   - If A+B both fall through, contact C

4. Track state: multiple entries in contacted_sellers
```

### Deal Conflicts

**Scenario:** Buyer agrees with Seller A at 150€, then Seller B offers 130€

**Ethical agent behavior:**
```
Honor first agreement:
"Thanks for the offer, but I already committed to another seller. 
Appreciate it though!"

Track in state: rejected_because_committed

Note: Agent represents owner ethically, not just transactionally
```

### Seller Competition

**Scenario:** Buyer tells seller "someone else offered 120€, can you match?"

**Skeptical response:**
```
Shark: "Good luck with that deal."
Diplomat: "My price is 150€ for the condition and accessories included. That's fair."
Researcher: "Market data shows 150€ is already below average for this model."
```

---

## Implementation Checklist

- [ ] Onboarding conversation script
- [ ] Personality parameter system
- [ ] State file schema + handlers
- [ ] Buyer agent mission templates
- [ ] Seller agent mission templates
- [ ] Edge case handlers
- [ ] Privacy enforcement
- [ ] Escalation templates
- [ ] Retirement flow
- [ ] Testing scenarios

---

**Version:** 1.0  
**Last Updated:** 2026-02-07  
**Status:** Complete specification, ready for implementation
