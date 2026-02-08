# Lab Folder Reorganization Plan

## Current Problem

**lab/ has 24 markdown files at root level** - too cluttered, hard to navigate.

**Key insight from user:** Some docs in lab/docs/ are about **HOW TO CONFIGURE AGENTS** 
(buyer setup, agent behavior specs, model selection, security). These are valuable for 
**anyone deploying agents** (friends mounting their own), not just lab users testing.

**Solution:** Create `docs/agents/` for deployment guides, keep `lab/docs/` for testing guides.

Many files are:
- Session summaries (obsolete after work is done)
- Deployment guides (belong in docs/)
- General architecture/protocol (belong in root docs/)
- Obsolete migration notes

## Current State

```
lab/
├── ARCHITECTURE.md              ← General, move to docs/
├── CHANGELOG.md                 ← Keep, standard
├── DOCUMENTATION_INDEX.md       ← Consolidate into README
├── FINAL_SUMMARY.md             ← Archive (session summary)
├── FRIENDS_DEPLOYMENT.md        ← Move to lab/docs/ or docs/
├── ISSUES.md                    ← Archive (point-in-time bugs)
├── LIVE_MODE.md                 ← Move to lab/docs/
├── METRICS_GUIDE.md             ← Move to lab/docs/
├── PLAN.md                      ← KEEP (lab-specific roadmap)
├── PROTOCOL.md                  ← Move to docs/ (general)
├── QUICKSTART.md                ← Consolidate into README
├── QUICK_REFERENCE.md           ← KEEP (useful cheat sheet)
├── README.md                    ← KEEP (entry point)
├── REPO_REVIEW.md               ← Archive (obsolete)
├── RESEARCH.md                  ← Move to docs/ (general)
├── SECURITY.md                  ← Delete (duplicate of lab/docs/SECURITY.md)
├── SECURITY_SUMMARY.md          ← Archive (point-in-time summary)
├── STATUS.md                    ← Archive (point-in-time status)
├── TESTING_GUIDE.md             ← Keep in lab/docs/ (already there)
├── TEST_RESULTS.md              ← Archive (point-in-time results)
├── TROUBLESHOOTING.md           ← Keep in lab/docs/ (already there)
├── TYPESCRIPT_MIGRATION.md      ← Archive (migration is done)
├── VALIDATION_CHECKLIST.md      ← Archive (one-time checklist)
└── WORK_SESSION_SUMMARY.md      ← Archive (session summary)
```

---

## Proposed Structure

### Keep at lab/ root (4 files)
- `README.md` - Entry point
- `PLAN.md` - Lab development roadmap (phases 0-15)
- `QUICK_REFERENCE.md` - Command cheat sheet
- `CHANGELOG.md` - Version history

### Move to docs/ (4 files - general interest)
- `ARCHITECTURE.md` → `docs/ARCHITECTURE.md` (general architecture principles)
- `PROTOCOL.md` → `docs/PROTOCOL.md` (agent commerce protocol design)
- `RESEARCH.md` → `docs/RESEARCH.md` (research questions)
- *(Note: docs/ already has architecture.md - may need to merge or rename)*

### Move to docs/agents/ (5 files - agent deployment guides)
Create `docs/agents/` directory for agent configuration guides:
- `lab/docs/BUYER_AGENT_SETUP.md` → `docs/agents/BUYER_AGENT_SETUP.md`
- `lab/docs/MARKETPLACE_AGENTS_SPEC.md` → `docs/agents/MARKETPLACE_AGENTS_SPEC.md`
- `lab/docs/MODEL_SELECTION.md` → `docs/agents/MODEL_SELECTION.md`
- `lab/docs/SECURITY.md` → `docs/agents/SECURITY.md`
- `lab/FRIENDS_DEPLOYMENT.md` → `docs/agents/FRIENDS_DEPLOYMENT.md`

**Rationale:** These guides help anyone deploy agents (not just lab testing).
Friends configuring agents need these references.

### Move to lab/docs/ (2 files - lab-specific guides)
- `LIVE_MODE.md` → `lab/docs/LIVE_MODE.md`
- `METRICS_GUIDE.md` → `lab/docs/METRICS_GUIDE.md`

### Archive to lab/archive/ (10 files - historical/obsolete)
Create `lab/archive/` directory for historical context:
- `FINAL_SUMMARY.md` (2026-02-08 session summary)
- `WORK_SESSION_SUMMARY.md` (2026-02-08 session notes)
- `STATUS.md` (point-in-time status)
- `SECURITY_SUMMARY.md` (point-in-time summary)
- `TEST_RESULTS.md` (point-in-time results)
- `VALIDATION_CHECKLIST.md` (one-time checklist, done)
- `TYPESCRIPT_MIGRATION.md` (migration complete)
- `REPO_REVIEW.md` (pre-reorganization review)
- `ISSUES.md` (bugs from specific point in time)
- `DOCUMENTATION_INDEX.md` (superseded by improved README)

