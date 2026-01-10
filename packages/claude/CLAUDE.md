# claude 패키지 개발 가이드

**이 문서는 Claude Code가 claude 패키지를 개발/수정할 때 참고하는 가이드입니다.**
**프로젝트 루트의 [CLAUDE.md](../../CLAUDE.md)를 함께 확인하세요.**
**사용자 문서는 [README.md](README.md)를 참고하세요.**

---

SIMPLYSM 프로젝트를 위한 Claude Code 확장 패키지입니다.

## 목적

`.claude` 폴더 내용(명령어, 참조 자료, 스크립트)을 사용자 프로젝트에 자동 배포합니다.

## 구조

```
packages/claude/
├── src/
│   ├── prepack.ts      # yarn publish 시 .claude 파일 및 문서 복사
│   └── postinstall.ts  # 패키지 설치 시 사용자 프로젝트로 복사
├── dist/               # 빌드 결과
│   ├── prepack.js
│   ├── postinstall.js
│   ├── claude-files/   # prepack이 복사한 .claude 파일들
│   └── claude-docs/    # prepack이 복사한 CLAUDE.md, README.md
├── tsconfig.json
└── package.json
```

## 동작 방식

### prepack (배포 전)

1. `yarn publish` 실행 시 `prepack` 스크립트 자동 실행
2. TypeScript 빌드 (`tsc`)
3. 루트 `.claude/*/**` → `dist/claude-files/`로 복사
4. 루트 레벨 파일(settings.json 등)은 제외
5. 루트 및 각 패키지의 `CLAUDE.md`, `README.md` → `dist/claude-docs/`로 복사

### postinstall (설치 후)

1. 사용자가 `yarn add -D @simplysm/claude` 실행
2. `postinstall` 스크립트 자동 실행
3. 프로젝트 루트 탐색 (devDependencies 기준)
4. `dist/claude-files/**` → 프로젝트 `.claude/`로 복사
5. 기존 파일 덮어쓰기

## 개발 규칙

### 복사 대상

**claude-files (postinstall로 배포):**

| 포함 | 제외 |
|------|------|
| `.claude/commands/**` | `.claude/settings.json` |
| `.claude/references/**` | `.claude/settings.local.json` |
| `.claude/scripts/**` | 루트 레벨 파일 |
| `.claude/hooks/**` | |

**claude-docs (배포용 문서):**

| 포함 |
|------|
| 루트 `CLAUDE.md`, `README.md` |
| `packages/*/CLAUDE.md`, `packages/*/README.md` |

### 프로젝트 루트 탐색

`devDependencies`에 `@simplysm/claude`가 있는 `package.json` 위치를 프로젝트 루트로 판단합니다.

## 의존성

**외부 의존성 없음** - Node.js 내장 모듈만 사용 (`fs`, `path`)

## 주의사항

- postinstall은 `node_modules/@simplysm/claude/dist/`에서 실행됨

## 검증 명령

```bash
# 타입 체크
npx tsc -p packages/claude/tsconfig.json --noEmit

# 빌드
npx tsc -p packages/claude/tsconfig.json

# prepack 테스트
cd packages/claude && node dist/prepack.js

# postinstall 테스트 (프로젝트 루트에서 실행)
node packages/claude/dist/postinstall.js
```
