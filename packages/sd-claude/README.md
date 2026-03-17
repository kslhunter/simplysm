# @simplysm/sd-claude

Claude Code용 `.claude/` 디렉토리 에셋(rules, skills, hooks) 설치/동기화 도구.

`pnpm install` 시 `postinstall` 훅으로 자동 실행되어 프로젝트에 Simplysm Claude Code 환경을 구성한다.

## 설치

```bash
npm install @simplysm/sd-claude
# 또는
pnpm add @simplysm/sd-claude
```

설치 시 `postinstall` 훅이 자동으로 `.claude/` 에셋을 프로젝트에 복사한다.

## CLI

```bash
# 수동으로 에셋 설치 실행
npx sd-claude postinstall
# 또는
pnpm sd-claude postinstall
```

**지원 명령어:**

| 명령어 | 설명 |
|---|---|
| `postinstall` | `.claude/` 디렉토리에 `sd-*` 에셋을 설치하고 `settings.json`을 구성 |

## 동작 방식

### postinstall -- 에셋 설치

`pnpm install` 시 자동으로 실행된다. 실패해도 `pnpm install`을 차단하지 않는다.

**실행 흐름:**

1. 프로젝트 루트를 탐색한다 (`INIT_CWD` > `node_modules` 경로 역추적 > `cwd()`)
2. simplysm 모노레포에서 동일 major 버전이면 스킵한다 (소스를 직접 사용)
3. 패키지의 `claude/` 디렉토리에서 `sd-*` 에셋을 수집한다
4. 프로젝트 `.claude/` 내 기존 `sd-*` 항목을 삭제한 뒤 새로 복사한다
5. `.claude/settings.json`에 statusLine과 SessionStart 훅을 설정한다

**프로젝트 루트 탐색 우선순위:**

```
INIT_CWD 환경변수 → node_modules 경로에서 역추적 → process.cwd()
```

**settings.json 자동 설정 내용:**

```jsonc
{
  // statusLine: 항상 덮어쓰기
  "statusLine": {
    "type": "command",
    "command": "python .claude/sd-statusline.py"
  },
  // SessionStart: sd-session-start 훅이 없으면 추가, 있으면 갱신
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume|clear|compact",
        "hooks": [{ "type": "command", "command": "bash .claude/sd-session-start.sh" }]
      }
    ]
  }
}
```

기존에 루트 레벨 `SessionStart` 키가 있으면 `hooks.SessionStart`로 마이그레이션한다.

### prepack -- 에셋 동기화

`npm publish` / `pnpm pack` 전에 자동으로 실행된다.

1. 프로젝트 `.claude/` 디렉토리에서 `sd-*` 에셋을 수집한다
2. 패키지의 `claude/` 디렉토리를 초기화(삭제)한 뒤 복사하여 배포에 포함한다

## 설치되는 에셋

### 에셋 탐색 규칙

- `.claude/` 디렉토리에서 `sd-*` 패턴의 파일/디렉토리를 자동 감지
- 루트 레벨과 1단계 하위 디렉토리를 스캔
- 예: `.claude/sd-statusline.py`, `.claude/skills/sd-commit/`, `.claude/rules/sd-readme.md`

### 포함 에셋 목록

**스크립트:**

| 파일 | 설명 |
|---|---|
| `sd-statusline.py` | Claude Code 상태 표시줄. 폴더명, 모델, 컨텍스트 사용률, API quota(5h/7d) 표시 |
| `sd-session-start.sh` | 세션 시작 시 `.claude/rules/*.md`와 `CLAUDE.md` 파일 목록을 출력 |

**Rules (`.claude/rules/`):**

| 파일 | 설명 |
|---|---|
| `sd-claude-rules.md` | 질문 응답/문제해결 원칙 (편법 금지, 근본 원인 추적) |
| `sd-library-issue.md` | `@simplysm/*` 라이브러리 버그 발견 시 이슈 리포트 작성 규칙 |
| `sd-readme.md` | `@simplysm/*` 패키지 사용 시 README.md 참조 규칙 |

