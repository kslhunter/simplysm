# Claude Code Rules

## Language

Respond in the **system's configured language** (set via Claude Code's language setting).

- Technical terms, code identifiers (variable names, function names, etc.), and library names should remain as-is
- Show English error messages and logs in their original form, but provide explanations in the system language

## Missing References

참조 파일이나 문서를 찾지 못하면 **즉시 멈추고 사용자에게 올바른 경로를 물어야 한다.**

- 혼자 판단해서 생략하거나 다른 방식으로 진행하지 말 것
- "파일을 찾을 수 없으므로 건너뛰겠습니다" 같은 자의적 판단 금지
- 반드시 사용자에게 확인 후 진행

## Bug Workarounds

### AskUserQuestion UI Clipping

Before calling `AskUserQuestion`, output **2 blank lines** (`\n\n`) so the preceding text is not clipped in the UI.
