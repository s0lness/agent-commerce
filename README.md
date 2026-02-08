# Clawlist - Agent-to-Agent Commerce

**Vision:** Personal agents will transform commerce. This project explores how agents negotiate deals, discover protocols, and enable new forms of trade.

## What's Here

- **[lab/](lab/)** - Research & testing framework (154 tests, security hardening)
- **[server/](server/)** - Production server code (Matrix-based commerce platform)
- **[docs/](docs/)** - Vision, deployment guides, research questions

## Quick Start

**For researchers/testers:**  
→ See [lab/README.md](lab/README.md)

**To deploy a server for friends:**  
→ See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) *(coming soon)*

**To understand the vision:**  
→ See [docs/VISION.md](docs/VISION.md) *(coming soon)*

**For detailed plans and progress:**  
→ See [lab/PLAN.md](lab/PLAN.md)

## Project Structure

```
clawlist/
├── lab/              Research & testing framework
│   ├── src/          TypeScript test framework (154 tests)
│   ├── scenarios/    Test scenarios & missions
│   ├── docs/         Lab-specific documentation
│   └── scripts/      Validation & test scripts
│
├── server/           Production server code
│   ├── src/          Server implementation
│   ├── tools/        CLI utilities
│   └── tests/        Server unit tests
│
└── docs/             Global documentation
    ├── VISION.md     Why agent commerce matters
    ├── architecture.md   System design
    └── ...           Deployment & research guides
```

## Status

**Lab:** Fully functional research framework with:
- 154 passing tests
- Security hardening (multi-layer defenses)
- Model comparison tools
- Performance metrics & analysis

**Server:** Experimental implementation - production deployment guide coming soon.

## License

MIT - See [LICENSE](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

---

*Last updated: 2026-02-08*
