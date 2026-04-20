# @simplysm/sd-claude

Claude Code 에셋을 소비 프로젝트의 `.claude/` 디렉토리에 자동 설치하는 패키지. 다수의 스킬(`sd-*` 접두어 포함), 2개 rules 파일, 참조 문서, 훅 스크립트를 포함한다. CLI(`sd-claude`)로 멀티 계정 전환 기능도 제공한다.

TypeScript 소스 없음. `scripts/`는 Node.js `.mjs` 스크립트이고, `claude/`는 배포 에셋 디렉토리다.

## Installation

```bash
npm install @simplysm/sd-claude
```

설치 시 `postinstall` 스크립트가 자동 실행되어, `claude/sd-*` 에셋과 `settings.json`을 프로젝트 루트 `.claude/`에 복사한다. `settings.json`은 훅이 미리 등록된 정적 파일이다.

## API Overview

### CLI Commands

| API | Type | Description |
|-----|------|-------------|
| `sd-claude auth save` | CLI command | 현재 Claude Code 계정의 Organization 이름과 refresh token을 `~/.claude/profiles.json`에 저장 |
| `sd-claude auth switch` | CLI command | 저장된 계정 목록을 표시하고 선택한 계정으로 전환 (TTY 필수) |

→ See [docs/cli.md](./docs/cli.md) for details.

### Scripts (Internal)

| API | Type | Description |
|-----|------|-------------|
| `postinstall.mjs` | lifecycle script | `pnpm install` 후 `claude/sd-*` 및 `settings.json`을 소비 프로젝트 `.claude/`에 복사 |
| `sync.mjs` | lifecycle script | `prepack` 시 루트 `.claude/sd-*` 에셋을 `claude/`로 동기화 |
| `forEachSdEntry(dir, callback)` | function | 디렉토리에서 `sd-*` 항목을 2단계 깊이로 탐색하며 콜백 호출 |
| `collectSdEntries(dir)` | function | `forEachSdEntry`로 수집한 `sd-*` 항목의 상대 경로 배열 반환 |

→ See [docs/scripts.md](./docs/scripts.md) for details.

### Hooks

| API | Type | Description |
|-----|------|-------------|
| `sd-subagent-start.sh` | SubagentStart hook | subagent 시작 시 `CLAUDE.md` 내용을 출력하여 subagent가 프로젝트 지침을 참조하도록 안내 |
| `sd-check-write.py` | PreToolUse hook (Write) | 기존 파일에 Write 도구 사용 시 차단하고 Edit 도구 사용을 안내 |
| `sd-check-bash.py` | PreToolUse hook (Bash) | 금지된 명령어 차단 (git stash/checkout/restore/reset/clean, cd, npx tsc, npx eslint) |
| `sd-check-forbidden-files.py` | PreToolUse hook (Write/Edit) | `tsconfig.json`, `eslint.config.ts` 등 보호 파일 수정 차단 |
| `sd-statusline.py` | statusLine hook | 상태바에 `폴더 | 모델 | 컨텍스트% | 5h사용량 | 7d사용량 | $추가요금` 표시 |

→ See [docs/hooks.md](./docs/hooks.md) for details.

### Asset Structure

| API | Type | Description |
|-----|------|-------------|
| `claude/skills/` | asset directory | 16개 sd-* 스킬 디렉토리 (각 스킬은 `SKILL.md` + 선택적 `SKILL.eval.md`와 `references/` 포함) |
| `claude/rules/` | asset directory | Claude Code 규칙 파일 (`sd-claude-rules.md`, `sd-options.md`) |
| `claude/references/` | asset directory | 스킬/규칙에서 참조하는 공유 문서 및 패키지 문서 디렉토리 |

→ See [docs/assets.md](./docs/assets.md) for details.

## Usage Examples

### 멀티 계정 관리

```bash
# 현재 계정을 저장
sd-claude auth save

# 저장된 계정 목록에서 선택하여 전환
sd-claude auth switch
```

### 소비 프로젝트에 설치

```bash
# pnpm install 시 자동으로 .claude/에 에셋 설치됨
pnpm add -D @simplysm/sd-claude

# 설치 후 .claude/ 디렉토리 구조:
# .claude/
#   rules/sd-claude-rules.md
#   skills/sd-commit/, sd-check/, ...
#   references/sd-*.md
#   sd-subagent-start.sh, sd-check-write.py, ...
#   settings.json  (훅 자동 등록)
```
