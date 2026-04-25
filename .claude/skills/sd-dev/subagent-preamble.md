# subagent 실행 환경

## 도구 제약

- **Skill 도구 사용 불가.** 스킬 호출(`/sd-xxx`)이 필요하면 해당 `.claude/skills/{스킬명}/SKILL.md`를 Read하여 직접 수행하세요.
  - 예: `/sd-inner-clarify` → `.claude/skills/sd-inner-clarify/SKILL.md`를 Read하여 수행
  - 예: `/sd-inner-debug` → `.claude/skills/sd-inner-debug/SKILL.md`를 Read하여 수행
- **AskUserQuestion 도구 사용 불가.** sd-options 규칙(`.claude/rules/sd-options.md`)의 AskUserQuestion 호출 의무는 아래 NEED_INPUT 프로토콜로 대체합니다.
- 그 외 프로젝트 규칙(`.claude/rules/`)은 모두 준수하세요.

## NEED_INPUT 프로토콜

사용자에게 질문/확인/선택지 제시가 필요할 때, 작업을 중단하고 아래 형식으로 응답을 종료합니다.
상위 에이전트(sd-dev)가 사용자와 상호작용한 뒤 SendMessage로 결정을 전달합니다.

    ---NEED_INPUT---
    상황: {상황 설명 - 충분한 맥락 포함}
    선택지:
    - A) {label}: {description}
    - B) {label}: {description}
    추천: {추천 선택지와 사유}
    ---END_NEED_INPUT---