**Skills (`.claude/skills/`):**

| 스킬 | 설명 |
|---|---|
| `sd-apk-decompile` | APK 디컴파일 (JADX + Apktool + dex2jar/CFR) |
| `sd-audit` | 코드베이스 점검 및 개선 사항 도출 |
| `sd-check` | typecheck + lint(fix) + 단위test 순차 수행 및 자동 수정 |
| `sd-commit` | `[type] scope` 형식의 커밋 메시지 생성 및 커밋 |
| `sd-debug` | 버그/에러의 근본 원인 분석 및 `debug.md` 저장 |
| `sd-doc-extract` | `.docx/.xlsx/.xlsb/.pptx/.pdf/.eml/.msg` 재귀 해체 및 추출 |
| `sd-doc-write` | `.docx/.xlsx` 문서 생성 및 편집 |
| `sd-init` | 프로젝트 설정 분석 후 `CLAUDE.md` 자동 생성 |
| `sd-migration` | 원본/현재 코드베이스 비교 분석 후 마이그레이션 대상 목록 생성 |
| `sd-plan` | 요구분석서/점검 결과 기반 TDD 구현계획서 작성 |
| `sd-plan-dev` | 구현계획서 기반 TDD 방식 실제 구현 수행 |
| `sd-readme` | LLM 인덱싱용 `README.md` 및 `docs/` 생성 |
| `sd-review` | spec/plan 문서와 구현 비교하여 완성도 검증 |
| `sd-simplify` | 수정된 코드를 reuse/quality/efficiency 관점으로 검토 및 개선 |
| `sd-spec` | 사용자 요청과 코드베이스 분석 후 요구분석서 작성 |
| `sd-test` | TDD 테스트 작성 및 실행 |
| `sd-use` | 요청 내용에 적합한 `sd-*` 스킬 자동 매칭 및 실행 |

## 내부 API

### sd-entries.mjs

에셋 탐색 유틸리티. `postinstall.mjs`와 `sync-claude-assets.mjs`에서 공유한다.

```js
import { forEachSdEntry, collectSdEntries } from "./sd-entries.mjs";

// 콜백 방식: sd-* 항목을 순회
forEachSdEntry(dir, (relativePath) => {
  // relativePath 예: "sd-statusline.py", "skills/sd-commit"
});

// 배열 반환 방식: sd-* 항목의 상대 경로 목록
const entries = collectSdEntries(dir);
// ["sd-statusline.py", "rules/sd-readme.md", "skills/sd-commit", ...]
```

**`forEachSdEntry(dir, callback)`**

| 매개변수 | 타입 | 설명 |
|---|---|---|
| `dir` | `string` | 스캔할 기본 디렉토리 |
| `callback` | `(relativePath: string) => void` | 각 `sd-*` 항목의 상대 경로를 전달받는 콜백 |

**`collectSdEntries(dir)`**

| 매개변수 | 타입 | 설명 |
|---|---|---|
| `dir` | `string` | 스캔할 기본 디렉토리 |
| **반환** | `string[]` | `sd-*` 항목의 상대 경로 배열 |

## sd-statusline.py 상세

Claude Code 하단 상태 표시줄에 다음 정보를 표시한다.

```
폴더명 | 모델명 | 컨텍스트% | 5h사용%(리셋시간) | 7d사용%(리셋시간)
```

**예시:** `my-project | Opus 4.6 | 23% | 45%(2h30m) | 12%(5d3h)`

**동작 원리:**

- Claude Code가 stdin으로 전달하는 JSON에서 폴더명, 모델ID, 컨텍스트 사용률을 추출
- API quota는 `~/.claude/statusline-cache.json`에 캐시하며 3분 간격으로 갱신
- quota 조회는 백그라운드 프로세스로 실행하여 상태 표시줄 응답 지연을 방지
- 파일 락(`~/.claude/statusline-cache.lock`)으로 동시 갱신을 방지
- Windows(`msvcrt`)와 Unix(`fcntl`) 모두 지원
