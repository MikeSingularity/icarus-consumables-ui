#!/usr/bin/env bash
#
# Helper script to discover and list all active workflows.
# Satisfies the MANDATORY session initialization requirements.
#

set -e

for i in "${HOME}/.gemini/antigravity/global_workflows" \
         "${HOME}/.gemini/antigravity/skills" \
         ".agents/workflows" \
         ".agents/skills"; do

    echo "----"
    if [ -d "$i" ]; then
        tree -lL 5 "${i}"
        echo ""
    else
        echo "Directory $i does not exist, skipping."
    fi
done
