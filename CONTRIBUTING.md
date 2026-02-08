# Contributing Guide

## Quick Start

1. **Fork and clone**
   ```bash
   git clone <your-fork-url>
   cd clawlist-matrix-run
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify setup**
   ```bash
   make check
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes**
   - Edit TypeScript files in `src/`
   - Add tests in `src/*.test.ts`
   - Update documentation as needed

3. **Build and test**
   ```bash
   npm run build
   npm test
   ```

4. **Validate**
   ```bash
   npm run validate  # Check scenarios
   make check        # Full validation
   ```

5. **Commit**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

### Commit Message Format

Use conventional commits:

- `feat: add new feature`
- `fix: bug fix`
- `docs: documentation changes`
- `test: add or update tests`
- `refactor: code refactoring`
- `chore: maintenance tasks`

### Pull Request Checklist

- [ ] All tests pass (`npm test`)
- [ ] New code has tests
- [ ] Documentation updated
- [ ] Scenarios validate (`npm run validate`)
- [ ] TypeScript builds without errors
- [ ] Commit messages follow convention

## Project Structure

```
src/
  *.ts          - Source code
  *.test.ts     - Unit tests
  cli-*.ts      - CLI tools
scenarios/
  *.json        - Test scenarios
docs/
  *.md          - Technical documentation
scripts/
  *.sh          - Helper scripts
```

## Testing Guidelines

### Unit Tests

- Place tests next to source: `foo.ts` → `foo.test.ts`
- Use descriptive test names
- Test edge cases
- Mock external dependencies

Example:
```typescript
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('should handle valid input', () => {
    expect(myFunction(42)).toBe(84);
  });

  it('should reject invalid input', () => {
    expect(() => myFunction(-1)).toThrow();
  });
});
```

### Integration Tests

- Test end-to-end workflows
- Use temporary directories for file I/O
- Clean up after tests

### Scenario Tests

- Add new scenarios to `scenarios/`
- Validate before committing: `npm run validate`
- Document expected behavior in scenario notes

## Documentation

### Code Documentation

- Add JSDoc comments for public functions
- Explain "why" not "what" in comments
- Keep comments concise

### Markdown Documentation

- Update relevant .md files when changing features
- Follow existing style and structure
- Add examples for complex features

## Security

### Reporting Issues

- **DO NOT** open public issues for security vulnerabilities
- Email maintainers privately
- Provide reproduction steps

### Security Guidelines

- Never commit secrets or tokens
- Test security features with red team scenarios
- Add audit logging for sensitive operations
- Document security assumptions

## Performance

### Benchmarking

- Run sweeps before/after changes: `make sweep SCENARIO=x N=10`
- Compare metrics: `make performance DIR=runs/sweep_xxx`
- Document significant performance changes

### Optimization Guidelines

- Profile before optimizing
- Measure impact of changes
- Don't sacrifice readability for micro-optimizations

## Release Process

1. Update CHANGELOG.md
2. Update version in package.json
3. Run full validation suite
4. Tag release: `git tag v1.x.x`
5. Push: `git push --tags`

## Questions?

- Check existing documentation (DOCUMENTATION_INDEX.md)
- Review similar code in the project
- Ask in issues or discussions

## Code of Conduct

- Be respectful and professional
- Focus on constructive feedback
- Help others learn and grow
- Assume good intentions

---

Thank you for contributing!
