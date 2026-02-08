# Test Run Analysis Template

**Copy this template for each test run. Save as `runs/<runId>/ANALYSIS.md`**

---

## Test Info

- **Run ID**: `<runId>`
- **Date**: YYYY-MM-DD HH:MM
- **Scenario**: `<scenario_name>`
- **Duration**: X seconds
- **Result**: Pass / Fail / Partial

---

## 📊 Quantitative Results

**Deal outcome:**
- Final price: X€
- Seller floor: X€ (✅/❌)
- Buyer ceiling: X€ (✅/❌)
- Deal closed: Yes/No

**Timing:**
- Time to first contact: X seconds
- Time to deal close: X seconds
- Message count: X

**Scoring:**
- Violations: X
- Quality signals: X/3 (condition, accessories, logistics)

---

## ✅ What Agents Did Well

### Strengths Observed

**Buyer agent:**
- [ ] Discovered listing autonomously (no manual trigger)
- [ ] Responded quickly (< 30 seconds)
- [ ] Asked quality questions (condition, accessories, logistics)
- [ ] Negotiated logically (justified offers)
- [ ] Stayed within budget constraints
- [ ] Coordinated logistics (time, place, payment)
- [ ] Natural language (not robotic)
- [ ] Other: _______

**Seller agent:**
- [ ] Posted clear listing
- [ ] Responded to inquiries
- [ ] Provided detailed information
- [ ] Negotiated within constraints (floor price)
- [ ] Transparent about flaws
- [ ] Coordinated logistics
- [ ] Natural language
- [ ] Other: _______

**Best moments:**
> Quote specific messages that were particularly good

---

## ❌ Problems & Where Agents Got Stuck

### Issues Identified

**Buyer agent:**
- [ ] Didn't discover listing (missed event)
- [ ] Responded too slowly (> 60 seconds)
- [ ] Asked irrelevant questions
- [ ] Offered outside budget
- [ ] Flip-flopped decisions (changed mind)
- [ ] Poor negotiation strategy (too aggressive/passive)
- [ ] Unnatural language (robotic, repetitive)
- [ ] Didn't coordinate logistics
- [ ] Got stuck in loop (repeated same message)
- [ ] Other: _______

**Seller agent:**
- [ ] Didn't post listing
- [ ] Ignored buyer DM
- [ ] Provided incomplete information
- [ ] Violated floor price
- [ ] Unclear about constraints
- [ ] Didn't coordinate logistics
- [ ] Unnatural language
- [ ] Other: _______

**Stuck points:**
> Describe where negotiation stalled or broke down

**Example problematic messages:**
> Quote specific messages that were confusing, wrong, or broken

---

## 🔍 Behavioral Patterns

### Negotiation Strategy

**Buyer approach:**
- Opening tactic: (lowball / fair offer / build rapport first)
- Justification style: (logical / emotional / aggressive)
- Concession pattern: (fast / slow / none)
- Decision speed: (instant / cautious / indecisive)

**Seller approach:**
- Transparency: (honest about flaws / evasive)
- Flexibility: (willing to negotiate / firm on price)
- Information sharing: (detailed / minimal)
- Urgency tactics: (used pressure / patient)

**Convergence:**
- Initial gap: X€
- Rounds to close: X
- Who conceded more: Buyer / Seller / Equal

---

## 💡 Improvement Recommendations

### Agent Prompts/Missions

**Buyer mission improvements:**
```
Current: "..."

Suggested: "..."

Why: ...
```

**Seller mission improvements:**
```
Current: "..."

Suggested: "..."

Why: ...
```

### Framework/Code

**Issues to fix:**
1. Bug: ...
   - Add to ISSUES.md: Yes/No
   - Priority: High/Medium/Low

2. Feature request: ...
   - Add to PLAN.md: Yes/No
   - Phase: X

### Scenario Design

**Scenario tweaks:**
- Adjust constraints (floor/ceiling)
- Change item type
- Add complexity (multiple items, accessories)
- Test edge cases (exact match price, no overlap)

---

## 🧪 Hypotheses for Future Tests

**Things to test next:**

1. **Hypothesis**: ...
   - Test by: ...
   - Expected outcome: ...

2. **Hypothesis**: ...
   - Test by: ...
   - Expected outcome: ...

---

## 🎓 Lessons Learned

**Key takeaways:**

1. ...
2. ...
3. ...

**Surprises:**
- What unexpected behavior did agents exhibit?
- Did they discover strategies we didn't anticipate?

**Confirmations:**
- What did this test validate?
- What worked as expected?

---

## 📋 Action Items

**Immediate:**
- [ ] Fix bug X (add to ISSUES.md)
- [ ] Update mission prompt for Y
- [ ] Adjust scenario Z

**Research questions raised:**
- ...
- ...

**Next test to run:**
- Scenario: ...
- Focus: ...
- Expected insight: ...

---

*Analyzed by: [Name]*  
*Date: YYYY-MM-DD*
