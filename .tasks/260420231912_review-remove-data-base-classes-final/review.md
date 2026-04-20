# 코드 리뷰: remove-data-base-classes 최종 심층 리뷰

리뷰 대상: `.tasks/260420163508_remove-data-base-classes/wbs.md` 구현 결과
범위: Epic 1~6 (Feature 1.1, 2.1, 3.1, 4.1, 5.1, 6.1) — 모두 `[x]` 완료 상태

## 전체 소견

WBS에 명시된 **핵심 구현·삭제 작업은 완결**되어 있다.

- 삭제 대상 11종 전부 제거 확인: `SdDataSheet`/`Base`/`Column`/Manager 5종/Types, `SdDataDetail`/`Base`, `SdDataSelectButton`/`Base`, `SdBaseContainer`, `withBusy`, `setupCumulateSelectedKeys`, `injectParent`, `TXT_CHANGE_IGNORE_CONFIRM` — 해당 디렉터리 4개(`data-sheet/`, `data-detail/`, `data-select-button/`, `layout/base-container/`) 모두 존재하지 않음 (Bash `ls` 결과)
- `index.ts`에서 고아 export 없음 — 해당 심볼의 export 모두 제거됨
- `injectViewTypeSignal` 신 시그니처(인자 없음) 적용 + 호출처 2개 테스트 재작성 완료
- `<sd-sheet>` `cumulativeSelection` input 추가 + `useSelectionManager` key+`obj.equal` 전환 완료, 전용 spec 4건(`sheet-cumulative-selection.spec.ts`)
- `SdSharedDataSelectButton` 상속 없이 `<sd-modal-select-button>` 컴포지션으로 재구현
- 레시피 4종(`crud-list.md`, `crud-detail.md`, `data-select-button.md`, `page-modal-container.md`) 전부 생성, 관용 규칙(mark 서술, `inset`/`size`, `sortingDefs`+`orderBy`) 반영 확인

아래는 **남은 미비점**이다. 공개 API 깨짐이나 빌드 실패로 이어지는 Critical은 없다.

---

## DOC-001 [Medium] ui-data.md "셀 내용 작성 지침"에 삭제된 `<sd-data-sheet-column>` 예시 잔존

- **위치:** `packages/angular/docs/ui-data.md:181-209`

문서 헤더(`packages/angular/docs/ui-data.md:181`)가 `**셀 내용 작성 지침** (\`sd-sheet-column\` / \`sd-data-sheet-column\` 공통):`로 되어 있고, 이어지는 예시 코드 블록 3곳(`:189, :193, :196, :209`)이 `<sd-data-sheet-column ...>...</sd-data-sheet-column>` 셀렉터를 사용한다.

하지만 `SdDataSheetColumn`은 Feature 1.1에서 삭제되었고(`packages/angular/src/data/data-sheet/` 디렉터리 전체 부재), 레시피 체계에서는 `<sd-sheet-column>`만 사용한다. 문서를 복붙하는 소비자는 `'sd-data-sheet-column' is not a known element` 템플릿 컴파일 에러를 만나게 된다.

**개선 방향:**
- 헤더에서 `/ sd-data-sheet-column 공통` 문구 제거
- 예시 코드블록 3개의 `<sd-data-sheet-column>` → `<sd-sheet-column>`으로 전부 교체

---

## DOC-002 [Low] CLAUDE.md `useSelectionManager` 시그니처 설명에서 `trackByFn` 입력 누락

- **위치:** `packages/angular/CLAUDE.md:154`

`use 함수 / useSelectionManager`: "displayItems, selectedItems, selectMode, getItemSelectableFn signal을 받아..."

그러나 실제 구현(`packages/angular/src/core/selection/useSelectionManager.ts:9`)과 `docs/utils.md:102`에는 다섯 번째 입력 `trackByFn: Signal<(item, index) => unknown>`이 추가되었다. 이는 Feature 5.1에서 **key+`obj.equal` 비교 전환**의 핵심 의존성이다. CLAUDE.md만 옛 설명 그대로 남아 있어, 본 패키지 내부 개발자가 CLAUDE.md를 참고할 때 혼선이 생긴다.

**개선 방향:** CLAUDE.md:154 `useSelectionManager` 입력 나열에 `trackByFn`을 추가. `utils.md:94`의 "trackByFn이 반환하는 key를 기준으로 obj.equal(deep equal) 비교" 한 줄 요약도 옮기면 충분.

---

## DOC-003 [Low] `<sd-sheet>` `cumulativeSelection` 설명에 "초기 마운트 시 초기값 보존" 동작 미기재

- **위치:** `packages/angular/docs/ui-data.md:86` (cumulativeSelection 설명) vs. 구현 `packages/angular/src/data/sheet/sd-sheet.ts:705-720`

구현은 `_resetOnItemsChangeSkipFirst` 플래그로 **effect 첫 실행을 skip**하여 "소비자가 넘긴 초기 `selectedItems`"를 보존한다(sd-sheet.ts:707-713 주석 "첫 실행(초기 마운트)은 skip하여 소비자가 넘긴 초기 selectedItems 값을 보존한다"). 그러나 WBS 5.1 D설계 본문(wbs.md:250)은 `cumulativeSelection=false`에서 "items 변경 시 `selectedItems.set([])`로 완전 초기화"만 기술했고, ui-data.md의 설명도 "items 변경 시 `selectedItems`를 `[]`로 초기화"로 끝난다.

