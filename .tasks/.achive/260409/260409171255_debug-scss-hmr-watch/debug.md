# 디버그: replaceDeps SCSS 파일 변경 시 Vite HMR 미동작

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: `packages/angular/scss/commons/_styles.scss` 수정 → 소비앱(`adtek/client-admin`) HMR 동작 / 실제: 변경 감지 자체 안 됨
- **위치:** `packages/sd-cli/src/utils/vite-scope-watch-plugin.ts:47-51`
- **재현 절차:** `sd-cli dev`로 소비앱 실행 → `packages/angular/scss/commons/_styles.scss` 수정 → HMR 미반응

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|            | 증거1: scopeWatch가 `dist/`만 감시 | 증거2: watchReplaceDeps는 scss 제외 안 함 | 증거3: Vite에 `server.watch` 미설정 | 증거4: handleHotUpdate에 scss 처리 로직 존재 |
| ---------- | ---------------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------------------- |
| H1: scopeWatch가 `dist/`만 감시하여 `scss/` 누락 | C(code) | C(code) | C(code) | C(code) |
| H2: watchReplaceDeps가 scss 미감지 | N | I(code) | N | N |
| H3: Vite 기본 node_modules 제외 | C(code) | N | C(code) | C(code) |

### 결과: 확정 — H1

- H2 폐기: `replace-deps.ts:340-343`의 `EXCLUDED_NAMES`에 scss 없음 (I 증거)
- H3은 H1의 배경 원인 (scopeWatch 플러그인이 존재하는 이유)
- H1 확정: `vite-scope-watch-plugin.ts:47-51`에서 watch 경로가 `dist/`로 하드코딩

**근본 원인 흐름:**
```
_styles.scss 수정
  → watchReplaceDeps 감지 → node_modules/@simplysm/angular/scss/에 복사 ✅
  → sdScopeWatchPlugin은 node_modules/@simplysm/angular/dist/ 만 감시 ❌
  → Vite는 node_modules를 기본 제외 ❌
  → handleHotUpdate 호출 안 됨 ❌
  → HMR 미동작
```

## 해결 방안

### 방안 A: 패키지 루트 전체 감시

- **설명:** `sdScopeWatchPlugin`에서 `dist/`만 감시하는 대신 패키지 루트 전체를 감시하고 `node_modules` 등만 제외
- **장점:** 단순한 수정, SCSS 외 다른 비-dist 디렉토리도 자동 커버
- **반론:** 불필요한 이벤트가 증가할 수 있으나 Vite module graph에 없는 파일은 무시됨
- **점수:** 완전성 9/10, 변경 리스크 8/10, 유지보수성 8/10 → **평균 8.3/10**

### 방안 B: package.json files 기반 감시

- **설명:** `package.json`의 `files` 필드를 파싱하여 배포 대상 디렉토리만 감시
- **장점:** 정확하게 배포 대상만 감시, 불필요한 이벤트 최소화
- **반론:** 파싱 로직 추가, `files` 필드 미존재 시 폴백 필요
- **점수:** 완전성 10/10, 변경 리스크 7/10, 유지보수성 7/10 → **평균 8.0/10**

### 방안 C: 수행 안 함

- **설명:** 코드 변경 없음
- **장점:** 변경 리스크 없음
- **반론:** SCSS HMR 계속 미동작
- **점수:** 완전성 0/10, 변경 리스크 10/10, 유지보수성 5/10 → **평균 5.0/10**

## 선택 결과

**방안 A** (평균 8.3/10)

패키지 루트 전체 감시. 단순하고 범용적이며, `scss/` 외 다른 비-dist 디렉토리도 자동 커버.
