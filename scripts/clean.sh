#!/usr/bin/env bash
#
# NOTE: This script is hard-linked via the ai-project-configuration/_setup.sh script. 
# Edits to this file should be made in that location to ensure that edits are 
# intentionally applied to the project template and not just the test script.

set -e

if [ -f scripts/_local_clean.sh ]; then
    echo "Running local override script..."
    exec scripts/_local_clean.sh
fi

if [ -d "temp" ]; then
    echo "Removing temp directory contents..."
    rm -rf temp/*
else
    echo "Temp directory does not exist. Creating temp directory..."
    mkdir temp
fi


# Additional TS-specific cleaning
echo "Cleaning logs, dist, build, and coverage directories..."
rm -rf logs/*
rm -rf dist/*
rm -rf build/*
rm -rf coverage/*

if [ "$(ls -A ./temp/ | wc -l)" -eq 0 ]; then
    echo "Temp folder is now empty."
else
    echo "Failed to clean temp folder. Current contents:"
    ls -la ./temp/
fi

echo "Cleanup complete successfully."
