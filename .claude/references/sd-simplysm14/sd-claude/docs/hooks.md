# Hooks

`claude/` 디렉토리의 훅 스크립트. `postinstall`에 의해 `.claude/`에 설치되고, `settings.json`에 자동 등록되어 Claude Code 세션에서 실행된다.

## `sd-session-start.sh`

SessionStart 및 SubagentStart 훅. 세션 시작 시(startup, resume, clear, compact) `.claude/rules/*.md`와 `CLAUDE.md` 파일 경로를 출력하여 Claude가 읽도록 안내한다.

```bash
#!/bin/bash
echo "Read the following rule files before proceeding:"
# .claude/rules/*.md 파일 목록 출력
# CLAUDE.md 존재 시 경로 출력
```

등록 위치:
- `hooks.SessionStart` (matcher: `startup|resume|clear|compact`)
- `hooks.SubagentStart` (matcher 없음)

## `sd-check-write.py`

PreToolUse 훅 (matcher: `Write`). 기존 파일에 Write 도구를 사용하려 하면 차단하고 Edit 도구 사용을 안내한다.

```python
# stdin으로 tool_input JSON을 받아 file_path를 검사
# 파일이 이미 존재하면 stderr에 메시지 출력 후 exit(2)
```

입력: stdin JSON (`tool_input.file_path`)

| 조건 | 동작 |
|------|------|
| 파일이 이미 존재 | stderr에 안내 메시지 출력, exit code 2 (차단) |
| 파일이 존재하지 않음 | exit code 0 (허용) |

## `sd-check-bash.py`

PreToolUse 훅 (matcher: `Bash`). 금지된 명령어를 차단한다. 명령어 체인(`&&`, `||`, `;`)에서 각 명령어 위치를 인식한다.

```python
# stdin으로 tool_input JSON을 받아 command를 검사
# 금지 패턴에 매칭되면 stderr에 메시지 출력 후 exit(2)
```

입력: stdin JSON (`tool_input.command`)

차단 대상 명령어:

| 패턴 | 차단 대상 | 이유 |
|------|-----------|------|
| `git\s+stash` | `git stash` | 금지 git 명령어 |
| `git\s+checkout` | `git checkout` | 금지 git 명령어 |
| `git\s+restore` | `git restore` | 금지 git 명령어 |
| `git\s+reset` | `git reset` | 금지 git 명령어 |
| `git\s+clean` | `git clean` | 금지 git 명령어 |
| `cd\s+` | `cd` (디렉토리 이동) | hook 오류 방지 |
| `npx\s+tsc` | `npx tsc` | `pnpm typecheck` 사용 필수 |
| `npx\s+eslint` | `npx eslint` | `pnpm lint` 사용 필수 |

## `sd-check-forbidden-files.py`

PreToolUse 훅 (matcher: `Write|Edit`). `tsconfig.json`, `eslint.config.ts` 등 보호 대상 파일의 수정을 차단한다.

```python
# stdin으로 tool_input JSON을 받아 file_path를 검사
# 보호 대상 파일이면 stderr에 메시지 출력 후 exit(2)
```

입력: stdin JSON (`tool_input.file_path`)

차단 대상 파일:

| 파일명 | 이유 |
|--------|------|
| `tsconfig.json` | 빌드 설정 보호 |
| `eslint.config.ts` | 린트 설정 보호 |

## `sd-statusline.py`

statusLine 훅. Claude Code 상태바에 `폴더 | 모델 | 컨텍스트% | 5h사용량 | 7d사용량 | $추가요금` 형식으로 표시한다.

입력: stdin JSON (Claude Code가 제공하는 세션 정보)

### 입력 필드

| Field | Type | Description |
|-------|------|-------------|
| `workspace.current_dir` | `string` | 현재 작업 디렉토리 |
| `model.id` | `string` | 모델 ID (예: `claude-opus-4-6`) |
| `context_window.used_percentage` | `number` | 컨텍스트 윈도우 사용률 |
| `rate_limits.five_hour` | `object` | 5시간 사용량 (`used_percentage`, `resets_at`) |
| `rate_limits.seven_day` | `object` | 7일 사용량 (`used_percentage`, `resets_at`) |
| `version` | `string` | Claude Code 버전 |

### 추가 크레딧 사용량 (캐시)

`~/.claude/statusline-cache.json`에 API 응답을 캐싱한다 (180초 갱신 주기).

- OAuth 토큰으로 `https://api.anthropic.com/api/oauth/usage`를 호출하여 추가 크레딧 사용량을 조회한다
- 백그라운드 프로세스로 fetch를 비동기 실행한다 (파일 락 사용)
- Windows(`msvcrt`) / Unix(`fcntl`) 모두 지원

### 캐시 파일 구조

`~/.claude/statusline-cache.json`:

| Field | Type | Description |
|-------|------|-------------|
| `last_fetch_ts` | `number` | 마지막 API 호출 시각 (Unix timestamp) |
| `extra_usage.is_enabled` | `boolean` | 추가 크레딧 사용 활성화 여부 |
| `extra_usage.used_credits` | `number \| null` | 사용된 추가 크레딧 (센트 단위) |
| `rate_limits` | `object` | stdin에서 받은 rate_limits 원본 (auth.mjs에서 참조) |
| `error` | `string \| null` | 마지막 fetch 에러 메시지 |

### 내부 함수

| Function | Description |
|----------|-------------|
| `format_model(model_id)` | 모델 ID를 `Name X.Y` 형식으로 변환 (예: `claude-opus-4-6` → `Opus 4.6`) |
| `format_remaining(reset_epoch)` | 리셋까지 남은 시간을 `Xd Yh` / `Xh Ym` / `Xm` 형식으로 변환 |
| `format_rate_limit(rate_limit)` | rate limit을 `X%(남은시간)` 형식으로 변환 |
| `read_cache()` | 캐시 파일을 읽어 딕셔너리로 반환 |
| `should_fetch(cache)` | 캐시가 없거나 180초 이상 경과했으면 `True` |
| `try_spawn_fetch(version)` | 파일 락 획득 후 백그라운드 프로세스로 fetch 실행 |
| `do_fetch(version)` | API 호출 실행 (락 보호) |
| `write_cache_atomic(data)` | 임시 파일 → `os.replace`로 원자적 캐시 쓰기 |

### 명령행 인수

| 인수 | Description |
|------|-------------|
| (없음) | 기본 모드: stdin에서 세션 정보를 읽고 상태바 문자열 출력 |
| `--fetch <version>` | 백그라운드 fetch 모드: API를 호출하여 캐시 갱신 |
