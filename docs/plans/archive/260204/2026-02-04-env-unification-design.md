# 환경변수 접근 방식 통일 설계

## 배경

현재 코드베이스에서 `process.env`를 사용하고 있으나, neutral 패키지(Node.js와 브라우저 양쪽에서 동작)에서 환경변수 접근 방식이 통일되어 있지 않음.

### 문제점

- `process.env`는 브라우저에서 기본 지원되지 않음
- `import.meta.env`는 Node.js에서 기본 지원되지 않음
- neutral 패키지에서 일관된 방식이 필요

## 결정

**모든 코드에서 `process.env` 사용, Vite에서 polyfill/define 강제**

### 이유

- Node.js 표준 방식으로 익숙함
- 기존 코드 변경 최소화
- 대부분의 프로젝트(Next.js 등)도 이 방식 사용
- 별도 `getEnv` 함수 불필요

## 설계

### 1. 코드 사용 방식

```typescript
// 모든 환경에서 동일하게 사용
const version = process.env["__VER__"];
const isDev = process.env["__DEV__"] === "true";
```

### 2. 빌드 타겟별 처리

| 타겟              | bundle   | define                                   |
| ----------------- | -------- | ---------------------------------------- |
| library (node)    | false    | 없음                                     |
| library (browser) | false    | 없음                                     |
| library (neutral) | false    | 없음                                     |
| server            | **true** | `'process.env.__VER__': '"x.x.x"'` 등    |
| client (Vite)     | Vite     | `'process.env': JSON.stringify({ ... })` |

### 3. 환경변수 체인

```
neutral 라이브러리: process.env["__DEV__"]
    ↓ (neutral 빌드, bundle: false) → 그대로 유지
    ↓ (server 빌드, bundle: true) → "false"로 치환 ✓
    ↓ (client 빌드, Vite) → 객체에서 읽기 ✓

node 라이브러리: process.env["__DEV__"]
    ↓ (node 빌드, bundle: false) → 그대로 유지
    ↓ (server 빌드, bundle: true) → "false"로 치환 ✓
```

### 4. 환경변수 값 출처

sd.config.ts에 정의:

```typescript
// sd.config.ts
export default ({ dev }: SdConfigParams): SdConfig => ({
  packages: {
    "my-server": {
      target: "server",
      env: {
        __VER__: "1.0.0",
        __DEV__: dev ? "true" : "false",
      },
    },
    "my-client": {
      target: "client",
      server: "my-server",
      env: {
        __VER__: "1.0.0",
        __DEV__: dev ? "true" : "false",
      },
    },
  },
});
```

## 구현 작업

### Phase 1: 버그 수정 및 인프라

1. **server-build.worker.ts**: `bundle: false` → `bundle: true` 수정
2. **server-build.worker.ts**: `external` 옵션 추가 (native addon 패키지 제외)
3. **SdConfig 타입**: `env` 필드 추가
4. **server 빌드**: `define` 옵션 추가
5. **watch.worker.ts (Vite)**: `define` 옵션에 `process.env` 추가

### Phase 2: 기존 코드 정리

1. 기존 `process.env` 사용처 검토
2. 필요시 sd.config.ts에 환경변수 추가

## 고려사항

### server bundle: true 시 주의

- `external` 옵션으로 native addon 패키지 제외 필요
  - better-sqlite3, tedious, pg-native 등
- 번들 크기 증가 가능 → 필요시 최적화

### Vite define 설정

```typescript
// watch.worker.ts - Vite 설정
define: {
  'process.env': JSON.stringify({
    __VER__: config.env?.__VER__ ?? "",
    __DEV__: config.env?.__DEV__ ?? "false",
    // 필요한 환경변수만 명시적으로 포함
  }),
}
```

## 테스트 계획

1. server 빌드 후 `process.env["__VER__"]`이 상수로 치환되었는지 확인
2. client 빌드 후 `process.env`가 객체로 치환되었는지 확인
3. neutral 라이브러리가 server/client 양쪽에서 정상 동작하는지 확인

## 환경변수 네이밍 컨벤션

### 프로젝트 전용 환경변수

- `__DEV__`: 개발 모드 플래그 ("true" | "false")
- `__VER__`: 앱 버전 정보 (예: "1.0.0")

### 외부 표준 환경변수 (변경 금지)

- `NO_COLOR`: CLI 색상 출력 비활성화 (https://no-color.org/)
- `TIMING`: ESLint 규칙별 실행 시간 출력
- `ANDROID_HOME`, `ANDROID_SDK_ROOT`: Android SDK 경로
- `HOME`, `LOCALAPPDATA`: 시스템 경로

### CONSOLA_LEVEL 제거

- 환경변수 대신 `consola.level` API 직접 사용
- `--debug` CLI 옵션으로 `consola.level = LogLevels.debug` 설정
