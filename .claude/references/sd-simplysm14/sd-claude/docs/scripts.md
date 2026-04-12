# Scripts (Internal)

`scripts/` 디렉토리의 Node.js `.mjs` 스크립트. CLI와 라이프사이클 훅으로 사용된다.

## `postinstall.mjs`

`pnpm install` 후 자동 실행되는 라이프사이클 스크립트. `claude/` 디렉토리의 에셋을 소비 프로젝트의 `.claude/`에 설치하고 `settings.json`에 훅을 등록한다.

전체 try-catch로 감싸서 실패해도 `pnpm install`을 차단하지 않는다.

### 설치 흐름

1. **프로젝트 루트 감지**: `INIT_CWD` 환경변수 → `node_modules` 경로에서 추출 → `process.cwd()` 순서로 탐색
2. **자기 자신 설치 방지**: simplysm 모노레포에서 동일 메이저 버전이면 건너뜀
3. **소스 디렉토리 확인**: `claude/` 디렉토리가 없으면 건너뜀
4. **cleanSdEntries**: 기존 `.claude/` 내 `sd-*` 항목 삭제
5. **copySdEntries**: `claude/` → `.claude/` 복사
6. **setupSettings**: `.claude/settings.json`에 훅 등록

### setupSettings 훅 등록

`settings.json`에 아래 훅을 멱등적으로 등록한다. 기존 항목이 있으면 덮어쓰고, 없으면 추가한다.

| Hook Type | Matcher | Command | Description |
|-----------|---------|---------|-------------|
| `SessionStart` | `startup\|resume\|clear\|compact` | `bash .claude/sd-session-start.sh` | 세션 시작 시 규칙 파일 경로 출력 |
| `PreToolUse` | `Write` | `python .claude/sd-check-write.py` | 기존 파일 Write 차단 |
| `PreToolUse` | `Bash` | `python .claude/sd-check-bash.py` | 금지 명령어 차단 (git, cd, npx tsc/eslint) |
| `SubagentStart` | (없음) | `bash .claude/sd-session-start.sh` | 서브에이전트 시작 시 규칙 파일 경로 출력 |
| `statusLine` | — | `python .claude/sd-statusline.py` | 상태바 표시 |

마이그레이션: 루트 레벨에 잘못 위치한 `SessionStart` 키를 `hooks.SessionStart`로 이동한다.

### 내부 함수

#### `findProjectRoot(dirname)`

```javascript
function findProjectRoot(dirname) → string | undefined
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dirname` | `string` | 현재 스크립트 디렉토리 경로 |

반환: `INIT_CWD` → `node_modules` 경로 → `process.cwd()` 순서로 프로젝트 루트 경로

#### `isSimplysmMonorepoSameMajor(projectRoot, pkgRoot)`

```javascript
function isSimplysmMonorepoSameMajor(projectRoot, pkgRoot) → boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectRoot` | `string` | 프로젝트 루트 경로 |
| `pkgRoot` | `string` | sd-claude 패키지 루트 경로 |

반환: simplysm 모노레포이고 동일 메이저 버전이면 `true`

#### `cleanSdEntries(targetDir)`

```javascript
function cleanSdEntries(targetDir) → void
```

대상 디렉토리의 기존 `sd-*` 항목을 재귀적으로 삭제한다.

#### `copySdEntries(sourceDir, targetDir, entries)`

```javascript
function copySdEntries(sourceDir, targetDir, entries) → void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sourceDir` | `string` | 소스 디렉토리 (`claude/`) |
| `targetDir` | `string` | 대상 디렉토리 (`.claude/`) |
| `entries` | `string[]` | 복사할 항목의 상대 경로 배열 |

#### `setupSettings(targetDir)`

```javascript
function setupSettings(targetDir) → void
```

`.claude/settings.json`에 훅 항목을 멱등적으로 등록한다.

---

## `sync.mjs`

`prepack` 라이프사이클 스크립트. `npm publish`/`npm pack` 전에 실행되어 루트 `.claude/`의 `sd-*` 에셋을 `packages/sd-claude/claude/`로 복사한다.

소스 오브 트루스는 루트 `.claude/`이고, `claude/`는 배포용 스냅샷이다.

동작:
1. 기존 `claude/` 디렉토리 삭제
2. 루트 `.claude/`에서 `sd-*` 항목을 수집
3. 수집된 항목을 `claude/`로 복사

---

## `sd-entries.mjs`

`sd-*` 접두어를 가진 파일/디렉토리를 탐색하는 유틸리티. `postinstall.mjs`와 `sync.mjs`에서 사용한다.

### `forEachSdEntry(dir, callback)`

```javascript
export function forEachSdEntry(dir, callback) → void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dir` | `string` | 탐색할 베이스 디렉토리 |
| `callback` | `(relativePath: string) => void` | 각 `sd-*` 항목의 상대 경로로 호출되는 콜백 |

탐색 깊이는 2단계 고정:
- 루트 레벨의 `sd-*` 항목 (예: `sd-session-start.sh`)
- 하위 디렉토리 내 `sd-*` 항목 (예: `skills/sd-commit`)

### `collectSdEntries(dir)`

```javascript
export function collectSdEntries(dir) → string[]
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `dir` | `string` | 탐색할 베이스 디렉토리 |

반환: `forEachSdEntry`로 수집한 모든 `sd-*` 항목의 상대 경로 배열