실용적으로 정당한 예외 동작이나, 문서에 없으면 소비자가 "items 초기 로드 타이밍"에서 기대치가 엇갈릴 수 있다(테스트 `sheet-cumulative-selection.spec.ts:122-136`가 이 동작에 의존).

**개선 방향:** `docs/ui-data.md:86`의 `cumulativeSelection` 설명에 한 줄 추가 — "초기 마운트 시점(최초 `items` 구독)의 `selectedItems`는 보존되며, 이후 items 변경부터 초기화가 적용된다".

---

## LOGIC-001 [Low] `useSelectionManager.keyOf`의 displayItems 미포함 item에 대한 `index=0` fallback

- **위치:** `packages/angular/src/core/selection/useSelectionManager.ts:47-50`

```typescript
function keyOf(item: T): unknown {
  const idx = displayItemIndexMap().get(item);
  return options.trackByFn()(item, idx ?? 0);
}
```

누적 모드(`cumulativeSelection=true`)에서 `selectedItems`는 **현재 `displayItems`에 없는 다른 페이지 item**을 포함할 수 있다. 이 경우 `displayItemIndexMap().get(item)`은 `undefined`가 되어 `?? 0`으로 index 0이 전달된다.

- `trackByFn`이 `(item) => item.id` 같은 **index 미사용 형태**면 문제 없음 (실사용 99%)
- `trackByFn`이 `(item, index) => \`${item.category}_${index}\`` 같은 **index 의존 형태**면 잘못된 key가 계산되어 `isSelected` 판정이 틀린다

`docs/ui-data.md:86`에서 "기본 `(item) => item`은 reference 반환이라 서버 페이지네이션에서 복원 실패"는 안내하고 있지만, **index 미사용 전제**는 명시되어 있지 않다.

**개선 방향:** 둘 중 하나.
- (A) `docs/ui-data.md`의 `cumulativeSelection` 절에 "누적 모드에서는 `trackByFn`이 **index에 의존하지 않아야 한다**(item 속성만으로 key 생성)"를 주의사항으로 추가
- (B) `keyOf`에서 `selectedItems`의 index를 우선 조회하도록 `selectedItems()`의 `Map<T, number>`도 함께 유지하여 정확한 index 전달

(A)가 구현 변경 없이 실용 충분. (B)는 오버엔지니어링.

---

## 리뷰 범위에서 확인된 정상 사항 (참고)

아래 항목은 검증 결과 **이슈 없음**으로 확인되어 기록만 남긴다.

- 잔존 참조 전수조사: `SdDataSheetBase|SdDataSheetColumn|SdDataDetailBase|SdDataSelectButtonBase|SdBaseContainer|injectParent|TXT_CHANGE_IGNORE_CONFIRM|setupCumulateSelectedKeys|withBusy` Grep 결과, **코드·non-recipe 문서에서 잔존 0**. `docs/recipes/*.md`의 "제거된 추상화" 안내/마이그레이션 매핑 표는 의도된 기록.
- 테스트 삭제/재작성 일관성: 삭제된 호스트 클래스(`DSTestHost`, `DDTestHost`, `DSBTestHost`) 및 `inject-parent-test.fixture.ts`, `with-busy.spec.ts` 등 전수 삭제. `SDSBTestHost` 독립 fixture로 shared-data-select-button 스펙 재작성.
- `injectViewTypeSignal` 신 시그니처 적용 — 호출처 2개 (`tests/core/modal/modal-integration.spec.ts`, `tests/core/routing/view-signals-router-guard.spec.ts`) 모두 `injectViewTypeSignal()` 인자 없이 호출, `ElementRef` mock provider로 `reflectComponentType().selector` vs `tagName` 비교 테스트 완결.
- 레시피 4종의 관용 규칙 반영: `crud-list.md:755-779`에 규칙 1~3 모두 포함 (inset/size, mark(sig), sortingDefs+orderBy). `crud-detail.md:839`에 mark(sig) 규칙 반복. "orderBy string overload" 사용 확인(crud-list.md:774-775).
- `SdSharedDataSelectButton` 재구현: 상속 0, `<sd-modal-select-button>` 컴포지션 + 내부 effect로 `value`/`items` 자동 동기화(`sd-shared-data-select-button.ts:81-96`).
- `cumulativeSelection` 테스트 커버리지: 5개 Scenario가 WBS 5.1 요구 4개 케이스(기본 동작 회귀, 누적 유지, 외부 reset, 같은 key 다른 reference 복원) + 초기값 보존(skipFirst 검증)를 전부 커버.
- index.ts 공개 표면: `SdDataSheet*`, `SdDataDetail*`, `SdDataSelectButton*`, `SdBaseContainer`, `withBusy`, `setupCumulateSelectedKeys`, `injectParent`, `TXT_CHANGE_IGNORE_CONFIRM` export 전부 제거됨 (Read 확인 2026-04-20).

---

## 우선순위 및 권장 조치

| 순위 | ID | Severity | 조치 |
|------|----|----|------|
| 1 | DOC-001 | Medium | ui-data.md:181-209 예시 교체 (10분 작업) |
| 2 | DOC-002 | Low | CLAUDE.md:154 `trackByFn` 추가 (1줄) |
| 3 | DOC-003 | Low | ui-data.md:86 skipFirst 한 줄 추가 |
| 4 | LOGIC-001 | Low | ui-data.md에 trackByFn index 비의존 권장 추가 |

4건 모두 **문서/주석 개선** 수준으로, 공개 API 재변경이나 코드 재작성은 필요 없다. 한 번의 docs 커밋으로 일괄 정리 가능하다.
