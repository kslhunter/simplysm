---
name: sd-auth
description: Claude Code 멀티 계정(Pro/Max)을 전환하는 스킬. "계정 전환", "auth switch", "계정 목록" 등을 요청할 때 사용한다.
user-invocable: true
argument-hint: "save | switch | list"
---

# sd-auth: Claude Code 계정 전환

## save / list

```bash
python "${CLAUDE_SKILL_DIR}/sd-auth.py" $ARGUMENTS
```

결과를 그대로 표시한다.

## switch

1. 계정 목록을 가져온다:

```bash
python "${CLAUDE_SKILL_DIR}/sd-auth.py" switch
```

2. 출력 마지막 줄 `__SELECTABLE__:` 뒤의 JSON 배열을 파싱하여 `AskUserQuestion` 선택지로 제시한다. 선택 가능 계정이 없으면 안내 후 종료.
3. 사용자가 선택하면:

```bash
python "${CLAUDE_SKILL_DIR}/sd-auth.py" switch {선택한 계정명}
```

4. 결과를 표시한다
