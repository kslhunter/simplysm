# 디버그: sd-cli dev에서 replaceDeps 라이브러리 수정 시 무한 리빌드

## 출처

- **origin:** `direct` — 사용자 직접 입력

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: `sd-theme-provider.ts` 수정 시 한 번 리빌드 후 정상 종료 / 실제: client-admin과 client-pda가 ~200ms 간격으로 무한 교대 리빌드
- **위치:** `packages/sd-cli/src/angular/vite-angular-plugin.ts` — `handleHotUpdate` 훅
- **재현 절차:**
  1. simplysm에서 `pnpm watch` 실행
  2. adtek(소비 프로젝트, `replaceDeps: { "@simplysm/*": "../simplysm/packages/*" }`)에서 `pnpm dev` 실행
  3. `packages/angular/src/core/providers/sd-theme-provider.ts` 수정
  4. client-admin/client-pda가 무한 리빌드

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|            | E1: 교대 리빌드 (비배칭) | E2: ~200ms 간격 | E3: 무한 반복 | E4: sdScopeWatchPlugin 개별 emit |
|---|---|---|---|---|
| H1: handleHotUpdate 배칭 부재 | C(code) | C(code) | C(code) | C(code) |
| H2: self-copy (actualTargetPath=resolvedSourcePath) | C(code) | C(code) | C(code) | N |
| H3: Vite chokidar Windows 중복 이벤트 | I | I | I | N |

### 결과: 확정 — H1

**`sdScopeWatchPlugin`이 N개 파일 변경을 개별 `server.watcher.emit("change")`로 전달 → Vite가 `handleHotUpdate`를 N번 호출 → Angular 플러그인이 N번 리컴파일.**

상세 흐름:
1. simplysm `pnpm watch`가 angular 패키지 빌드 → `dist/`에 `.js`, `.d.ts` 등 다수 파일 출력
2. adtek `watchReplaceDeps`가 `simplysm/packages/angular/` 전체를 감시 → `src/` + `dist/` 변경을 `node_modules/.pnpm/.../angular/`로 복사
3. `sdScopeWatchPlugin`이 복사된 파일을 감지 → **파일마다** `server.watcher.emit("change")` 호출
4. Vite가 각 emit에 대해 `handleHotUpdate` 호출 → Angular 플러그인이 `.ts` (`.d.ts` 포함) 파일마다 개별 `pipeline.update()` + `onBuildStart`/`onBuild` 실행
5. `DebounceQueue`의 "실행 중 즉시 재실행" 동작과 결합되어, `watchReplaceDeps` 복사가 연쇄적으로 발생하면서 무한 리빌드처럼 보임

H2(self-copy)는 `adtek/node_modules/@simplysm/angular` → `.pnpm/` 저장소로 확인되어 배제.

## 해결 방안

### 방안 A: handleHotUpdate에 배칭 추가

- **설명:** `handleHotUpdate` 호출 시 즉시 리컴파일하지 않고 `pendingHmrFiles` Set에 수집, 100ms debounce 후 **한 번의** `pipeline.update()`로 처리
- **장점:** N번 리컴파일 → 1번으로 감소, 기존 단일 파일 HMR도 정상 동작
- **반론:** 100ms debounce로 인해 단일 파일 HMR이 기존보다 100ms 느림. 배치 처리 후 개별 모듈 HMR 대신 full-reload 사용
- **점수:** 근본해결 9/10, 변경리스크 7/10, 일관성 8/10 → **평균 8.0/10**

## 선택 결과

**방안 A** (평균 8.0/10)

`vite-angular-plugin.ts` 수정:
- `hmrLock` 제거 → `pendingHmrFiles` (Set) + `hmrBatchTimer` 도입
- `handleHotUpdate`: 파일을 Set에 수집하고 100ms debounce 타이머 설정, `return []`로 Vite 개별 처리 억제
- `processHmrBatch()` 신규 함수: debounce 만료 시 수집된 파일을 단일 `pipeline.update()`로 처리, `full-reload` 전송

테스트 결과: 무한 리빌드 해소 확인. 의존성 변경 감지는 여러 번 뜨지만 리빌드는 배칭되어 client별 1회씩만 실행 후 정지.
