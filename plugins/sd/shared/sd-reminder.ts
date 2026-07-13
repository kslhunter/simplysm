// sd 응답 규칙 salience reminder(매 턴 주입) — Claude Code 훅(UserPromptSubmit)과
// Pi 확장이 공유한다. 세부 규칙(역할·게이트·제안/보고·근거 기반 수행)은 세션 시작에
// 주입된 sd.md 에 위임하고, 여기선 가장 흐려지기 쉬운 핵심만 짧게 상기시킨다.
export const SD_REMINDER = "[sd] 첫 줄 대상·의도 · 근거 없이 확정 금지 · 제안은 하나씩";
