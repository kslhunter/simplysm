# 도구 사용 (Codex 전용 보강)

상위 행동 규칙 "도구 사용" 을 Codex 도구에 맞게 보강 (호스트별 주입 — Codex 세션에만 주입됨).

## 도구 선택

- 파일 검색은 우선 `rg` 를 사용하고, 파일 읽기는 제공된 파일 읽기 도구가 있을 때 그 도구를 우선 사용함. 파일 읽기 전용 도구가 없는 Codex 환경에서는 셸의 단순 읽기 명령을 사용함.
- **서브에이전트 보수적 사용**: 평소엔 직접 읽기·검색으로 처리하고, 서브에이전트는 단계지침에 명시됐거나 사용자가 명시적으로 지시할 때만 — 서브에이전트의 요약 return 은 원분석에서 정보가 누락됨.

## Codex 플러그인 작업

- Codex 플러그인 로컬 개발 중 `.codex-plugin/plugin.json` 의 `version`/cachebuster 변경이나 `codex plugin add` 재설치를 기본 갱신 수단으로 쓰지 않음. 실행 중인 다른 Codex 세션이 시작 시점 캐시 경로의 훅을 계속 참조해 `PreToolUse hook failed` 가 날 수 있음.
- 플러그인 재설치나 cachebuster 가 불가피하면 먼저 사용자에게 실행 중 세션 훅이 깨질 수 있음을 알리고 명시 확인을 받음. 기존 캐시 버전 디렉터리는 세션들이 모두 닫히기 전 삭제하지 않음.
- `hooks/hooks-codex.json` 의 command 는 Windows 에서 `${...}` 같은 POSIX 변수 확장에 기대지 않음. `%PLUGIN_ROOT%` 를 써서 실제 훅 스크립트를 `python` 으로 직접 실행.
- Codex 플러그인·훅 구조를 다룰 때는 위키에서 `codex-cli-plugin-hooks` 페이지를 먼저 `read` 로 확인.
