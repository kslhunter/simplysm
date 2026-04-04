# 디버그: Vite defaultEsbuildSupported가 Chrome 61 타겟 변환을 무력화

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** `.tasks/260401220155_legacy-dev-mode` 수행 후 발생한 후속 이슈

## 에러 증상

- **에러 메시지:** `SyntaxError: Unexpected token import` (index-BxpdXC3r.js:1)
- **위치:** PDA Capacitor 앱, legacy dev 모드 (vite build --watch + HTTP 서버)
- **재현:** `.tasks/260401220155_legacy-dev-mode` 수행 후 PDA에서 접속

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: Vite가 supported 강제 주입 (code) | E2: esbuild 직접 실행 시 변환됨 (code) | E3: v12 ESM 동작함 (사용자 증언) |
|----|------|------|------|
| H1: Vite defaultEsbuildSupported가 변환 차단 | C(code) — config.js:6057-6060 | C(code) — 테스트 confirmed | C(code) — v12는 Vite 미사용 |
| H2: Rollup ESM format 문제 | I → 폐기 | I → 폐기 | I → 폐기: v12도 ESM |
| H3: PDA WebView Chrome 61 미만 | N | N | I → 폐기: v12 동작 |

### 결과: 확정 — H1

Vite `node_modules/vite/dist/node/chunks/config.js:6057-6060`:
```javascript
const defaultEsbuildSupported = {
  "dynamic-import": true,
  "import-meta": true
};
```

이 설정이 `esbuild.transform()` 호출 시 `supported` 옵션에 spread되어, `target: "chrome61"`이어도 `import.meta`와 `import()`가 변환되지 않고 그대로 출력됨.

**검증 결과:**
- `supported: { "import-meta": true }` → `import.meta.url` 그대로 출력 (Chrome 61에서 SyntaxError)
- `supported` 미지정 → `const import_meta = {};` 변환됨 (Chrome 61 호환)

WBS에서 "esbuild가 target: chrome61로 import.meta를 자동 치환"한다는 전제로 `sd-legacy-import-meta` 플러그인을 제거했으나, Vite가 이 전제를 무력화함.

## 해결 방안

### 방안 A: esbuild.supported 오버라이드 (추천)

- **설명:** `legacyModule: true`일 때 `esbuild.supported`에서 `import-meta: false, dynamic-import: false` 명시
- **장점:** 근본 원인에 정확히 대응, 최소 코드 변경
- **반론:** Vite가 해당 설정을 둔 이유가 있을 수 있음 (Rollup이 이미 처리한다는 전제)
- **점수:** 호환성 9/10, 근본성 10/10, 안정성 8/10 → **평균 9.0/10**

### 방안 B: sd-legacy-import-meta 플러그인 복원

- **설명:** 삭제한 Vite 플러그인을 복원하여 문자열 치환
- **장점:** 이전 검증 완료된 방식
- **반론:** 설계 회귀, 우회 방식
- **점수:** 호환성 7/10, 근본성 5/10, 안정성 7/10 → **평균 6.3/10**

## 선택 결과

**방안 A** (평균 9.0/10)

`vite-config.ts`의 `legacyModule: true` 블록에서 `esbuild.supported`에 `import-meta: false, dynamic-import: false`를 추가하여 Vite의 강제 설정을 오버라이드.
