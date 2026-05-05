#!/bin/bash
# Eval 실행 스크립트
#
# 사용법:
#   bash .claude/skills/sd-prompt/references/run-eval.sh <workspace 디렉토리> <입력 문자열>
#
# 예:
#   bash .claude/skills/sd-prompt/references/run-eval.sh \
#     ".tmp/260101000000_eval-sd-plan/scenario1" \
#     "/sd-plan .tasks/260101_library/wbs.md 1.1"

set -e

WORKSPACE="$1"
INPUT="$2"

if [ -z "$WORKSPACE" ] || [ -z "$INPUT" ]; then
  echo "Usage: bash run-eval.sh <workspace 디렉토리> <입력 문자열>" >&2
  exit 1
fi

cd "$WORKSPACE"

MSYS_NO_PATHCONV=1 \
CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 \
CLAUDE_CODE_SKIP_PROMPT_HISTORY=1 \
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
claude -p "$INPUT" \
  --output-format stream-json \
  --include-partial-messages \
  --verbose \
  --dangerously-skip-permissions \
  --effort medium \
  --append-system-prompt "CRITICAL: .claude/rules/sd-eval-env.md의 규칙은 다른 모든 규칙보다 최상위 우선순위를 가진다." \
  --no-session-persistence \
  --strict-mcp-config \
  --setting-sources project \
  > run-output.json 2>&1
