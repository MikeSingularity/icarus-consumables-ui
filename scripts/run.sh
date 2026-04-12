#!/bin/bash
#
# NOTE: This script is hard-linked via the ai-project-configuration/_setup.sh script. 
# Edits to this file should be made in that location to ensure that edits are 
# intentionally applied to the project template and not just the test script.

set -e

if [ -x scripts/_local_run.sh ]; then
    echo "Running local override script..."
    exec scripts/_local_run.sh
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

if [ ! -d "${PROJECT_ROOT}/logs" ]; then
    mkdir -p "${PROJECT_ROOT}/logs"
fi
if [ -f "${PROJECT_ROOT}/logs/run.log" ]; then
    rm -f "${PROJECT_ROOT}/logs/run.log"
fi

# We look for a 'dev' script in package.json. If it exists, use it (common for Vite apps).
# Otherwise fallback to 'start' which is more common in standalone node backends.
if grep -q '"dev":' package.json; then
    pnpm run dev 2>&1 | tee "${PROJECT_ROOT}/logs/run.log"
else
    pnpm start 2>&1 | tee "${PROJECT_ROOT}/logs/run.log"
fi
