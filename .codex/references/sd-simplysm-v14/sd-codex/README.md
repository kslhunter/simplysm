# @simplysm/sd-codex

> Codex 에셋(스킬, 규칙, 참조 문서)을 소비 프로젝트의 `.codex/` 디렉터리에 자동 설치하는 패키지.
> TypeScript 소스 없음. Node.js `.mjs` 스크립트와 배포 에셋으로 구성된다.

## Installation

```bash
npm install @simplysm/sd-codex
```

설치 시 `postinstall` 스크립트가 자동 실행되어, `codex/sd-*` 에셋을 프로젝트 루트
`.codex/`에 복사한다. 루트 `AGENTS.md`는 자동으로 생성하거나 덮어쓰지 않는다.

## 하려는 작업 → 읽을 파일

### 설치 및 동기화 동작 이해

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| postinstall이 에셋을 어떻게 설치하는지 파악하기 | [scripts.md](./scripts.md) |
| prepack 동기화(sync.mjs) 동작 파악하기 | [scripts.md](./scripts.md) |
| `sd-*` 항목 탐색 유틸리티 함수 사용하기 | [scripts.md](./scripts.md) |

### 에셋 구조 파악

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 배포 에셋(스킬, 규칙, 참조 문서) 구조와 소스 오브 트루스 파악하기 | [assets.md](./assets.md) |

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
