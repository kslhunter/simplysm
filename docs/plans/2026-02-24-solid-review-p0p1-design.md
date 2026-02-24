# solid 패키지 리뷰 수정 사항

## P0 #1: Dialog Escape — 최상위만 닫기

**현상:** Escape 시 열린 모든 Dialog가 동시에 닫힘
**원인:** 각 Dialog가 `document` keydown 리스너를 독립 등록, 최상위 여부 미확인

**수정:**
1. `dialogZIndex.ts` — `isTopmost(el)` export 추가
2. `Dialog.tsx:243-246` — Escape 핸들러에 `isTopmost` 가드 + `stopImmediatePropagation`

**동작:** 최상위 Dialog만 Escape로 닫힘. `closeOnEscape: false`이면 무시.

## P0 #2: SharedDataProvider 리스너 누수

**현상:** `addEventListener` Promise resolve 전 unmount 시 리스너 고아 발생
**수정:** `disposed` 플래그 → `.then()`에서 unmount 시 즉시 `removeEventListener`

## P1 #3: CrudSheet/CrudDetail 글로벌 단축키 스코핑

**현상:** `document`에 Ctrl+S 리스너 등록, 여러 인스턴스 동시 반응
**수정:** `containerRef.contains(document.activeElement)` 가드 추가

## P1 #5: createControllableStore onChange 변경 감지

**현상:** setter 호출 시 값 변경 무관하게 항상 `objClone` + `onChange` 실행
**수정:** setter 전후 비교, 변경 시에만 onChange 호출

## P1 #6: useSyncConfig race condition

**현상:** async read 중 외부 setValue 시 stale 값으로 덮어씀
**수정:** write-version 카운터 → async read 중 외부 write 발생 시 read 결과 무시

## P2 #8: 에러 메시지 한국어 통일

**현상:** PrintContext만 영어 에러 메시지
**수정:** `PrintContext.ts` 에러 메시지를 한국어로 변경

## P2 #10: useLogAdapter public export 제거

**현상:** 내부 전용 함수가 `index.ts`의 `export *`로 public 노출
**수정:** `LoggerContext.tsx`에서 `useLogAdapter` export 제거, `useLogger.ts`에서 직접 `useContext` 사용

## P2 #11: createPointerDrag → startPointerDrag

**현상:** imperative 함수가 `create*` 반응형 프리미티브 네이밍 사용
**수정:** `startPointerDrag`으로 리네이밍 + `hooks/` → `helpers/` 이동

## P2 #12: BusyContainer busy/ready JSDoc

**현상:** `busy`와 `ready` props의 동작 차이에 대한 문서 없음
**수정:** `BusyContainerProps`에 JSDoc 추가

## P3 #15: Slot 등록 createSlotComponent 팩토리

**현상:** 동일한 5줄 slot 등록 패턴이 12+ 곳에서 반복
**수정:** `createSlotComponent` 팩토리 함수 추출

## P4 #18-19: 미사용 _rest 제거 + clsx 단순화

**수정:**
- `CrudSheet.tsx`, `CrudDetail.tsx`: `_rest` 제거
- `CrudSheet.tsx`: `clsx("line-through")` → `"line-through"`
