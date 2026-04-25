# CLAUDE.md

> 이 패키지의 사용법 및 지침은 `.claude/references/sd-simplysm-v14/sd-claude/README.md`를 참조한다.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/sd-claude` - Claude Code 에셋을 소비 프로젝트의 `.claude/` 디렉토리에 자동 설치하는 패키지. 다수의 스킬(`sd-*` 접두어 포함), 2개 rules 파일, 참조 문서, 6개 훅 스크립트를 포함한다. CLI(`sd-claude`)로 멀티 계정 전환 기능도 제공한다.

TypeScript 소스 없음. `scripts/`는 Node.js `.mjs` 스크립트(5개)이고, `claude/`는 배포 에셋 디렉토리다.

## Architecture

```
sd-claude/
├── claude/                 ← 배포 에셋 (postinstall로 소비 프로젝트 .claude/에 복사됨)
│   ├── references/         ← 스킬/규칙에서 참조하는 공유 문서
│   ├── rules/              ← Claude Code 규칙 파일 (sd-claude-rules.md, sd-options.md, 2개)
│   ├── skills/             ← 스킬 파일 디렉토리
│   │   ├── sd-check/          ← typecheck/lint/test 실행
│   │   ├── sd-claude-docs/    ← CLAUDE.md + usage 문서 동시 생성
│   │   ├── sd-commit/         ← 그룹별 커밋 생성
│   │   ├── sd-debug/          ← 버그 근본 원인 분석
│   │   ├── sd-deliverable/    ← 매뉴얼·SIT 문서 생성
│   │   ├── sd-dev/            ← 통합 개발 오케스트레이터
│   │   ├── sd-doc-extract/    ← 문서 파일 텍스트/이미지 추출 (Python)
│   │   ├── sd-inner-clarify/  ← (내부 전용) 명확성 분류·근거 탐색·명확화 질문
│   │   ├── sd-inner-debug/    ← (내부 전용) 근본 원인 분석(ACH) 로직
│   │   ├── sd-inner-review/   ← (내부 전용) 코드 리뷰 분석 로직
│   │   ├── sd-issue/          ← GitHub 이슈 생성
│   │   ├── sd-outlook/        ← Outlook 메일 검색·다운로드 (Python)
│   │   ├── sd-plan/           ← 요구명세·구현계획 작성
│   │   ├── sd-prompt/         ← 스킬/프롬프트 파일 작성·개선
│   │   ├── sd-refactor/       ← 리팩토링 분석 리포트 생성
│   │   ├── sd-review/         ← 코드 리뷰 리포트 생성
│   │   ├── sd-tdd/            ← TDD 개발
│   │   ├── sd-use/            ← 자연어 → sd-* 스킬 라우팅
│   │   └── sd-wbs/            ← WBS Feature 분해
│   ├── sd-check-bash.py              ← Bash 도구 사전 검사 훅 (금지 명령어 차단: git stash/checkout/restore/reset/clean, cd, npx tsc, npx eslint)
│   ├── sd-cache-read-hash.py          ← PostToolUse 훅 (Read 후 파일 해시 캐싱)
│   ├── sd-check-forbidden-files.py   ← Write/Edit 도구 사전 검사 훅 (tsconfig.json, eslint.config.ts 수정 차단)
│   ├── sd-check-write.py             ← Write 도구 사전 검사 훅 (Read 없이 Write 시도 또는 파일 변경 감지 후 차단)
│   ├── sd-subagent-start.sh          ← SubagentStart 훅 (CLAUDE.md를 읽어 출력)
│   └── sd-statusline.py              ← statusLine 훅 (폴더|모델|컨텍스트%|사용량 표시)
└── scripts/
    ├── cli.mjs             ← CLI 엔트리포인트 (bin: sd-claude)
    ├── auth.mjs            ← 멀티 계정 save/switch 로직
    ├── sd-entries.mjs      ← sd-* 항목 탐색 유틸리티
    ├── postinstall.mjs     ← pnpm install 후 .claude/ 설치 로직
    └── sync.mjs            ← prepack: 루트 .claude/sd-* → claude/ 동기화
