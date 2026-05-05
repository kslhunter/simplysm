# API Index — @simplysm/sd-claude

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## CLI Commands

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `sd-claude auth save` | CLI command | [cli.md](./cli.md) | 현재 계정을 프로필에 저장할 때 |
| `sd-claude auth switch` | CLI command | [cli.md](./cli.md) | 저장된 계정 간 전환할 때 |

## Scripts

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `postinstall.mjs` | lifecycle script | [scripts.md](./scripts.md) | 에셋 설치 흐름을 파악할 때 |
| `sync.mjs` | lifecycle script | [scripts.md](./scripts.md) | prepack 동기화 동작을 파악할 때 |
| `forEachSdEntry()` | function | [scripts.md](./scripts.md) | `sd-*` 항목을 탐색할 때 |
| `collectSdEntries()` | function | [scripts.md](./scripts.md) | `sd-*` 항목 목록을 배열로 수집할 때 |

## Hooks

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `sd-check-bash.py` | PreToolUse hook | [hooks.md](./hooks.md) | 금지 명령어 차단 동작을 파악할 때 |
| `sd-check-write.py` | PreToolUse hook | [hooks.md](./hooks.md) | Write 도구의 사전 검증 동작을 파악할 때 |
| `sd-check-forbidden-files.py` | PreToolUse hook | [hooks.md](./hooks.md) | 보호 파일 수정 차단 동작을 파악할 때 |
| `sd-cache-read-hash.py` | PostToolUse hook | [hooks.md](./hooks.md) | Read 후 해시 캐싱 동작을 파악할 때 |
| `sd-subagent-start.sh` | SubagentStart hook | [hooks.md](./hooks.md) | subagent에 CLAUDE.md를 주입하는 동작을 파악할 때 |
| `sd-statusline.py` | statusLine hook | [hooks.md](./hooks.md) | 상태바 표시 내용과 캐시 구조를 파악할 때 |

## Assets

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `claude/skills/` | asset directory | [assets.md](./assets.md) | 배포되는 스킬 목록과 구조를 파악할 때 |
| `claude/rules/` | asset directory | [assets.md](./assets.md) | 규칙 파일 내용을 파악할 때 |
| `claude/references/` | asset directory | [assets.md](./assets.md) | 공유 참조 문서를 파악할 때 |
