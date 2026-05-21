# @simplysm/sd-claude

Claude Code 셋업 자산(`.claude/` 의 sd-* 스킬·룰·훅) 배포 및 `sd-claude` CLI 제공 패키지. 코드 API 없음 — 외부 import 가능한 라이브러리 심볼 미노출.

## 사용 트리거 인덱스

- 현재 로그인된 Claude 계정을 프로필로 저장 → [auth save](#cli-sd-claude)
- 저장된 다른 Claude 계정으로 전환 → [auth switch](#cli-sd-claude)
- 소비 프로젝트 설치 시 `.claude/` 자산 자동 배치 → [postinstall](#패키지-훅)
- 워크스페이스 `.claude/` 변경분을 패키지 `claude/` 로 동기화(배포 직전) → [prepack / sync](#패키지-훅)

## CLI `sd-claude`

`bin: sd-claude` → `scripts/cli.mjs`. 사용법: `sd-claude <subcommand> <action>`.

- `auth save`: 현재 `claude auth status` 의 `orgName` 을 프로필 키로, `~/.claude/.credentials.json` 의 `claudeAiOauth.refreshToken` 과 `~/.claude/statusline-cache.json` 의 사용량 스냅샷을 `~/.claude/profiles.json` 에 저장하고 `current` 를 해당 프로필로 설정. orgName 또는 refreshToken 미획득 시 stderr 출력 후 exit 1.
- `auth switch`: `profiles.json` 의 계정 목록을 번호 + 현재 마커(`*`) + 사용량(현재 계정은 live, 그 외는 저장 시점) 으로 출력. 번호 입력으로 대상 선택 → 현재 계정의 최신 refreshToken·사용량을 백업 저장 → `CLAUDE_CODE_OAUTH_REFRESH_TOKEN`/`CLAUDE_CODE_OAUTH_SCOPES` 환경변수로 `claude auth login` 을 spawn → 갱신된 refreshToken 저장 + `current` 업데이트. TTY 아니면 exit 1.
- 그 외 인자: 사용법 출력 후 exit 1.

저장 위치 식별자 풀이:
- `~/.claude/profiles.json`: `{ current: string, accounts: { [orgName]: { refreshToken, usage } } }` 구조. 패키지가 관리.
- `~/.claude/.credentials.json`: Claude Code 본체가 관리. `claudeAiOauth.refreshToken` 만 읽음.
- `~/.claude/statusline-cache.json`: Claude Code 본체가 관리. `rate_limits.five_hour` / `seven_day` 의 `used_percentage` + `resets_at` 만 읽음.

## 패키지 훅

- `postinstall` (`scripts/postinstall.mjs`): 소비 프로젝트의 `node_modules` 설치 시 자동 실행. `INIT_CWD` 또는 `node_modules` 경로 역추적으로 프로젝트 루트 결정 → `<projectRoot>/.claude/` 의 기존 sd-* 항목(root 1단계 + 하위 디렉토리 1단계의 `^sd[-_]` 매칭) 정리 후 패키지 `claude/` 의 동일 항목 + `settings.json` + `simplysm.json` 을 복사. 소비 프로젝트가 `name: "simplysm"` 이고 메이저 버전이 같으면 skip(모노레포 자기 자신 보호). 실패해도 throw 하지 않음(install 차단 방지).
- `prepack` (`scripts/sync.mjs`): `pnpm pub`/`npm pack` 직전 실행. 워크스페이스 루트(`../../`)의 `.claude/` 에서 sd-* 항목(+ `settings.json`/`simplysm.json`) 을 패키지 `claude/` 로 증분 복사. 동일 파일은 mtime+size 비교로 skip, 변경분은 unlink 후 copy + src mtime 보존, src 에 없는 dest 항목은 prune. 제외: `evals/` 하위, 파일명 `SKILL.eval.md`, `eval_*` 접두 파일. (Windows EPERM 회피 위해 일괄 rmSync 미사용.)

식별자 풀이:
- sd-* 항목 스캔 범위: 디렉토리 root + 1단계 하위. 정규식 `^sd[-_]`. 즉 `.claude/skills/sd-foo/`, `.claude/rules/sd-bar.md`, `.claude/sd-baz/` 등 매칭.
- watch 훅 연동: 모노레포에서는 `sd.config.ts` 의 `scripts` 타겟이 `.claude/sd-*` 변경 감지 시 본 `sync.mjs` 를 호출(패키지 외부 설정).