```

## Key Patterns

### 에셋 탐색 규칙 (sd-entries.mjs)

`sd-*` 접두어를 가진 파일/디렉토리만 복사·관리 대상이다. `sd-*`로 시작하지 않는 스킬(예: `my-apk-decompile/`, `playwright-cli/`)은 postinstall 및 sync 대상에서 제외되어 모노레포 루트 `.claude/`에만 존재하고 배포 에셋(`claude/`)에는 포함되지 않는다. 탐색 깊이는 2단계 고정:
- 루트 레벨의 `sd-*` 항목
- 하위 디렉토리 내 `sd-*` 항목 (예: `skills/sd-commit/`, `rules/sd-claude-rules.md`)

```javascript
// sd-entries.mjs
export function forEachSdEntry(dir, callback) {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (dirent.name.startsWith("sd-")) {
      callback(dirent.name);
    } else if (dirent.isDirectory()) {
      // 한 단계 더 탐색
      for (const name of fs.readdirSync(path.join(dir, dirent.name))) {
        if (name.startsWith("sd-")) {
          callback(path.join(dirent.name, name));
        }
      }
    }
  }
}
```

### postinstall 설치 흐름

```
INIT_CWD 또는 node_modules 경로에서 프로젝트 루트 감지
→ simplysm 모노레포 동일 메이저 버전이면 건너뜀 (자기 자신에게 설치 방지)
→ cleanSdEntries: 기존 sd-* 항목 삭제
→ copySdEntries: claude/ → .claude/ 복사 (sd-* 항목)
→ settings.json도 함께 .claude/settings.json으로 복사
```

`postinstall`은 실패해도 `pnpm install`을 차단하지 않는다 — 전체 try-catch로 감싸서 경고만 출력한다.

### settings.json

`claude/settings.json`을 정적 파일로 관리하며, sd-* 항목과 함께 `.claude/settings.json`으로 복사된다. 소비 프로젝트에서 커스텀 훅이 필요하면 `settings.local.json`을 사용한다.

### prepack 동기화 (sync.mjs)

npm publish/pack 전에 루트 `.claude/`의 `sd-*` 항목과 `settings.json`을 `claude/`로 복사한다. **소스 오브 트루스는 루트 `.claude/`** 이고, `packages/sd-claude/claude/`는 배포용 스냅샷이다. 복사 시 `SKILL.eval.md`와 `eval_*` 파일은 제외한다.

```
루트 .claude/sd-* + settings.json → packages/sd-claude/claude/ (SKILL.eval.md, eval_* 제외)
```

### 스킬 파일 구조

각 스킬 디렉토리는 다음 파일을 포함한다:
- `SKILL.md` — 스킬 정의 (YAML frontmatter: `name`, `description`, `model`)
- `SKILL.eval.md` — Eval 시나리오 (선택)
- `references/` — 스킬에서 참조하는 참고 문서 (선택)

```markdown
---
name: sd-commit
description: 전체 변경사항에 대한 단일 커밋을 생성하는 스킬. ...
model: haiku
---
```

### CLI (sd-claude)

`package.json`의 `bin`에 `sd-claude`로 등록된 CLI 도구. `scripts/cli.mjs`가 엔트리포인트이며, `scripts/auth.mjs`를 동적 import한다.

- `sd-claude auth save` -- 현재 Claude Code 계정의 Organization 이름과 refresh token을 `~/.claude/profiles.json`에 저장한다.
- `sd-claude auth switch` -- 저장된 계정 목록을 표시하고, 사용자가 선택한 계정으로 전환한다. TTY 필수.

프로필 파일(`~/.claude/profiles.json`)은 `{ current, accounts: { [orgName]: { refreshToken, usage } } }` 구조다.

## sd-statusline.py

Claude Code 상태바에 `폴더 | 모델 | 컨텍스트% | 5h사용량 | 7d사용량 | $추가요금` 형식으로 표시한다.

- `~/.claude/statusline-cache.json`에 API 응답을 캐싱한다 (180초 갱신 주기).
- OAuth 토큰으로 `https://api.anthropic.com/api/oauth/usage`를 호출하여 추가 크레딧 사용량을 조회한다.
- 백그라운드 프로세스로 fetch를 비동기 실행한다 (파일 락 사용).
- Windows/Unix 모두 지원 (`msvcrt` vs `fcntl`).
