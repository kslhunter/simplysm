# @simplysm/cli

심플리즘 프레임워크의 CLI 도구이다. ESLint 린트, TypeScript 타입체크, 패키지 빌드 watch 기능을 제공한다.

## 설치

```bash
npm install --save-dev @simplysm/cli
# or
pnpm add -D @simplysm/cli
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
| `--options`, `-o` | sd.config.ts에 전달할 추가 옵션 (여러 번 사용 가능) | `[]` |
| `--debug` | debug 로그 출력 | `false` |

### watch

**라이브러리 패키지**(`node`/`browser`/`neutral` 타겟)를 watch 모드로 빌드한다. 파일 변경 시 자동으로 리빌드되며, `.d.ts` 타입 정의 파일도 자동 생성된다.

> **참고**: `client`/`server` 타겟은 `dev` 명령어를 사용한다.

```bash
# 모든 라이브러리 패키지 watch
sd-cli watch

# 특정 패키지만 watch
sd-cli watch solid

# 여러 패키지 watch
sd-cli watch solid core-common
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--options`, `-o` | sd.config.ts에 전달할 추가 옵션 (여러 번 사용 가능) | `[]` |
| `--debug` | debug 로그 출력 | `false` |

### dev

**Client 및 Server 패키지**를 개발 모드로 실행한다. `client` 타겟은 Vite dev server로 실행되며, `server` 타겟은 Server Build Worker + Server Runtime Worker로 실행된다. Server-Client 프록시 연결 및 Capacitor 초기화를 지원한다.

```bash
# 모든 client/server 패키지 실행
sd-cli dev

# 특정 패키지만 실행
sd-cli dev solid-demo

# 여러 패키지 실행
sd-cli dev solid-demo my-server
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--options`, `-o` | sd.config.ts에 전달할 추가 옵션 (여러 번 사용 가능) | `[]` |
| `--debug` | debug 로그 출력 | `false` |

## 설정 (sd.config.ts)

타입체크와 watch 시 패키지별 빌드 타겟을 설정한다. 타입체크 시 파일이 없으면 모든 패키지가 `neutral` 타겟으로 처리된다. watch는 이 파일이 필수이다.

```typescript
import type { SdConfigFn } from "@simplysm/cli";

const config: SdConfigFn = () => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "core-browser": { target: "browser" },
    "solid-demo": { target: "client", server: 3000 },
  },
});

export default config;
```

**타겟별 동작:**
- `node`: DOM 관련 lib 제거, `@types/node` 자동 포함
- `browser`: DOM lib 유지, `@types/node` 제외
- `neutral`: DOM lib 유지, `@types/node` 자동 포함 (Node/브라우저 공용)
- `client`: Vite dev server를 통한 개발 모드. `server` 옵션으로 포트 지정
- `scripts`: typecheck/watch 대상에서 제외. 각 스크립트가 자체 완결적으로 실행되는 패키지용

## API로 직접 호출

코드에서 직접 함수를 호출할 수 있다:

```typescript
import { runLint, runTypecheck, runWatch, runDev } from "@simplysm/cli";

// 린트 실행
await runLint({
  targets: ["packages/core-common"],
  fix: false,
  timing: false,
});

// 타입체크 실행
await runTypecheck({
  targets: ["packages/core-common"],
});

// watch 실행 (라이브러리 패키지)
await runWatch({
  targets: ["solid"],
  options: [],
});

// dev 실행 (client/server 패키지)
await runDev({
  targets: ["solid-demo"],
  options: [],
});
```

### 옵션 타입

#### LintOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `targets` | `string[]` | 린트할 경로 목록. 빈 배열이면 전체 |
| `fix` | `boolean` | 자동 수정 여부 |
| `timing` | `boolean` | 규칙별 실행 시간 출력 |

#### TypecheckOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `targets` | `string[]` | 타입체크할 경로 목록. 빈 배열이면 전체 |
| `options` | `string[]` | sd.config.ts에 전달할 추가 옵션 |

#### WatchOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `targets` | `string[]` | watch할 라이브러리 패키지 목록. 빈 배열이면 전체 |
| `options` | `string[]` | sd.config.ts에 전달할 추가 옵션 |

#### DevOptions

| 속성 | 타입 | 설명 |
|------|------|------|
| `targets` | `string[]` | dev 실행할 client/server 패키지 목록. 빈 배열이면 전체 |
| `options` | `string[]` | sd.config.ts에 전달할 추가 옵션 |

**API 동작:**
- `runLint`, `runTypecheck`: `Promise<void>` 반환. 에러 발견 시 `process.exitCode = 1`을 설정하고 resolve (throw하지 않음)
- `runWatch`, `runDev`: `Promise<void>` 반환. SIGINT/SIGTERM 시그널 수신 시 resolve

## 캐시

- **lint**: `.cache/eslint.cache`에 캐시 저장
- **typecheck**: 각 패키지/테스트 디렉토리의 `.cache/typecheck-{env}.tsbuildinfo`에 incremental 빌드 정보 저장 (`{env}`는 `node` 또는 `browser`)
- **watch (dts)**: 각 패키지의 `.cache/dts.tsbuildinfo`에 incremental 빌드 정보 저장

캐시를 초기화하려면 `.cache` 디렉토리를 삭제한다.

## 라이선스

Apache-2.0