### Delete (1 file - duplicate)
- `SECURITY.md` - Delete (exact duplicate of lab/docs/SECURITY.md)

### Consolidate into README (2 files)
- `QUICKSTART.md` - Merge into README.md (quick start section)
- `DOCUMENTATION_INDEX.md` - Merge into README.md (navigation section)

---

## File Categorization

### 📂 docs/agents/ - Agent Configuration & Deployment Guides (NEW)
**Who:** Anyone deploying agents (friends, production users)
**Why separate:** When you publish the server/protocol and tell friends "mount your agent," 
they need guides on:
- How to set up buyer/seller agents
- How agents should behave in the marketplace
- How to choose models
- Security best practices
- Deployment for friends

**Files:**
- `BUYER_AGENT_SETUP.md` (step-by-step agent configuration)
- `MARKETPLACE_AGENTS_SPEC.md` (agent behavior specification)
- `MODEL_SELECTION.md` (choosing appropriate models)
- `SECURITY.md` (security architecture for deployers)
- `FRIENDS_DEPLOYMENT.md` (how to host for friends)

**This is NOT lab-specific** - these are deployment guides useful for anyone running agents.

### 📂 docs/ - General Architecture & Research
**Who:** Anyone wanting to understand vision, protocol, architecture
**Files:**
- `ARCHITECTURE.md` (agent autonomy principle, design patterns)
- `PROTOCOL.md` (agent-native commerce protocol specification)
- `RESEARCH.md` (open research questions)
- `architecture.md` (existing - may need merge)
- `real-agents.md` (existing)
- `flows.md` (existing)
- `repo-hygiene.md` (existing)

**Action:** May need to merge/consolidate the two architecture.md files.

### 📂 docs/agents/ - Agent Configuration & Behavior Guides (NEW)
**Who:** Anyone deploying agents (friends, production users)
**Files:**
- `BUYER_AGENT_SETUP.md` (move from lab/docs/)
- `MARKETPLACE_AGENTS_SPEC.md` (move from lab/docs/)
- `MODEL_SELECTION.md` (move from lab/docs/)
- `SECURITY.md` (move from lab/docs/ - security is critical for deployers)
- `FRIENDS_DEPLOYMENT.md` (move from lab/)

**Why separate:** These guides help people configure and deploy agents in production,
not just for lab testing. Friends mounting agents need these references.

### 📂 lab/docs/ - Lab-Specific Testing Guides
**Who:** Lab users running tests and experiments
**Files:**
- `TEST_TEMPLATE.md` (existing)
- `matrix-run.md` (existing)
- `TESTING_GUIDE.md` (existing)
- `TROUBLESHOOTING.md` (existing)
- `LIVE_MODE.md` (move from lab/)
- `METRICS_GUIDE.md` (move from lab/)

### 📂 lab/archive/ - Historical Documentation
**Who:** Developers wanting historical context on decisions
**Files:** Session summaries, point-in-time status, completed migrations

---

## PLAN.md Analysis

### Server-Relevant Content in PLAN.md

