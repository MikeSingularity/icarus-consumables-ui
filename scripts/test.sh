#!/bin/bash
#
# NOTE: This script is hard-linked via the ai-project-configuration/_setup.sh script. 
# Edits to this file should be made in that location to ensure that edits are 
# intentionally applied to the project template and not just the test script.

set -e

if [ -x scripts/_local_test.sh ]; then
    echo "Running local override script..."
    exec scripts/_local_test.sh
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

# 1. Gather Metadata
CURRENT_DATE=$(date +"%Y-%m-%d %H:%M:%S")
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "not-a-git-repo")
REPORT_FILE="${PROJECT_ROOT}/coverage.md"
TEST_LOG="${PROJECT_ROOT}/logs/test.log"

echo "Running tests and generating coverage..."

if [ ! -d "${PROJECT_ROOT}/logs" ]; then
    mkdir -p "${PROJECT_ROOT}/logs"
fi

# Define vitest arguments
# We use json-summary to generate a parseable file for our markdown report
ARGS=(--coverage.enabled --coverage.reporter=json-summary --coverage.reporter=text --coverage.reportsDirectory="${PROJECT_ROOT}/temp/coverage" --passWithNoTests)
GENERATE_REPORT=false

if [ -n "$1" ]; then
    if [ "$1" == "--pre-commit" ]; then
        echo "Running pre-commit tests with coverage report in terminal..."
        ARGS+=(--run)
    else
        echo "Running only selected tests without coverage via additional arguments: $@"
        ARGS=("$@")
        if [ -e "${REPORT_FILE}" ]; then
            rm -f "${REPORT_FILE}"
        fi
    fi
else
    echo "Running full test suite with coverage report generation..."
    ARGS+=(--run)
    # Note: Vitest output for coverage will be generated based on package.json/vite.config metrics
    # Ensure package.json/vite config maps coverage reporter to 'html', 'json', or 'text-summary'
    GENERATE_REPORT=true
fi

# 2. Run tests 
set +e
pnpm exec vitest "${ARGS[@]}" 2>&1 | tee "${TEST_LOG}"
TEST_EXIT_CODE=${PIPESTATUS[0]}
set -e

if [ $TEST_EXIT_CODE -eq 0 ] && [ -x "scripts/verify.sh" ]; then
    echo "Running verification script..."
    scripts/verify.sh
fi

# 3. Create final report with custom Header
if [ $GENERATE_REPORT = true ]; then
    cat << EOF > $REPORT_FILE
# Test Coverage Report

- **Date:** $CURRENT_DATE
- **Branch:** \`$CURRENT_BRANCH\`
- **Status:** $( [ $TEST_EXIT_CODE -eq 0 ] && echo "PASS" || echo "FAIL" )

$(node -e "
const fs = require('fs');
const summaryPath = '${PROJECT_ROOT}/temp/coverage/coverage-summary.json';
if (!fs.existsSync(summaryPath)) {
  process.exit(0);
}
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const files = Object.keys(summary).filter(k => k !== 'total');

let table = '| File | % Stmts | % Branch | % Funcs | % Lines |\\n';
table += '| :--- | :---: | :---: | :---: | :---: |\\n';

function formatRow(name, data) {
  return '| ' + name + ' | ' + data.statements.pct + ' | ' + data.branches.pct + ' | ' + data.functions.pct + ' | ' + data.lines.pct + ' |';
}

table += formatRow('**All files**', summary.total) + '\\n';
files.forEach(f => {
  const shortName = f.replace('${PROJECT_ROOT}/', '');
  table += formatRow(shortName, summary[f]) + '\\n';
});
console.log(table);
" 2>/dev/null || echo "No coverage data generated.")

Please see terminal output or \`logs/test.log\` for detailed coverage metrics, or review the generated HTML metrics in the \`coverage/\` directory.
EOF
    echo "Coverage REPORT_LOCATION: ${REPORT_FILE}"
fi

if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo "Tests failed with exit code $TEST_EXIT_CODE. Check ${TEST_LOG} for details."
else
    echo "Completed successfully at $(date)" | tee -a "${TEST_LOG}"
fi
exit $TEST_EXIT_CODE
