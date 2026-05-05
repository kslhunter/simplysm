# @simplysm/sd-claude

> Claude Code 에셋(스킬, 규칙, 훅, 참조 문서)을 소비 프로젝트의 `.claude/` 디렉토리에 자동 설치하는 패키지.
> CLI(`sd-claude`)로 멀티 계정 전환 기능도 제공한다.
> TypeScript 소스 없음. Node.js `.mjs` 스크립트와 배포 에셋으로 구성된다.

## Installation

```bash
npm install @simplysm/sd-claude
```

설치 시 `postinstall` 스크립트가 자동 실행되어, `claude/sd-*` 에셋과 `settings.json`을 프로젝트 루트 `.claude/`에 복사한다.

## 하려는 작업 → 읽을 파일

### 계정 관리

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| Claude Code 계정을 저장하거나 멀티 계정 간 전환하기 | [cli.md](./cli.md) |

### 설치 및 동기화 동작 이해

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| postinstall이 에셋을 어떻게 설치하는지 파악하기 | [scripts.md](./scripts.md) |
| prepack 동기화(sync.mjs) 동작 파악하기 | [scripts.md](./scripts.md) |
| `sd-*` 항목 탐색 유틸리티 함수 사용하기 | [scripts.md](./scripts.md) |

### 훅 동작 파악

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 금지 명령어 차단, 파일 보호, Write 검증 등 훅 동작 파악하기 | [hooks.md](./hooks.md) |
| 상태바(statusline) 표시 내용 및 캐시 구조 파악하기 | [hooks.md](./hooks.md) |

### 에셋 구조 파악

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 배포 에셋(스킬, 규칙, 참조 문서) 구조와 소스 오브 트루스 파악하기 | [assets.md](./assets.md) |

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