**Phases 0-4:** Infrastructure setup (Synapse + Element + agents)
- **Relevant to:** Both lab AND anyone deploying server
- **Action:** Keep in lab/PLAN.md (it's about building the lab framework)
- **Alternative:** Could extract "deployment" sections to docs/DEPLOYMENT.md

**Phases 9-15:** Lab feature development
- **Relevant to:** Lab development only
- **Action:** Keep in lab/PLAN.md

**General principles & decisions:**
- "LOCAL ONLY initially" - deployment decision
- Secrets handling - both lab and server
- Matrix architecture - general

**Recommendation:**
- Keep PLAN.md in lab/ (it's the lab roadmap)
- Create docs/DEPLOYMENT.md that references PLAN.md phases 0-4 for infrastructure setup
- Create docs/SERVER_SETUP.md for production server deployment (when ready)

---

## Migration Steps

### Step 1: Create archive directory
```bash
mkdir lab/archive
```

### Step 2: Move to root docs/
```bash
git mv lab/ARCHITECTURE.md docs/ARCHITECTURE_PRINCIPLES.md  # Rename to avoid conflict
git mv lab/PROTOCOL.md docs/
git mv lab/RESEARCH.md docs/
```

### Step 3: Create docs/agents/ and move agent guides
```bash
mkdir docs/agents
git mv lab/docs/BUYER_AGENT_SETUP.md docs/agents/
git mv lab/docs/MARKETPLACE_AGENTS_SPEC.md docs/agents/
git mv lab/docs/MODEL_SELECTION.md docs/agents/
git mv lab/docs/SECURITY.md docs/agents/
git mv lab/FRIENDS_DEPLOYMENT.md docs/agents/
```

### Step 4: Move to lab/docs/
```bash
git mv lab/LIVE_MODE.md lab/docs/
git mv lab/METRICS_GUIDE.md lab/docs/
```

### Step 5: Archive historical files
```bash
git mv lab/FINAL_SUMMARY.md lab/archive/
git mv lab/WORK_SESSION_SUMMARY.md lab/archive/
git mv lab/STATUS.md lab/archive/
git mv lab/SECURITY_SUMMARY.md lab/archive/
git mv lab/TEST_RESULTS.md lab/archive/
git mv lab/VALIDATION_CHECKLIST.md lab/archive/
git mv lab/TYPESCRIPT_MIGRATION.md lab/archive/
git mv lab/REPO_REVIEW.md lab/archive/
git mv lab/ISSUES.md lab/archive/
git mv lab/DOCUMENTATION_INDEX.md lab/archive/
```

### Step 6: Delete duplicate
```bash
git rm lab/SECURITY.md  # Moving to docs/agents/SECURITY.md instead
```

### Step 7: Update lab/README.md
Consolidate QUICKSTART.md content into README.md, then:
```bash
git rm lab/QUICKSTART.md
```

### Step 8: Update documentation indexes

**Update root docs/README.md:**
- Add ARCHITECTURE_PRINCIPLES.md, PROTOCOL.md, RESEARCH.md
- Add new agents/ section linking to:
  - BUYER_AGENT_SETUP.md
  - MARKETPLACE_AGENTS_SPEC.md  
  - MODEL_SELECTION.md
  - SECURITY.md
  - FRIENDS_DEPLOYMENT.md

**Update lab/README.md:**
- Reference lab/docs/ guides (LIVE_MODE.md, METRICS_GUIDE.md)
- Point to docs/agents/ for deployment guides

**Create docs/agents/README.md:**
Navigation for agent configuration guides

---

## Result

### Before (24 files at lab/)
```
lab/
├── [24 .md files - cluttered]
```

### After (4 files at lab/)
```
lab/
├── README.md                    # Entry point
├── PLAN.md                      # Lab roadmap
├── QUICK_REFERENCE.md           # Command cheat sheet
├── CHANGELOG.md                 # Version history
├── docs/                        # 6 lab-specific testing guides
│   ├── LIVE_MODE.md             ← moved
│   ├── METRICS_GUIDE.md         ← moved
│   ├── TEST_TEMPLATE.md
│   ├── TESTING_GUIDE.md
│   ├── TROUBLESHOOTING.md
│   └── matrix-run.md
└── archive/                     # Historical context
    └── [10 archived files]
```

### Root docs/ (general + agent guides)
```
docs/
├── README.md                    # Documentation index
├── ARCHITECTURE_PRINCIPLES.md   ← moved from lab/
├── PROTOCOL.md                  ← moved from lab/
├── RESEARCH.md                  ← moved from lab/
├── architecture.md              # (may merge with ARCHITECTURE_PRINCIPLES)
├── real-agents.md
├── flows.md
├── repo-hygiene.md
└── agents/                      # Agent deployment guides (NEW)
    ├── BUYER_AGENT_SETUP.md     ← moved from lab/docs/
    ├── MARKETPLACE_AGENTS_SPEC.md ← moved from lab/docs/
    ├── MODEL_SELECTION.md       ← moved from lab/docs/
    ├── SECURITY.md              ← moved from lab/docs/
    └── FRIENDS_DEPLOYMENT.md    ← moved from lab/
```

---

## Benefits

1. **Clear lab/ root** - Only 4 essential files
2. **Organized by audience** - Lab testing vs agent deployment guides separated
3. **Friends can deploy** - docs/agents/ has everything needed to configure agents
4. **General docs elevated** - Architecture/protocol/research in root docs/
5. **Historical context preserved** - Archive folder for completed work
6. **No duplicates** - Single source of truth
7. **Better navigation** - Clear separation of concerns (testing vs deployment vs architecture)

---

## Open Questions

1. **docs/architecture.md vs lab/ARCHITECTURE.md:**
   - Current docs/architecture.md is brief (23 lines)
   - lab/ARCHITECTURE.md is comprehensive (161 lines, Agent Autonomy Principle)
   - **Recommendation:** Merge into docs/ARCHITECTURE.md (comprehensive version wins)
   - Keep ARCHITECTURE_PRINCIPLES.md name to clarify it's about design principles

2. **PLAN.md stays in lab/?**
   - Yes - it's the lab development roadmap
   - Reference it from docs/DEPLOYMENT.md for infrastructure setup
   
3. **CHANGELOG.md location:**
   - Keep in lab/ (lab-specific version history)
   - Could also create root CHANGELOG.md for overall project

4. **Archive folder in git or .gitignore?**
   - Keep in git (historical context is valuable)
   - Alternative: Move to wiki or GitHub releases

---

## Time Estimate

- Review & decision: 10 min (done)
- Execute migrations: 15 min
- Update README files: 15 min
- Test & validate: 10 min
- Commit & push: 5 min

**Total:** ~55 minutes
