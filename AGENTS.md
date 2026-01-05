## Development Workflow
- After every feature added, run the following quality checks:
  - Tests using `bun test`. Make sure they pass.
  - After that, run code formatting using `bun format`.
  - Use `bun check:fix` to check for linting errors and auto-fix the ones that are auto-fixable 
  - Check for linting errors using `bun lint` and fix them.
  - Check for type errors and warnings using `bun typecheck` and fix them.
  - Repeat these checks until all checks succeed without errors.
- If new database schemata are changed, update scripts in `scripts/db/` accordingly.