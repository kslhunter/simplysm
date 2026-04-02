# 디버그: browserslist 설정에도 modern syntax가 트랜스파일되지 않음

## 출처

- **origin:** `simplysm/simplysm#13`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 에러 증상

- **에러 메시지:** `Uncaught SyntaxError: Unexpected token ?`
- **위치:** sd-cli Vite 빌드 출력 번들 (Chrome 61 환경에서 로드 시)
- **재현:** `sd.config.ts`에서 `browserSupport.browserslist: ["chrome 61"]` 설정 후 `pnpm build` 또는 `pnpm dev` 실행 → Chrome 61에서 `?.`/`??` 구문 오류 발생

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: `build.target` 미설정 (vite-config.ts:150-161) | E2: Vite 기본 build.target = chrome107 (resolveConfig 확인) | E3: `?.`/`??`는 Chrome 80+에서 지원 (MDN) | E4: `esbuild.target`과 `build.target` 독립 (resolveConfig 확인) |
|----|---|---|---|---|
| H1: `build.target` 미설정 | C(code) | C(code) | C(doc) | C(code) |
| H2: Angular 플러그인 우회 | N | N | N | C(infer) → H1의 하위 문제로 흡수 |
| H3: node_modules .js 미처리 | N | C(code) | C(doc) | N → H1의 하위 문제로 흡수 |

### 결과: 확정 — H1

`vite-config.ts`에서 `esbuild.target`만 `browserslistToEsbuild()` 결과로 설정하고, `build.target`은 설정하지 않는다. Vite 7.3의 기본 `build.target`은 `['chrome107', 'edge107', 'firefox104', 'safari16']`이며, Chrome 107은 `?.`/`??`를 지원하므로 최종 빌드 번들에서 이 연산자들이 트랜스파일되지 않는다. C(code) 3건, C(doc) 1건으로 확정.

## 해결 방안

### 방안 A: `build.target`에 `esbuildTarget` 적용

- **설명:** `vite-config.ts`의 config 객체에 `build: { target: esbuildTarget }` 추가
- **장점:** 최소 변경으로 근본 원인 직접 해결
- **반론:** dev 모드의 pre-bundled dependency까지는 커버하지 못할 수 있음
- **점수:** 안정성 9/10, 정확성 10/10, 일관성 10/10 → **평균 9.7/10**

### 방안 B: `build.target` + `optimizeDeps.esbuildOptions.target` 모두 적용

- **설명:** `build.target`과 `optimizeDeps.esbuildOptions.target`을 모두 `esbuildTarget`으로 설정
- **장점:** build/dev 모드 모두 완전한 syntax downleveling 보장. Vite 버전 업그레이드에도 기본값 변경에 영향받지 않음
- **반론:** `optimizeDeps.esbuildOptions.target`이 실제로 불필요한 중복 설정일 수 있음
- **점수:** 안정성 10/10, 정확성 10/10, 일관성 10/10 → **평균 10/10**

### 방안 C: 수행 안 함

- **설명:** 코드 변경 없음
- **장점:** 변경 리스크 없음
- **반론:** 버그 지속, Chrome 61 환경에서 앱 실행 불가
- **점수:** 안정성 1/10, 정확성 1/10, 일관성 1/10 → **평균 1/10**

## 선택 결과

**방안 B** (평균 10/10)

`build.target`과 `optimizeDeps.esbuildOptions.target`을 모두 `esbuildTarget`으로 설정하여 build/dev 모드 모두에서 완전한 syntax downleveling을 보장한다.
