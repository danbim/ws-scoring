# Development Configuration

This file documents project-specific tool configuration and workflow for human reference.

**For Claude Code configuration, see:**
- `CLAUDE.md` - Main project documentation and workflow (visible to all agents)
- `.claude/settings.json` - Environment variables and pre-approved permissions
- `.claude/settings.local.json` - Personal overrides (not committed to git)

## Quick Reference

### Tool Paths
- **bun** (instead of node): `~/.bun/bin/bun`
- **tofu** (instead of terraform): `/opt/homebrew/bin/tofu`

### Pre-commit Workflow
1. `bun test` - All tests must pass
2. `bun format` - Format code
3. `bun check:fix` - Lint and auto-fix
4. `bun typecheck` - Fix type errors

Repeat until all checks pass.

### Database Changes
If schemas are modified, update scripts in `scripts/db/` accordingly.
