# sd-claude auth — 인증 전환 기능 설계

## 개요

Claude Code의 다중 계정 인증을 관리하는 `sd-claude auth` CLI 명령어 그룹.
현재 로그인된 계정을 저장하고, 저장된 계정 간 전환을 지원한다.

## 명령어

| 명령어 | 설명 |
|--------|------|
| `sd-claude auth add <name>` | 현재 로그인된 계정을 `<name>`으로 저장 |
| `sd-claude auth use <name>` | 저장된 `<name>` 계정으로 전환 |
| `sd-claude auth list` | 저장된 계정 목록 표시 (현재 활성 계정 표시 포함) |
| `sd-claude auth remove <name>` | 저장된 `<name>` 계정 삭제 |

## 파일 구조

```
packages/sd-claude/src/
  sd-claude.ts              ← auth 커맨드 그룹 등록
  commands/
    install.ts              ← 기존
    auth-add.ts
    auth-use.ts
    auth-list.ts
    auth-remove.ts
    auth-utils.ts           ← 공통 유틸리티
```

## 저장 포맷

```
~/.sd-claude/auth/
  <name>/
    auth.json          ← { oauthAccount, userID }
    credentials.json   ← ~/.claude/.credentials.json 복사본
```

### auth.json

```json
{
  "oauthAccount": {
    "accountUuid": "...",
    "emailAddress": "slkim@simplysm.net",
    "organizationUuid": "...",
    "organizationName": "SIMPLYSM",
    ...
  },
  "userID": "36fbd54ac638..."
}
```

`oauthAccount` 객체는 그대로 저장 (내부 필드 선별하지 않음).

### credentials.json

`~/.claude/.credentials.json` 전체를 그대로 복사/복원.

## 참조 경로

| 상수 | 경로 |
|------|------|
| `AUTH_DIR` | `~/.sd-claude/auth/` |
| `CLAUDE_JSON` | `~/.claude.json` |
| `CREDENTIALS_JSON` | `~/.claude/.credentials.json` |

- `CLAUDE_CONFIG_DIR` 환경변수는 무시, 항상 `~/.claude/` 고정.

## auth-utils.ts 공통 함수

```typescript
validateName(name: string): void
// /^[a-z0-9_-]+$/ 패턴 검증. 실패 시 에러 + exit

getProfileDir(name: string): string
// ~/.sd-claude/auth/<name>/ 경로 반환

readCurrentAuth(): { oauthAccount: object; userID: string }
// ~/.claude.json에서 추출. 없으면 에러 + exit

readCurrentCredentials(): object
// ~/.claude/.credentials.json 읽기

getCurrentUserID(): string | undefined
// 현재 ~/.claude.json의 userID 반환

listProfiles(): string[]
// 저장된 프로필 디렉터리 스캔

profileExists(name: string): boolean
// 프로필 존재 여부
```

## 명령어별 상세 동작

### auth add \<name\>

1. `validateName(name)`
2. `profileExists(name)` → true이면 에러 + exit
3. `readCurrentAuth()` → `{ oauthAccount, userID }` 추출 (없으면 에러)
4. `readCurrentCredentials()` → credentials 읽기
5. `~/.sd-claude/auth/<name>/` 디렉터리 생성
6. `auth.json` 저장, `credentials.json` 저장
7. 출력: `Saved profile 'slkim' (slkim@simplysm.net)`

### auth use \<name\>

1. `validateName(name)`
2. `profileExists(name)` → false이면 에러 + exit
3. 저장된 `auth.json`, `credentials.json` 읽기
4. 토큰 만료 확인 → 만료 시 경고 출력
5. `~/.claude.json` 읽기 → `oauthAccount`, `userID`만 교체 → 저장 (나머지 필드 보존)
6. `~/.claude/.credentials.json`을 저장된 `credentials.json`으로 교체
7. 출력: `Switched to slkim (slkim@simplysm.net)`

### auth list

1. `listProfiles()` → 프로필 목록
2. 비어있으면 `No saved profiles.` + exit
3. `getCurrentUserID()`로 현재 활성 userID 획득
4. 각 프로필의 `auth.json`, `credentials.json` 읽어서 출력:
   ```
   * slkim (slkim@simplysm.net) [SIMPLYSM] expires: 2025-06-25
     kslhunter (kslhunter@gmail.com) [Personal] expires: 2025-06-20
   ```

### auth remove \<name\>

1. `validateName(name)`
2. `profileExists(name)` → false이면 에러 + exit
3. 활성 계정이면 경고 출력
4. `~/.sd-claude/auth/<name>/` 디렉터리 삭제 (`fs.rmSync` recursive)
5. 출력: `Removed profile 'slkim'`

## name 유효성 규칙

- 패턴: `/^[a-z0-9_-]+$/`
- 허용: 영문 소문자, 숫자, 하이픈(`-`), 언더스코어(`_`)

## 에러 메시지

| 상황 | 메시지 |
|------|--------|
| name 패턴 불일치 | `Error: Invalid name '<name>'. Use only lowercase letters, numbers, hyphens, underscores.` |
| 미로그인 상태에서 add | `Error: Not logged in. Run /login first.` |
| 이미 존재하는 name에 add | `Error: Profile '<name>' already exists. Remove it first with: sd-claude auth remove <name>` |
| 없는 name에 use/remove | `Error: Profile '<name>' not found.` |
| 파일 읽기/파싱 실패 | `Error: Failed to read <filepath>` |
| 토큰 만료 (use 시 경고) | `Warning: Token expired. Run /login after switching.` |
| 활성 계정 삭제 (경고) | `Warning: '<name>' is currently active.` |

## 제약 조건

- `~/.claude.json` 전체 덮어쓰기 절대 금지 — `oauthAccount`, `userID`만 교체
- 외부 의존성 없음 — Node.js 내장 `fs`, `path`, `os`만 사용
- 모든 에러는 `console.error()` + `process.exit(1)`
- 경고는 `console.warn()` 후 계속 진행

## CLI 등록 (sd-claude.ts)

기존 `install` 커맨드와 병렬로 `auth` 커맨드 그룹 추가:

```typescript
.command("auth", "인증 계정 관리", (yargs) =>
  yargs
    .command("add <name>", "현재 로그인된 계정을 저장", ...)
    .command("use <name>", "저장된 계정으로 전환", ...)
    .command("list", "저장된 계정 목록 표시", ...)
    .command("remove <name>", "저장된 계정 삭제", ...)
    .demandCommand(1)
)
```
