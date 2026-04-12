#!/usr/bin/env bash
#
# Local lint override for Vite/React project structure.
# This prevents the global NodeNext config from breaking frontend paths and JSX.

set -e
set -o pipefail

# Ensure we are in the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LINT_LOG="${PROJECT_ROOT}/logs/lint.log"

if [ ! -d "${PROJECT_ROOT}/logs" ]; then
    mkdir -p "${PROJECT_ROOT}/logs"
fi

echo "Running Prettier Formatter..." | tee -a "${LINT_LOG}"
pnpm exec prettier --write . 2>&1 | tee -a "${LINT_LOG}"

echo "Running ESLint (auto-fix)..." | tee -a "${LINT_LOG}"
pnpm exec eslint --config .eslint.config.js --fix . 2>&1 | tee -a "${LINT_LOG}"

echo "Running TypeScript Compiler (Vite App Config)..." | tee -a "${LINT_LOG}"
# Use the project-specific tsconfig to preserve path aliases and JSX
pnpm exec tsc -p tsconfig.app.json --noEmit 2>&1 | tee -a "${LINT_LOG}"

echo "Completed local linting successfully at $(date)" | tee -a "${LINT_LOG}"
