# cli

**이 문서는 Claude Code가 cli 패키지를 개발/수정할 때 참고하는 가이드입니다.**
**프로젝트 루트의 [CLAUDE.md](../../CLAUDE.md)를 함께 확인하세요.**

---

SIMPLYSM 프로젝트를 위한 CLI 도구입니다.

## 목적

ESLint 등 개발 도구의 래퍼를 제공하여 성능 문제를 해결합니다.

**배경**: ESLint의 glob 패턴 처리 시 `node_modules` 등 ignore된 디렉토리도 탐색하여 메모리/시간 낭비 발생. Node.js glob으로 먼저 파일 목록을 생성(ignore 적용)한 후 ESLint API에 전달하여 해결.

## 구조

```
packages/cli/
├── src/
│   ├── sd-cli.ts          # CLI 진입점 (yargs)
│   └── commands/
│       └── lint.ts        # lint 명령어 구현
├── package.json
└── tsconfig.build.json
```

## 주요 명령어

### lint

ESLint를 실행합니다. glob 패턴에 ignore를 적용하여 불필요한 디렉토리 탐색을 방지합니다.

```bash
yarn run _sd-cli_ lint "**/*.{ts,js,html}"           # 기본
yarn run _sd-cli_ lint "**/*.{ts,js,html}" --fix     # 자동 수정
yarn run _sd-cli_ lint "**/*.ts" --timing            # 규칙별 실행 시간 출력
yarn run _sd-cli_ lint "packages/core-common/**/*.ts"  # 특정 경로
```

**옵션**:
- `patterns` (필수): glob 패턴
- `--fix`: 자동 수정 활성화
- `--timing`: 규칙별 실행 시간 출력 (ESLint TIMING=1)

**ignore 패턴**: `eslint.config.ts`의 `globalIgnores`에서 자동 로드
- jiti를 사용해 TypeScript 설정 파일을 런타임에 로드
- ESLint 설정과 자동 동기화

## 의존성

### 내부

| 패키지 | 용도 |
|--------|------|
| `@simplysm/eslint-plugin` | ESLint 설정 참조 |

### 외부

| 패키지 | 용도 |
|--------|------|
| `eslint@9` | ESLint Node.js API |
| `glob@13` | 파일 글로빙 |
| `jiti@2` | TypeScript 설정 파일 런타임 로더 |
| `yargs@18` | CLI 파서 |

## 개발/실행

```bash
# 개발 실행 (루트 package.json의 _sd-cli_ 스크립트 사용)
yarn run _sd-cli_ lint "**/*.ts"

# 빌드
npx tsc -p packages/cli/tsconfig.build.json
```

## 검증 명령

```bash
# 타입체크
npx tsc --noEmit -p packages/cli/tsconfig.build.json

# ESLint
yarn run _sd-cli_ lint "packages/cli/**/*.ts"
```
