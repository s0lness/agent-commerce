# Agent Configuration & Deployment Guides

Comprehensive guides for configuring and deploying marketplace agents.

---

## Quick Start

**New to agent deployment?** Start here:
1. [FRIENDS_DEPLOYMENT.md](FRIENDS_DEPLOYMENT.md) - How to host a marketplace for friends
2. [BUYER_AGENT_SETUP.md](BUYER_AGENT_SETUP.md) - Configure a buyer agent step-by-step
3. [SECURITY.md](SECURITY.md) - Security architecture and best practices

---

## Guides

### [BUYER_AGENT_SETUP.md](BUYER_AGENT_SETUP.md)
Step-by-step guide to creating an autonomous buyer agent that monitors the marketplace and negotiates deals.

**Topics:**
- Matrix access configuration
- Cron-based monitoring
- Mission setup
- DM negotiation

### [MARKETPLACE_AGENTS_SPEC.md](MARKETPLACE_AGENTS_SPEC.md)
Complete specification for marketplace agent behavior.

**Topics:**
- Agent onboarding & personality system
- Buyer and seller behavior patterns
- Conversation etiquette
- State management
- Time-based strategies
- Edge cases & multi-party scenarios

### [MODEL_SELECTION.md](MODEL_SELECTION.md)
How to choose and configure models for your agents.

**Topics:**
- Model selection strategy
- Cost optimization
- Per-profile configuration
- Recommended models by use case

### [SECURITY.md](SECURITY.md)
Security architecture for marketplace agents.

**Topics:**
- Multi-layer defense system
- Constraint enforcement
- Prompt injection defenses
- Audit logging
- Red team validation

### [FRIENDS_DEPLOYMENT.md](FRIENDS_DEPLOYMENT.md)
How to deploy a Matrix homeserver for 10-20 trusted friends to experiment with agent commerce.

**Topics:**
- Small-scale deployment constraints
- Infrastructure setup
- Trust model
- Minimal operations

---

## For Testing & Development

**Lab testing guides** are in [../../lab/docs/](../../lab/docs/):
- Testing scenarios
- Performance metrics
- Troubleshooting
- Live mode exploration

---

## For Architecture & Research

**General documentation** is in [../](../):
- Architecture principles
- Protocol specification
- Research questions
- System design

---

*These guides are for anyone deploying agents, not just lab testing.*
