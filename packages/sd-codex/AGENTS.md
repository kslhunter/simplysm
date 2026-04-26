# AGENTS.md

## Package Overview

- 패키지명: `@simplysm/sd-codex`
- 설명: Codex 셋업 자산을 소비 프로젝트의 `.codex/` 디렉터리에 자동 설치하는 패키지.
- 공개 TypeScript 소스 파일 수: 0
- 공개 `main`/`exports` entrypoint: 없음
- CLI binary: 없음

이 패키지는 `src/` 기반 라이브러리가 아니다. `package.json`의 `files`에는 `scripts`와
`codex`만 포함되며, 소비자 코드에서 import할 공개 API가 없다.

## Architecture

```text
packages/sd-codex/
├─ package.json
├─ AGENTS.md
├─ scripts/
│  ├─ postinstall.mjs
│  ├─ sd-entries.mjs
│  └─ sync.mjs
└─ codex/
   ├─ references/
   ├─ rules/
   └─ skills/
```

- `scripts/postinstall.mjs`: 패키지 설치 후 `codex/`에 포함된 `sd-*` 자산을 소비 프로젝트의 `.codex/`로 복사한다. 실패는 경고로 처리해 설치를 차단하지 않는다.
- `scripts/sync.mjs`: 패키징 전에 루트 `.codex/`의 `sd-*` 자산을 `packages/sd-codex/codex/`로 동기화한다.
- `scripts/sd-entries.mjs`: 루트 레벨 및 1단계 하위 디렉터리에서 `sd-*` 항목을 수집하는 공통 유틸리티다.
- `codex/`: 배포 대상 Codex rules, skills, references 자산을 담는다.

## Key Patterns

### `sd-*` 자산만 관리

`scripts/sd-entries.mjs`는 기준 디렉터리의 루트 항목과 1단계 하위 디렉터리 항목 중
이름이 `sd-`로 시작하는 항목만 수집한다. 따라서 `references/sd-simplysm-v14`,
`rules/sd-codex-rules.md`, `skills/sd-check`는 포함하지만, `AGENTS.md`와
`skills/demo-review`처럼 `sd-` 접두어가 없는 항목은 설치/동기화 대상이 아니다.

### 설치 실패 비차단

`postinstall.mjs`는 전체 설치 로직을 `try/catch`로 감싸고, 오류가 발생해도
`console.warn`만 출력한다. 이 패키지의 Codex 자산 설치 실패가 소비 프로젝트의
`pnpm install` 실패로 전파되지 않는 구조다.

### Simplysm 동일 메이저 모노레포에서는 설치 생략

`postinstall.mjs`는 소비 프로젝트의 `package.json` 이름이 `simplysm`이고, 프로젝트
메이저 버전과 `@simplysm/sd-codex` 메이저 버전이 같으면 설치를 생략한다. 이 저장소
자체에서 패키지를 설치할 때 `codex/` 자산을 루트 `.codex/`로 다시 복사하지 않기
위한 분기다.

## Package-specific Notes

- `AGENTS.md`는 자동 복사하지 않는다. 프로젝트별 루트 지침 파일은 소비 프로젝트에서 직접 관리한다.
- `scripts/*.mjs`는 패키지 운영 스크립트이며, `src/index.ts` 기반 공개 API로 문서화하지 않는다.
