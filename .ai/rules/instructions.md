# AI Rules

This document defines context, workflows, and standards for development.

## 🛠 Python Coding Standards
- **Python**: PEP8 compliant, max line width **120 characters**.
- **Documentation**: **ALWAYS** use multi-line docstrings for all functions, classes, and methods, even for very short descriptions.
  ```python
  def example_function():
      """
      This function does a specific thing.
      """
      pass
  ```
- **Typing**: Use type hints. Prefer `dict`/`list` over `Dict`/`List` (Python 3.14+).
- **Design**: Use SOLID coding standards. Keep functions small and focused on a single responsibility.
- **Environment**: Use `uv` for dependency management; honor `pyproject.toml`.

## 🏗 Project Architecture
- `src/`: Modular source packages.
- `tests/`: Integrity and unit tests.
- `scripts/`: Utility scripts.
- `docs/`: Documentation.

## Verification & Development
- **ALWAYS** run `scripts/lint.sh` at the end of every implementation to execute linting and tests (MANDATORY).
- **ALWAYS** write completely isolated unit tests using `pytest` fixtures for new features in the same task. Mock external dependencies.
- **ALWAYS** stop and ask the user for clarification before writing code if requirements are vague or a design decision is needed.

## Critical Constraints
- **ALWAYS** use `pathlib.Path` for path manipulations instead of string concatenation.
- **ALWAYS** resolve current directories relative to the file using `Path(__file__).resolve().parent` instead of `os.getcwd()`.
- **ALWAYS** use absolute imports resolving from the project root instead of relative imports.
- **ALWAYS** use timezone-aware timestamps, specifically `datetime.now(timezone.utc)`.
- **ALWAYS** use the standard `logging` module for outputs in `src/`. Reserve `print()` strictly for `scripts/`.
- **ALWAYS** catch specific exceptions and log tracebacks instead of using bare `except` blocks.
- **ALWAYS** extract hardcoded constants, credentials, and configuration values into environment variables or dedicated configuration files.
- **ALWAYS** use professional, text-only formatting in code and documentation (no emojis/emoticons).

## JavaScript / TypeScript Standards

### Tooling
- **Package manager**: pnpm.
- **Formatter**: Prettier. Config in `.prettierrc` (single quotes, no semis, trailing commas, 2-space indent, 100 char width). Run via `pnpm exec prettier --write .`.
- **Linter**: ESLint. Run via `pnpm lint`. Config in `eslint.config.js`.
- **Tests**: Vitest. Run via `pnpm test` (to be added when test infrastructure is set up).
- **Lint script**: `scripts/lint.sh` runs `pnpm lint` then `pnpm build`.

### File & Module Conventions
- Component files: PascalCase (`ConsumableCard.tsx`).
- Hook files: camelCase with `use` prefix (`useConsumables.ts`).
- Utility files: camelCase (`formatEffects.ts`).
- All types: in `src/types/`.
- All data-transform logic: pure functions in `src/utils/` with corresponding Vitest tests.
- All React hooks: in `src/hooks/`.
- All components: in `src/components/`.
- Use absolute imports via the `@/` alias (maps to `src/`). No relative imports except within the same directory.
- No default exports except page-level route components.

### Code Style
- All functions, hooks, and components must have JSDoc comments (multi-line, even for short descriptions).
- Use TypeScript strict mode. No `any` types. Prefer explicit return types on exported functions.
- Handle loading and error states explicitly; do not silently swallow errors.
- All data fetching logic isolated in hooks; components do not call `fetch()` directly.
- No hardcoded URLs or magic strings outside of dedicated constants files.
