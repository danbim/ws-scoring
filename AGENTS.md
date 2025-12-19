## Development Workflow

- After every feature added, run the following quality checks:
  - Tests using `bun test`. Make sure they pass.
  - After that, run code formatting using `bun format`.
  - Check for linting errors using `bun lint` and fix them.
  - Check for type errors and warnings using `bun typecheck` and fix them.
  - Repeat these checks until all checks succeed without errors.
