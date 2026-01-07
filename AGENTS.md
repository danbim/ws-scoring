## Development Workflow
- Bun executable is in `~/.bun/bin/bun`
- After every feature added, as well as before committing, run the following commands:
  - `bun test`: for running tests. Make sure they pass.
  - `bun format`: run code formatting
  - `bun check:fix`: use to check for linting errors and auto-fix the ones that are auto-fixable. fix the ones that are not.
  - `bun typecheck`: check for type errors and warnings and fix them if there are any.
  - Repeat these steps until all checks succeed without errors.
- If new database schemata are changed, update scripts in `scripts/db/` accordingly.