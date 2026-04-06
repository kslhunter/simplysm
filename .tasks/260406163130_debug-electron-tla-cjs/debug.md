# 디버그: Electron main process CJS 번들링 시 lru-cache top-level await 에러

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 에러
- **증상:** `Top-level await is currently not supported with the "cjs" output format` — `lru-cache@11.3.0`의 `dist/esm/index.min.js`에서 `await import("node:diagnostics_channel")` top-level await 사용
- **위치:** `packages/sd-cli/src/electron/electron.ts:135` (dev), `:302` (build)
- **재현 절차:** `pnpm sd-cli device client-devtool` 실행

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|            | 증거1: 에러 경로가 `dist/esm/` | 증거2: 11.2.7은 CJS/ESM 둘 다 제공 | 증거3: esbuild ESM 우선 resolve 이슈 보고 |
| ---------- | ----- | ----- | ----- |
| H1: lru-cache 11.3.0 exports map 변경 | C(infer) | N | N |
| H2: esbuild의 ESM 우선 resolve 동작 | C(doc) | C(code) | C(doc) |

### 결과: 확정 — H2

esbuild가 `format: "cjs"`에서도 ESM 진입점을 resolve하는 알려진 동작 (evanw/esbuild#3166). lru-cache 11.3.0에서 ESM 빌드에 top-level await (`diagnostics_channel` 계측)가 추가되면서, CJS 포맷으로 변환 불가능하여 에러 발생.

근본적으로는 Electron main process를 CJS로 번들링하는 설계가 ESM-first 생태계와 충돌하는 구조적 문제.

## 해결 방안

### 방안 A: Electron main process를 ESM 포맷으로 전환

- **설명:** `electron.ts`의 esbuild 설정에서 `format: "cjs"` → `format: "esm"` 변경. `.electron/src/package.json`에 `"type": "module"` 추가. ESM 배너(`createRequire`) 적용.
- **장점:** ESM-first 생태계와 완전 호환. top-level await 포함 의존성도 문제없음. Electron 28+부터 ESM 지원, 소비앱은 Electron 41 사용.
- **반론:** `require()` 사용하는 네이티브 모듈이 있으면 `createRequire` 배너 필요. 소비앱의 `electron-main.ts`가 CJS 패턴(`__dirname` 등)을 사용하면 추가 수정 필요.
- **점수:** 안정성 8/10, 호환성 8/10, 근본성 10/10 → **평균 8.7/10**

### 방안 B: esbuild conditions/mainFields로 CJS 강제

- **설명:** esbuild 옵션에 `conditions: ["node", "require"]`, `mainFields: ["main"]` 추가.
- **장점:** 기존 CJS 포맷 유지. 변경 범위 최소.
- **반론:** esbuild의 module 기본 조건으로 일부 케이스에서 여전히 ESM으로 resolve 가능. ESM-only 패키지가 의존성에 포함되면 동일 문제 재발.
- **점수:** 안정성 5/10, 호환성 7/10, 근본성 4/10 → **평균 5.3/10**

### 방안 C: 수행 안 함

- **장점:** 코드 변경 없음.
- **반론:** Electron 앱 실행 불가.
- **점수:** 안정성 2/10, 호환성 2/10, 근본성 1/10 → **평균 1.7/10**

## 선택 결과

**방안 A: ESM 전환** (평균 8.7/10)

Electron 41은 ESM을 완전 지원하며, 생태계 흐름에 맞는 근본적 해결책.
