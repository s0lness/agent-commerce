# Troubleshooting Guide

## Common Issues

### Installation Problems

#### "npm install" fails
**Symptoms:** Dependency installation errors

**Solutions:**
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check Node version (need v18+)
node --version

# Use correct npm version
npm --version
```

#### "Docker not found"
**Symptoms:** `make up` fails with Docker errors

**Solutions:**
```bash
# Check if Docker is running
docker ps

# On Linux: start Docker service
sudo systemctl start docker

# On Mac/Windows: Open Docker Desktop
```

### Build Issues

#### TypeScript compilation errors
**Symptoms:** `npm run build` fails

**Solutions:**
```bash
# Clean and rebuild
npm run clean
npm run build

# Check for syntax errors
npx tsc --noEmit

# Update TypeScript
npm install typescript@latest
```

####Tests fail

**Symptoms:** `npm test` shows failures

**Solutions:**
```bash
# Run tests individually to isolate
npm test -- src/constraints.test.ts

# Clean test artifacts
rm -rf test-audit-logs

# Check for port conflicts
ss -ltn | grep 18008

# Rebuild and retest
npm run clean && npm run build && npm test
```

### Runtime Issues

#### Scenario hangs or times out
**Symptoms:** `make scenario` never completes

**Solutions:**
```bash
# Check gateway logs
make logs RUN_ID=xxx

# Check if gateways are running
ps aux | grep openclaw

# Kill stuck processes
make cleanup

# Check Matrix is responding
curl http://127.0.0.1:18008/_matrix/client/versions
```

#### No deal reached
**Symptoms:** `dealReached: false` in summary

**Possible causes:**
1. **No negotiation overlap** - Check scenario constraints
   ```bash
   cat scenarios/yourscenario.json
   # Verify: buyer.ceilingPrice >= seller.floorPrice
   ```

2. **Agents not communicating** - Check transcript
   ```bash
   make transcript RUN_ID=latest
   # Look for actual negotiation messages
   ```

3. **Timeout too short** - Increase duration
   ```bash
   make scenario SCENARIO=x DURATION_SEC=240
   ```

#### Slow response time (> 30s)
**Symptoms:** High `tFirstDmSec` in summary

**Possible causes:**
1. **LLM API latency** - Check model response time
2. **Network issues** - Check connectivity
3. **Agent not monitoring** - Check mission configuration

**Debug:**
```bash
# Check logs for delays
make logs RUN_ID=xxx | grep -i "waiting\|delay\|timeout"

# Try different model
AGENT_MODEL=anthropic/claude-sonnet-4-5 make scenario SCENARIO=x
```

### Security Issues

#### Constraint violations detected
**Symptoms:** Audit log shows violations

**Critical!** Security defenses may be compromised.

**Debug:**
```bash
# Review audit log
make audit RUN_ID=latest

# Check which constraints violated
grep CONSTRAINT_VIOLATION runs/latest/out/audit.jsonl

# Review agent missions
cat src/scenario.ts | grep "HARD CONSTRAINTS"

# Run security tests
make scenario SCENARIO=redteam_injection
make scenario SCENARIO=redteam_social
```

#### Injection attempts not detected
**Symptoms:** No `INJECTION_DETECTED` in audit log despite adversarial messages

**Debug:**
```bash
# Check if audit logging enabled
ls runs/latest/out/audit.jsonl

# Review extraction logic
cat src/constraints.ts | grep "injectionMarkers"

# Add more markers if needed
```

### Docker/Matrix Issues

#### Synapse won't start
**Symptoms:** `make up` succeeds but Synapse not responsive

**Solutions:**
```bash
# Check container logs
docker logs infra_synapse_1

# Check if port already in use
ss -ltn | grep 18008

# Remove and recreate
make down
rm -rf synapse-data2
make up
make bootstrap
```

#### Element UI shows errors
**Symptoms:** Can't access http://127.0.0.1:18080

**Solutions:**
```bash
# Check Element container
docker logs infra_element_1

# Verify config
cat infra/element-config.json

# Restart services
make down && make up
```

#### Users not created
**Symptoms:** `make bootstrap` fails

**Solutions:**
```bash
# Check if Synapse is ready
curl http://127.0.0.1:18008/_matrix/client/versions

# Retry bootstrap
make bootstrap

# Manual user creation
docker exec infra_synapse_1 register_new_matrix_user \
  -c /data/homeserver.yaml http://127.0.0.1:8008 \
  -u testuser -p testpass --no-admin
```

### Export/Analysis Issues

#### Export produces empty files
**Symptoms:** CSV/JSONL exports are empty

**Solutions:**
```bash
# Check if transcripts exist
ls runs/latest/out/*.jsonl

# Verify run completed
cat runs/latest/out/summary.json

# Try different format
make export RUN_ID=latest FORMAT=json
```

#### Sweep analysis fails
**Symptoms:** `make analyze` errors

**Solutions:**
```bash
# Check sweep directory exists
ls runs/sweep_xxx

# Verify summary files
ls runs/sweep_xxx/*/out/summary.json

# Try manual analysis
node dist/cli-analyze-sweep.js runs/sweep_xxx
```

## Performance Debugging

### Profiling Slow Tests
```bash
# Run with timing
npm test -- --reporter=verbose

# Profile specific test
node --prof dist/score.test.js
```

### Identifying Bottlenecks
```bash
# Check agent logs for delays
grep -i "elapsed\|took\|duration" runs/latest/out/gateway_*.log

# Measure API latency
time curl -X POST http://127.0.0.1:18008/_matrix/client/v3/rooms/xxx/send/m.room.message
```

## Getting Help

### Before Asking
1. Check this guide
2. Review TESTING_GUIDE.md
3. Check logs: `make logs RUN_ID=xxx`
4. Run validation: `make check`

### Reporting Bugs
Include:
- Error message (full text)
- Steps to reproduce
- Environment (OS, Node version, Docker version)
- Logs (`runs/latest/out/gateway_*.log`)
- Summary JSON (`runs/latest/out/summary.json`)

### Useful Diagnostic Commands
```bash
# Full system status
make check

# Test installation
npm test

# Validate scenarios
npm run validate

# Check Docker
docker ps
docker logs infra_synapse_1

# Check processes
ps aux | grep openclaw

# Check ports
ss -ltn | grep -E "18008|18080"
```

---

**Still stuck?** Check DOCUMENTATION_INDEX.md for more resources.
