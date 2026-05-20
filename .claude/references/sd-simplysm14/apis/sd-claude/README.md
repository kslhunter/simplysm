# @simplysm/sd-claude

Claude Code 셋업 자산(`.claude/` 의 sd-* 스킬·룰·훅) 배포 및 `sd-claude` CLI 제공 패키지.

코드 API 없음 (npm 배포용). 외부에서 import 할 수 있는 라이브러리 심볼은 노출하지 않는다.

- `bin`: `sd-claude` — `auth save` (현재 Claude 계정 저장) / `auth switch` (저장된 계정 목록에서 선택해 전환).
- `postinstall`: 패키지 설치 시 `claude/` 의 sd-\* 에셋을 소비 프로젝트 루트의 `.claude/` 로 복사 (기존 sd-\* 항목은 정리 후 재복사, `settings.json`·`simplysm.json` 포함).
- `prepack`: 배포 전 워크스페이스의 `.claude/` → `packages/sd-claude/claude/` 증분 복사 (mtime+size 비교, `evals/`·`SKILL.eval.md`·`eval_*` 제외).
