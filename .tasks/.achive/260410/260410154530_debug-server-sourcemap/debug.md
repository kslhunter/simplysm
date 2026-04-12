# 디버그: 서버 스택 트레이스에 sourcemap이 적용되지 않음

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: 서버 에러 스택 트레이스가 sourcemap을 통해 원본 소스 파일명과 라인으로 표시 / 실제: `file:///D:/workspaces-14/adtek/packages/server/dist/main.js:109588:18` 처럼 번들된 `main.js`의 라인으로 표시
- **위치:** sd-cli 서버 빌드 (dev 모드) — `packages/sd-cli/src/utils/esbuild-config.ts:77-95`, `packages/sd-cli/src/workers/server-runtime.worker.ts:140-143`
- **재현 절차:** 소비앱에서 `pnpm dev`로 서버 실행 → 서버 에러 발생 시 스택 트레이스 확인

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|            | E1: esbuild sourcemap 옵션 미설정 | E2: --enable-source-maps 미사용 | E3: 클라이언트는 sourcemap 있음 | E4: 브라우저 스택은 원본 표시 |
| ---------- | --------------------------------- | ------------------------------- | ------------------------------- | ----------------------------- |
| H1: esbuild가 sourcemap을 생성하지 않음 | C(code) | N | C(code) | C(code) |
| H2: Node.js에 --enable-source-maps가 없음 | N | C(code) | N | N |

### 결과: 확정 — H1 + H2 (두 조건 모두 필요)

Node.js에서 sourcemap이 스택 트레이스에 반영되려면 두 조건이 모두 충족되어야 한다:
1. **빌드 시 sourcemap 파일 생성** — esbuild `sourcemap` 옵션 필요 (현재: 미설정, 기본값 `false`)
2. **런타임에서 sourcemap 인식** — Node.js `--enable-source-maps` 또는 `process.setSourceMapsEnabled(true)` 필요 (현재: 미설정)

## 해결 방안

### 방안 A: esbuild `sourcemap: "linked"` + `process.setSourceMapsEnabled(true)` (dev 모드만)

- **설명:**
  - `esbuild-config.ts`에서 dev 모드일 때 `sourcemap: "linked"` 추가 → `dist/main.js.map` 생성
  - `server-runtime.worker.ts`에서 import 전에 `process.setSourceMapsEnabled(true)` 호출
- **장점:** dev 모드에서만 적용되므로 프로덕션 번들 크기 영향 없음. `process.setSourceMapsEnabled()`는 Node 20 안정 API
- **반론:** sourcemap 파일 생성으로 dev 빌드 시간 소폭 증가 가능
- **점수:** 정확성 9/10, 변경 리스크 8/10, 디버깅 개선도 9/10 → **평균 8.7/10**

### 방안 B: esbuild `sourcemap: "inline"` + `process.setSourceMapsEnabled(true)` (dev 모드만)

- **설명:** 별도 `.map` 파일 대신 sourcemap을 `main.js` 안에 인라인으로 포함
- **장점:** 별도 파일 관리 불필요
- **반론:** main.js 파일 크기 크게 증가, 메모리/파싱 성능 영향
- **점수:** 정확성 9/10, 변경 리스크 7/10, 디버깅 개선도 9/10 → **평균 8.3/10**

### 방안 C: 수행 안 함

- **장점:** 변경 리스크 0
- **반론:** 서버 디버깅 시 매번 main.js 라인 번호 수동 추적 필요
- **점수:** 정확성 N/A, 변경 리스크 10/10, 디버깅 개선도 1/10 → **평균 5.5/10**

## 선택 결과

**방안 A** (평균 8.7/10)

esbuild `sourcemap: "linked"` + `process.setSourceMapsEnabled(true)` — dev 모드에서만 적용. 프로덕션 영향 없이 가장 깔끔한 방식.
