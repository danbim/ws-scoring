# Claude Code Tool Configuration Design

**Date:** 2026-01-10
**Status:** Approved

## Problem Statement

Claude Code frequently "forgets" project-specific tool configurations, particularly:
- Using `node` instead of `bun` (causing command failures since node isn't installed)
- Using `terraform` instead of `tofu`
- Incorrect tool paths requiring manual correction
- Sub-agents not inheriting tool configuration

This results in:
- Failed commands requiring retry with correct paths
- Permission dialog back-and-forth
- Wasted time and API costs
- Frustrating development experience

## Solution: Three-Layer Configuration System

### 1. Environment Layer (`.claude/settings.json`)

**Purpose:** Provide technical configuration that sub-agents automatically inherit

**Contents:**
- `env.PATH` setting to include bun and homebrew paths
- `SessionStart` hook to persist environment across bash calls
- Pre-approved permissions for common tool patterns

**Key insight:** Sub-agents inherit `env` variables from parent settings automatically.

### 2. Documentation Layer (`CLAUDE.md`)

**Purpose:** Provide context and workflow guidance for all agents

**Contents:**
- Tool location documentation
- Common command reference
- Required workflow (pre-commit checklist)
- Explicit "For Claude Sub-Agents" section

**Key insight:** CLAUDE.md is loaded into context for main agent and visible to sub-agents.

### 3. Optional Modular Rules (`.claude/rules/`)

**Purpose:** Organize documentation as project grows

**Contents:**
- `tool-setup.md` - Tool paths and configuration
- `workflow.md` - Development workflow
- Additional domain-specific rules as needed

**Trade-off:** Adds complexity. Start with CLAUDE.md only, migrate if needed.

## Implementation Plan

### Phase 1: Create Shared Settings

**File:** `.claude/settings.json` (committed to git)

```json
{
  "env": {
    "PATH": "~/.bun/bin:/opt/homebrew/bin:$PATH"
  },
  "permissions": {
    "allow": [
      "Bash(bun:*)",
      "Bash(~/.bun/bin/bun:*)",
      "Bash(bunx:*)",
      "Bash(~/.bun/bin/bunx:*)",
      "Bash(tofu:*)",
      "Bash(/opt/homebrew/bin/tofu:*)",
      "Bash(git:*)",
      "Bash(docker:*)",
      "Edit",
      "Write",
      "Read"
    ]
  },
  "hooks": {
    "SessionStart": [{
      "matcher": "startup",
      "hooks": [{
        "type": "command",
        "command": "echo 'export PATH=$HOME/.bun/bin:/opt/homebrew/bin:$PATH' >> \"$CLAUDE_ENV_FILE\""
      }]
    }]
  }
}
```

### Phase 2: Create Project Documentation

**File:** `CLAUDE.md` (committed to git)

Contains:
- Tool configuration (bun, tofu locations)
- Development workflow (pre-commit checklist)
- Common commands reference
- Sub-agent guidance

### Phase 3: Migration

**Update:** `.claude/settings.local.json`
- Remove duplicates now in shared settings.json
- Keep only personal/machine-specific overrides

**Decision:** `AGENTS.md`
- Migrate content to CLAUDE.md, or
- Keep as human-focused reference (complementary to CLAUDE.md)

## Expected Outcomes

1. **Eliminated command failures:** PATH configuration ensures correct tools are found
2. **Reduced permission dialogs:** Pre-approved patterns cover common operations
3. **Sub-agent consistency:** Automatic inheritance of env vars and access to CLAUDE.md
4. **Team alignment:** Shared configuration in git ensures consistency
5. **Cost reduction:** Fewer failed attempts and retries

## Technical Details

### How Sub-Agent Inheritance Works

- **Automatic:** `env` variables from `settings.json`
- **Automatic:** Permission rules (with possible restrictions)
- **Automatic:** CLAUDE.md loaded into context
- **Not automatic:** Bash environment state (solved by SessionStart hook + CLAUDE_ENV_FILE)

### Precedence Order

1. `.claude/settings.local.json` (personal, not committed)
2. `.claude/settings.json` (project, committed)
3. `~/.config/claude/settings.json` (user-level)
4. Managed settings (Claude Code defaults)

More specific settings override broader ones.

## Success Criteria

- [ ] Main agent uses correct tool paths without manual correction
- [ ] Sub-agents use correct tool paths without manual correction
- [ ] Permission dialogs reduced by >80%
- [ ] Zero command failures due to wrong tool being used
- [ ] Team members can clone repo and have consistent tool behavior

## Future Enhancements

- Migrate to `.claude/rules/` if documentation grows beyond ~100 lines
- Add more tool-specific configuration as needed
- Consider MCP server for complex tool management
