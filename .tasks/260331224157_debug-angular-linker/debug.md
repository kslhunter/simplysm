# 디버그: Angular Linker 미적용으로 JIT compilation 에러 발생

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 해당 없음

## 에러 증상

- **에러 메시지:** `Uncaught Error: The injectable '_PlatformLocation' needs to be compiled using the JIT compiler, but '@angular/compiler' is not available. The injectable is part of a library that has been partially compiled. However, the Angular Linker has not processed the library such that JIT compilation is used as fallback.`
- **위치:** `compiler_facade.ts:45` → `platform_location.ts:66` (`@angular/common`)
- **재현:** Vite dev 서버 연결 시 즉시 발생 (`[vite] connected` 직후)

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: 에러 "Linker has not processed" | E2: .mjs에 ɵɵngDeclareFactory 존재 | E3: transform 훅 .ts 필터 | E4: transformData API skipLinker | E5: emittedFiles에 프로젝트 파일만 |
|----|--------------------------------------|-------------------------------------|---------------------------|----------------------------------|-----------------------------------|
| H1: transform 훅이 .ts만 처리하여 .mjs 미링킹 | C(code) | C(code) | C(code) | C(doc) | C(code) |
| H2: optimizeDeps pre-bundle이 추가 장벽 | C(infer) | N | C(code) | N | N |

### 결과: 확정 — H1

`vite-angular-plugin.ts:308`의 `if (!id.endsWith(".ts")) return;`으로 인해 `@angular/common` 등의 `.mjs` 라이브러리가 `JavaScriptTransformer`(Angular Linker)를 거치지 않음. Partial compilation 출력(`ɵɵngDeclareFactory` 등)이 링킹 없이 브라우저에 전달되어 JIT fallback 시도 → `@angular/compiler` 부재로 에러.

**핵심 증거:**
- `@angular/common/fesm2022/_platform_location-chunk.mjs:23` — `ɵɵngDeclareFactory` 직접 확인
- `vite-angular-plugin.ts:308` — `.ts` 파일만 필터
- `JavaScriptTransformer.transformData` API — `skipLinker` 파라미터로 링킹 제어 가능

## 해결 방안

### 방안 A: transform 훅 구조 분리 (선택됨)

현재 하나의 transform 훅에 TS 컴파일 결과 반환과 JS 링킹이 합쳐져 있는 구조를 분리:

| 단계 | enforce | 대상 | 역할 |
|------|---------|------|------|
| 1. TS 컴파일 | `pre` | 프로젝트 `.ts` 파일만 | `AngularCompiler` emit JS 반환 |
| 2. JS 변환 | 일반 | 모든 JS/MJS (프로젝트 + node_modules) | `JavaScriptTransformer`로 partial → full AOT 링킹 |

- `optimizeDeps` 설정 불필요 — Vite pre-bundling 정상 동작
- pre-bundled `.js`, 원본 `.mjs`, 프로젝트 emit JS 모두 2단계에서 링킹
- `JavaScriptTransformer`는 Angular 마커 없는 파일엔 no-op

**수정 대상:** `packages/sd-cli/src/angular/vite-angular-plugin.ts`

- **장점:** 관심사 분리 명확, 모든 Angular 라이브러리 커버, optimizeDeps 불필요
- **반론:** node_modules JS 전체를 transform하므로 cold start 시 약간의 오버헤드 (캐시 후 무시 가능)
- **점수:** 정확성 9/10, 안정성 9/10, 호환성 9/10 → **평균 9.0/10**

### 방안 B: optimizeDeps.exclude + transform 훅 확장

- **반론:** optimizeDeps.exclude로 Angular 패키지를 제외하면 Vite dependency pre-bundling 캐시 포기 → dev 서버 성능 치명적 저하
- **점수:** 평균 5.0/10

### 방안 C: 수행 안 함

- **반론:** 앱 bootstrap 불가
- **점수:** 평균 3.3/10

## 선택 결과

**방안 A** (평균 9.0/10)

TS 컴파일과 JS 변환을 분리하여 구조적으로 해결. optimizeDeps 건드리지 않음.
