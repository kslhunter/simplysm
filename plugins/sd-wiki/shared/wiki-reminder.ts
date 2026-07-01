// 위키 읽기·반영 salience reminder(매 턴 주입) — Claude Code 훅(UserPromptSubmit)과
// Pi 확장이 공유한다. 세부 판단(진입 경로·담을지 여부·낙관락)은 세션 시작에 주입된
// wiki.md 규칙에 위임하고, 여기선 읽기/쓰기 두 행동만 짧게 상기시킨다.
export const WIKI_REMINDER = "[wiki] 아는 주제 → 읽기 · 새 지식 → 반영";
