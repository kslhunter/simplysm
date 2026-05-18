# @simplysm/sd-claude

Claude Code 셋업 자산(`.claude/` 의 sd-* 스킬·룰·훅) 배포 및 `sd-claude` CLI 제공 패키지.

코드 API 없음 (npm 배포용). 외부에서 import 할 수 있는 라이브러리 심볼은 노출하지 않는다.

- `bin`: `sd-claude` — `auth save` / `auth switch` (저장된 Claude 계정 전환).
- `postinstall`: 설치 시 사용자 `~/.claude/` 로 자산 동기화.
- `prepack`: 배포 전 `.claude/` → `packages/sd-claude/claude/` 증분 복사.
