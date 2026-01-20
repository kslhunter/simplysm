# @simplysm/cli

심플리즘 프레임워크의 CLI 도구입니다.

## 설치

```bash
npm install -g @simplysm/cli
# or
yarn global add @simplysm/cli
```

또는 npx로 설치 없이 직접 실행한다:

```bash
npx @simplysm/cli lint
npx @simplysm/cli typecheck
```

## 명령어

### lint

ESLint를 실행한다.

```bash
# 전체 린트
sd-cli lint

# 특정 경로만 린트
sd-cli lint packages/core-common

# 자동 수정
sd-cli lint --fix

# 규칙별 실행 시간 출력
sd-cli lint --timing
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--fix` | 자동 수정 | `false` |
| `--timing` | 규칙별 실행 시간 출력 | `false` |
| `--debug` | debug 로그 출력 | `false` |

### typecheck

TypeScript 타입체크를 실행한다.

```bash
# 전체 타입체크
sd-cli typecheck

# 특정 경로만 타입체크
sd-cli typecheck packages/core-common

# 여러 경로 타입체크
sd-cli typecheck packages/core-common tests/orm
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--debug` | debug 로그 출력 | `false` |

### 설정 (sd.config.ts)

타입체크 시 패키지별 빌드 타겟을 설정합니다. 파일이 없으면 모든 패키지가 `neutral` 타겟으로 처리됩니다.

```typescript
import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "core-browser": { target: "browser" },
  },
});

export default config;
```

**타겟별 동작:**
- `node`: DOM 관련 lib 제거, `@types/node` 자동 포함
- `browser`: DOM lib 유지, `@types/node` 제외
- `neutral`: DOM 관련 lib 제거, `@types/node` 제외

## 프로그래매틱 사용

CLI가 아닌 코드에서 직접 호출할 수 있다:

```typescript
import { runLint, runTypecheck } from "@simplysm/cli";

// 린트 실행
await runLint({
  targets: ["packages/core-common"],
  fix: false,
  timing: false,
  debug: false,
});

// 타입체크 실행
await runTypecheck({
  targets: ["packages/core-common"],
  debug: false,
});
```

## 캐시

- **lint**: `.cache/eslint.cache`에 캐시 저장
- **typecheck**: 각 패키지/테스트 디렉토리의 `.cache/typecheck.tsbuildinfo`에 incremental 빌드 정보 저장

캐시를 초기화하려면 `.cache` 디렉토리를 삭제한다.

## 라이선스

Apache-2.0
