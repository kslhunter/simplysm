// sd 응답 규칙 salience reminder(매 턴 주입) — Claude Code 훅(UserPromptSubmit)과
// Pi 확장이 공유한다. 세부 규칙(역할·게이트·제안/보고·근거 기반 수행)은 세션 시작에
// 주입된 sd.md 에 위임하고, 여기선 가장 흐려지기 쉬운 핵심만 짧게 상기시킨다.
export const SD_REMINDER =
  " [sd] 근거 조사 선행(기억·추측 금지—조회 확인) + 제안 한 사안씩 + 완결 전엔 제안만·보고는 최종 1회 + 응답은 핵심만 최소분량";
