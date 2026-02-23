#!/bin/bash
# Bisection script for finding which test creates unwanted files/directories
# Usage: ./find-polluter.sh <file_or_dir_to_check> <test_pattern>
# Example: ./find-polluter.sh '.git' 'src/**/*.test.ts'

set -e

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <file_or_dir_to_check> <test_pattern>"
    echo "Example: $0 '.git' 'src/**/*.test.ts'"
    exit 1
fi

CHECK_PATH="$1"
TEST_PATTERN="$2"

# Find all test files matching pattern
readarray -t TEST_FILES < <(find . -path "$TEST_PATTERN" -type f)

if [ ${#TEST_FILES[@]} -eq 0 ]; then
    echo "No test files found matching pattern: $TEST_PATTERN"
    exit 1
fi

echo "Found ${#TEST_FILES[@]} test files"
echo "Checking for pollution: $CHECK_PATH"
echo ""

for test_file in "${TEST_FILES[@]}"; do
    # Skip if pollution already exists
    if [ -e "$CHECK_PATH" ]; then
        echo "⚠️  Pollution already exists, skipping to avoid false positive"
        echo "   Please remove $CHECK_PATH and re-run"
        exit 1
    fi

    echo "Testing: $test_file"

    # Run the test
    npm test "$test_file" > /dev/null 2>&1 || true

    # Check if pollution appeared
    if [ -e "$CHECK_PATH" ]; then
        echo ""
        echo "🔴 FOUND POLLUTER: $test_file"
        echo ""
        echo "This test created: $CHECK_PATH"
        ls -la "$CHECK_PATH" 2>/dev/null || echo "(path exists but can't stat)"
        echo ""
        echo "Investigate with:"
        echo "  npm test '$test_file' -- --reporter=verbose"
        echo "  git diff"
        exit 0
    fi
done

echo ""
echo "✅ No polluter found - all ${#TEST_FILES[@]} tests are clean"
