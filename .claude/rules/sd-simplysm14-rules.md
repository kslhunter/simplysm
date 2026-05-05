# 문서 설명

Claude 에이전트가 반드시 지켜야 할 행동 지침이다. (@simplysm/\* v14 포함시)

## CLAUDE.md 명령어 구성 참조

명령어 구성시 check, typecheck, lint 중 check 가 기본임을 표기

- `pnpm check --fix`이 **기본 검증 명령**이며, typecheck + lint 한꺼번에, 자동수정 포함
- `pnpm typecheck`, `pnpm lint`는 `pnpm check` 에서 문제 났을 때 타입만 따로 보기 위함
