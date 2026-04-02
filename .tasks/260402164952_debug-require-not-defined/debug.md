# 디버그: esbuild dynamic-import: false가 require()로 변환하여 브라우저 실패

## 출처

- **origin:** `direct` — Feature 1.4 적용 후 PDA에서 발생

## 에러 증상

- **에러 메시지:** `ReferenceError: require is not defined`
- **위치:** `index-B_CVPCLE.js:1:279242`, `_initWebStore` → `initialize`
- **재현:** Feature 1.4 (`esbuild.supported: { "import-meta": false, "dynamic-import": false }`) 적용 후 PDA 접속

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: esbuild import()→require() 변환 (code) | E2: _initWebStore에 dynamic import 존재 (code) | E3: Feature 1.4 전에 없던 에러 (사용자) |
|----|------|------|------|
| H1: dynamic-import: false가 require() 변환 | C(code) — esbuild 테스트 confirmed | C(code) — DbService.ts:25 `import("jeep-sqlite/loader")` | C(code) — Feature 1.4에서 추가 |
| H2: 앱 코드에 직접 require() 존재 | I → 폐기 | N | I → 폐기 |

### 결과: 확정 — H1

`dynamic-import: false` 설정 시 esbuild가 `import()` → `Promise.resolve().then(() => __toESM(require(...)))` 로 변환. `require()`는 브라우저에 존재하지 않으므로 ReferenceError.

`dynamic-import: true` (Vite 기본값)로 두면 esbuild가 `import()`를 건드리지 않고, Rollup의 `inlineDynamicImports: true`가 `import()`를 인라인하여 제거하는 것이 올바른 경로.

## 해결 방안

### 방안 A: dynamic-import: false 제거, import-meta: false만 유지

- **설명:** `esbuild.supported`에서 `"dynamic-import": false` 제거
- **장점:** Rollup 역할(dynamic import 인라인)과 esbuild 역할(import.meta 변환)을 정확히 분리
- **반론:** Rollup이 놓치는 import()가 있으면 Chrome 61 실패. 단, `inlineDynamicImports: true`가 정적 경로 import()를 모두 인라인하므로 실제로 남는 경우 없음
- **점수:** 호환성 9/10, 근본성 10/10, 안정성 9/10 → **평균 9.3/10**

## 선택 결과

**방안 A** (평균 9.3/10)

`vite-config.ts`에서 `"dynamic-import": false` 제거. `"import-meta": false`만 유지.
