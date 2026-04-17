# 코드 리뷰: event-plugin-to-directive

> 대상: `.tasks/260416151506_angular-event-plugin-to-directive/*.md` 에 따른 구현 결과
> 범위: `packages/angular/src/core/events/sd-resize.ts`, `sd-intersection.ts`, `packages/angular/src/core/commands/sd-command.ts` 및 7개 사용처 마이그레이션, plugin 제거

## 분석 결과: 이슈 없음

4가지 관점(LOGIC, CONSIST, PERF, DESIGN)에 대해 심층 분석한 결과, Critical/Medium/Low 이슈가 발견되지 않았다.

## 검증 요약

### 로직 검증 (LOGIC)

| 검증 항목 | 결과 |
|---|---|
| SdResizeDirective vs SdResizeEventPlugin 로직 일치 | ✓ RAF debounce, prevWidth/prevHeight 추적, destroy 시 disconnect + cancelAnimationFrame 모두 동일 |
| SdIntersectionDirective vs SdIntersectionEventPlugin 로직 일치 | ✓ `entries[entries.length - 1]` 사용, destroy 시 disconnect 동일 |
| SdCommandDirective vs 3개 command plugin 로직 일치 | ✓ 키 조합 조건(ctrlKey, altKey, shiftKey), shouldProcessCommandEvent 호출, preventDefault/stopPropagation 모두 동일 |
| SdResizeEvent 타입 호환성 | ✓ `heightChanged`, `widthChanged`, `target`, `contentRect` 4개 필드 동일 |
| SdIntersectionEvent 타입 호환성 | ✓ `{ entry: IntersectionObserverEntry }` 동일 |
| hostDirectives outputs 노출 | ✓ sd-dock, sd-modal, sd-echarts에 `outputs: ["sdResize"]` 정확히 설정 |
| hostDirectives outputs 노출 (command) | ✓ sd-data-detail, sd-data-sheet에 `outputs: ["sdRefreshCommand", "sdSaveCommand"]` 정확히 설정 |
| shouldProcessCommandEvent의 element 참조 | ✓ 기존: plugin의 `addEventListener(element, ...)` 파라미터 = 호스트 엘리먼트. 신규: `this._elRef.nativeElement` = 호스트 엘리먼트. 동일 |

### 일관성 검증 (CONSIST)

| 검증 항목 | 결과 |
|---|---|
| directive 파일 위치 패턴 | ✓ `sd-resize.ts`는 `core/events/`, `sd-command.ts`는 `core/commands/` — 기존 폴더 구조 유지 |
| directive 구조 패턴 | ✓ 3개 directive 모두 `inject(ElementRef)`, `inject(DestroyRef)`, constructor에서 observer/listener 등록, `onDestroy`에서 정리 — 동일 패턴 |
| selector 네이밍 | ✓ `[sdResize]`, `[sdIntersection]`, `[sdRefreshCommand],[sdSaveCommand],[sdInsertCommand]` — 기존 이벤트명 유지 |
| import 경로 | ✓ 모든 사용처에서 `../../core/events/sd-resize`, `../../core/commands/sd-command`로 통일 |
| index.ts export 구조 | ✓ `SdResizeDirective`, `SdIntersectionDirective`, `SdCommandDirective`로 일관되게 교체 |

### 성능 검증 (PERF)

| 검증 항목 | 결과 |
|---|---|
| document keydown 리스너 수 | 기존과 동일 — directive 인스턴스당 1개 리스너 (기존 plugin도 바인딩당 1개) |
| ResizeObserver 인스턴스 수 | 기존과 동일 — directive 인스턴스당 1개 observer |
| command directive 통합 효과 | 기존 3개 plugin이 각각 document listener 등록 → 새 directive는 단일 listener에서 3개 키 분기. 동일 엘리먼트 기준 리스너 수 3→1로 감소 |

### 설계 검증 (DESIGN)

| 검증 항목 | 결과 |
|---|---|
| SdEvents에서 커스텀 이벤트 분리 | ✓ SdEvents는 .capture/.passive/.once 옵션 이벤트만 담당 — 단일 책임 원칙 개선 |
| provideSdAngular 정리 | ✓ 5개 plugin 등록 제거, SdOptionEventPlugin만 유지 |
| plugin 파일 완전 삭제 | ✓ 5개 plugin 파일 모두 삭제 확인 (glob 결과 0건) |
| 리소스 해제 | ✓ 3개 directive 모두 `DestroyRef.onDestroy()`에서 observer.disconnect() / removeEventListener 수행 |
| dead code 없음 | ✓ 미사용 import, 미사용 export 없음 |

### 빌드/테스트 검증

| 검증 항목 | 결과 |
|---|---|
| typecheck (`pnpm typecheck -t angular`) | ✓ 0 에러, 0 경고 |
| test (`pnpm test -t angular`) | ✓ 22 passed, 0 failed |
