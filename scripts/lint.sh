#!/usr/bin/env bash
#
# NOTE: This script is hard-linked via the ai-project-configuration/_setup.sh script. 
# Edits to this file should be made in that location to ensure that edits are 
# intentionally applied to the project template and not just the test script.

set -e
set -o pipefail

if [ -x scripts/_local_lint.sh ]; then
    echo "Running local override script..."
    exec scripts/_local_lint.sh "$@"
fi

get_project_root() {
    local dir="$1"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.git" ]]; then
            echo "$dir"
            return
        fi
        dir="$(dirname "$dir")"
    done
    echo "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
}

PROJECT_ROOT="${PROJECT_ROOT:-${VSCODE_CWD:-$(get_project_root "$PWD")}}"

source "${PROJECT_ROOT}/../.ai_config_root.sh"

export SOURCE_ESLINT_CONFIG="${AI_CONFIG_ROOT}/languages/typescript/.eslint.config.js"
export LOCAL_ESLINT_CONFIG="${PROJECT_ROOT}/.eslint.config.js"
if [ -f "$SOURCE_ESLINT_CONFIG" ]; then
    cp -a "$SOURCE_ESLINT_CONFIG" "$LOCAL_ESLINT_CONFIG"
fi

export SOURCE_PRETTIER_CONFIG="${AI_CONFIG_ROOT}/languages/typescript/.prettierrc"
export LOCAL_PRETTIER_CONFIG="${PROJECT_ROOT}/.prettierrc"
if [ -f "$SOURCE_PRETTIER_CONFIG" ]; then
    cp -a "$SOURCE_PRETTIER_CONFIG" "$LOCAL_PRETTIER_CONFIG"
fi

export SOURCE_TS_CONFIG="${AI_CONFIG_ROOT}/languages/typescript/.tsconfig.json"
export LOCAL_TS_CONFIG="${PROJECT_ROOT}/.tsconfig.json"
if [ -f "$SOURCE_TS_CONFIG" ]; then
    cp -a "$SOURCE_TS_CONFIG" "$LOCAL_TS_CONFIG"
fi

if [ ! -d "${PROJECT_ROOT}/logs" ]; then
    mkdir -p "${PROJECT_ROOT}/logs"
fi
LINT_LOG="${PROJECT_ROOT}/logs/lint.log"
if [ -f "${LINT_LOG}" ]; then
    echo "Clearing existing lint log at ${LINT_LOG}" 
    rm -f "${LINT_LOG}"
fi

echo "Running Prettier Formatter..." | tee -a "${LINT_LOG}"
pnpm exec prettier --write . 2>&1 | tee -a "${LINT_LOG}"

echo "Running ESLint (auto-fix)..." | tee -a "${LINT_LOG}"
pnpm exec eslint --config .eslint.config.js --fix . 2>&1 | tee -a "${LINT_LOG}"

echo "Running TypeScript Compiler (Type Verification)..." | tee -a "${LINT_LOG}"
pnpm exec tsc -p .tsconfig.json --noEmit 2>&1 | tee -a "${LINT_LOG}"

echo "Completed successfully at $(date)" | tee -a "${LINT_LOG}"
