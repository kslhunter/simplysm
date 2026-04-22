# 코드 리뷰: angular-recipes-rewrite 최종 심층 리뷰

**대상 범위:** `packages/angular/docs/recipes/**/*.md` 18개 파일 (wbs Feature 1.1 / 2.1–2.8 / 3.1–3.7 / 4.1–4.2)

**리뷰 관점:** `.tasks/260422230050_angular-recipes-rewrite/wbs.md` 및 각 Feature plan 대비 구현(재작성된 recipe .md)의 정합성, LLM 소비자가 **첫 시도에 올바른 코드 작성** 가능 여부, `@simplysm/angular` / `@simplysm/orm-common` / `@simplysm/excel` / `@simplysm/core-common` 실제 API 정합성.

---

## LOGIC-001 [Critical] `updateAsync` — ORM에 존재하지 않는 메서드

- **위치:** `packages/angular/docs/recipes/crud-list/extension-f-modal-edit.md:98`

확장 F 포인트 내 "선택 삭제/복구 bulk API" 스니펫에서 `db.customer().where((c) => [expr.in(c.id, ids)]).updateAsync(() => ({ isDeleted: del }))`를 사용하는데, `@simplysm/orm-common`의 `Queryable`에는 `updateAsync` 메서드가 없다. 실제 메서드는 `update`(`packages/orm-common/src/exec/queryable.ts:1519`)이며, 동일 레시피 계열의 다른 확장(`crud-list/extension-a-inline-edit.md:347`의 `_upsertItem`, `crud-list/extension-b-selection.md:81`, `crud-detail/extension-b-delete-restore.md:82`)은 모두 `.update(...)`를 사용한다. LLM 소비자가 이 스니펫을 그대로 복사하면 컴파일 오류(존재하지 않는 프로퍼티) 또는 런타임 오류로 이어진다.

**개선 방향:** `.updateAsync(...)` → `.update(...)`로 교체. 동일 파일의 sibling 확장과 용어 일관성 확보.

---

## LOGIC-002 [Critical] `oneWayDiffs` 결과 필드명/ORM 메서드명 오류 (복합 상세)

- **위치:** `packages/angular/docs/recipes/crud-detail/extension-f-complex-detail.md:175-178`

`onSubmit`의 주석 예시에서 `d.target`으로 diff 결과를 참조하는데, `ArrayOneWayDiffResult<TItem>`의 실제 필드는 `{ type, item, orgItem }`뿐이다(`packages/core-common/src/extensions/arr-ext.types.ts:303-307`). `target` 필드는 없다. 같은 예시의 `db.customerBox.insertAsync(...)` / `updateAsync(...)`도 `Queryable`에 없는 메서드다(LOGIC-001과 동일 원인). 파일 상단 포인트(L168)는 "반환 type은 3종"을 정확히 서술하는데 바로 아래 예시가 틀린 필드명을 쓰므로 독자가 타입 구조를 오해하게 된다.

```typescript
// 현재 (틀림)
if (d.type === "create") await db.customerBox.insertAsync(d.target);
else if (d.type === "update") await db.customerBox.updateAsync(d.target);

// 올바름
if (d.type === "create") await db.customerBox().insert(d.item);
else if (d.type === "update") await db.customerBox().where(...).update(() => d.item);
```

**개선 방향:** `d.target` → `d.item`으로 교체. ORM 호출 형태를 다른 레시피(`crud-list/extension-a-inline-edit.md`의 `_upsertItem`)의 `db.customer()` 쿼리빌더 체이닝 형태에 맞춰 재작성.

---

## LOGIC-003 [Medium] Angular 템플릿 속성 사이에 HTML 주석 삽입

- **위치:** `packages/angular/docs/recipes/crud-list/extension-b-selection.md:158-161`

diff 가시화를 위해 엘리먼트 태그 내부 속성 사이에 `<!-- ← 추가 -->` 주석을 배치했다.

```html
<sd-sheet
  ...
  [selectMode]="'multi'"                      <!-- ← 추가 -->
  [(selectedItems)]="selectedItems"           <!-- ← 추가 -->
  [trackByFn]="trackByFn"
  [getItemCellStyleFn]="getItemCellStyleFn"   <!-- ← 추가 (삭제 행 취소선) -->
>
```

HTML 명세상 start tag 내부(attribute 영역)에는 주석을 둘 수 없고, Angular 템플릿 컴파일러도 이를 파싱 오류로 처리한다. LLM 소비자가 이 블록을 그대로 채택하면 즉시 컴파일 실패한다. sibling 확장(c/d/g)은 `<!-- ↓ 확장 B가 추가 -->`를 엘리먼트 레벨에서만 배치해 문제가 없다.

**개선 방향:** 주석을 속성 뒤(다음 줄) 또는 코드 블록 바깥 산문으로 이동. "추가된 속성"은 별도 불릿 리스트로 빼거나 diff 주석 대신 강조 표기(예: `[+ selectMode]`)로 대체.

---

## CONSIST-001 [Medium] 자료형 정의·필드 포함 여부가 확장 간 불일치 (ICustomer)

- **위치:** `packages/angular/docs/recipes/crud-list/extension-a-inline-edit.md:59-66`, `crud-list/extension-b-selection.md:34-37`

확장 A의 `ICustomer`는 `id?: number`, `name?: string`, `phone?: string`, `categoryId?`, `lastModifiedAt?`, `lastModifiedBy?`로 **모든 필드를 optional**로 둔다. 반면 진입점 `crud-list.md:79-83`의 `ICustomer`는 `id: number` (required), `name: string`, `phone?`로 일부 required다. 확장 B(L34-37)는 "기존 필드 + `isDeleted: boolean`"만 언급하며 required/optional 구분을 생략한다.

LLM이 확장 A 코드로 upsert를 실행할 때 `item.name!` non-null 단정(`_upsertItem` L342)이 강제되고, `name: item.name!` 같은 잔존 패턴이 발생한다. 원래 도메인은 `name`/`id`를 신규 행에서만 nullable로 다루는 의도인데, optional 전체화는 불필요한 단정을 유도한다.

**개선 방향:** 확장 A의 ICustomer 주석에 "신규 행 표현용으로 일괄 optional" 의도를 명시하거나, `id?: number`는 유지하되 `name: string`, `phone?: string`은 required로 복원해 `item.name!` 단정을 제거. 진입점과 확장 간 동일 도메인의 변화 이유를 한 줄로 병기.

---

## CONSIST-002 [Medium] diff 스타일 pseudo-code와 `typescript` 코드 펜스 혼용

- **위치:** `packages/angular/docs/recipes/crud-list/extension-a-inline-edit.md:27-359`, 유사 패턴 `crud-list/extension-b-selection.md`, `crud-detail/extension-a-edit-save.md`, `crud-detail/extension-c-modal-view.md` 등

확장 파일 대부분이 하나의 ` ```typescript ` 블록 안에 "1) imports 교체 … 2) @Component 변경 … 3) DI 추가 …" 형태의 단계별 조각을 배치한다. 문법적으로는 `@Component({...})` 데코레이터가 클래스 선언과 분리되고(L70-88), 이어서 `private readonly _appAuth = inject(...)` (L91)가 클래스 바깥에 나온 뒤, `constructor() { ... }` (L111-114)가 또 클래스 바깥에 있다. 독자가 "diff 조각"으로 이해해야 정상 작동하지만, 코드 펜스 언어가 `typescript`라 LLM은 완성 코드로 오인해 IDE에 그대로 붙여넣으면 **전부 파싱 실패**한다.

동시에 진입점(`crud-list.md`, `crud-detail.md`, `page-modal-container.md`, `data-select-button.md`)과 `crud-list/extension-e-readonly-modal.md`, `crud-detail/extension-f-complex-detail.md`는 클래스 전체를 완성 형태로 제시한다. 확장마다 제시 방식이 달라 재사용 비용이 높다.

**개선 방향:** 두 가지 중 하나를 표준으로 선택. (a) diff 조각은 `` ```diff `` / `` ```ts {diff} `` 코드 펜스로 표시하거나 "스니펫" 헤딩을 명시해 완성본과 구분. (b) 모든 확장을 완성 클래스로 재작성(체계적 분량 증가). plan D2 (sibling diff 스타일 템플릿 정렬)의 "diff만 보이기" 의도는 유지하되, LLM의 복사 오해를 차단할 수단을 최소 한 가지는 추가.

---

## CONSIST-003 [Low] 앱별 의존(`AppOrmProvider`, `useSharedSignal` 등)과 `@simplysm/angular` 경계의 표시 불균일

- **위치:** `_common-rules.md:125`, `crud-list/extension-a-inline-edit.md:50-52`, `crud-detail/extension-e-auxiliary.md:11,23,85`

`_common-rules.md`의 "공유 데이터 사용 화면" 판단 기준은 "`useSharedSignal` / `getHandle` / `emitAsync` 중 하나라도 사용하면"이라고 명시하는데, `useSharedSignal`은 `@simplysm/angular` export가 아니라 각 앱(예: `@adtek/client-common`)이 `SdSharedDataProvider` 위에 정의하는 공용 훅이다. 확장 E(L85)는 이 사실을 명시하지만, `_common-rules.md`는 그 주의가 빠져 있다. LLM이 `@simplysm/angular`에서 `useSharedSignal`을 import하려 해 실패할 수 있다.

또한 extension-a의 imports(L50-52)에서 `AppOrmProvider`, `AppSharedDataProvider`, `useSharedSignal` 셋 모두 `@adtek/client-common`에서 오는데, 주석 "앱별 대체" 표기는 첫 줄에만 있어 `useSharedSignal`의 출처가 분리 표시되어 있지 않다.

**개선 방향:** `_common-rules.md`의 판단 기준 문장에 "`useSharedSignal` 등은 앱별 훅"을 괄호로 덧붙이고, 각 확장의 import 섹션에서 `@simplysm/*` 패키지 vs `@adtek/client-common`(앱 예시) 경계를 주석·그룹 분리로 일관 표기.

---

## CONSIST-004 [Low] `_refresh` 시그니처 및 snapshot 갱신 위치 불일치

- **위치:** `crud-list/extension-a-inline-edit.md:299-304`, `crud-list/extension-b-selection.md:102-112`

확장 A의 `_refresh`는 "검색 → items/page 세팅 → `_itemsSnapshot = obj.clone(r.items)` 한 줄 추가"를 최종 상태로 제시한다. 확장 B(L102-112)의 `_refresh`는 **같은 메서드를 다시 재정의**하면서 "선택 유지 로직" + snapshot 갱신을 중간 삽입한다. 확장 C는 다시 B의 `_refresh`를 재사용한다고 가정하지만 본문에는 `_refresh` 블록이 없다. 누적 확장에서 `_refresh` 메서드 본문이 확장별로 어떻게 합쳐지는지(순서 보장) 독자가 매번 추론해야 하며, 특히 snapshot 갱신 위치("말미")와 "선택 유지"(말미 직전)가 줄 순서에 의존한다는 사실이 흐리다.

**개선 방향:** 누적되는 `_refresh` 메서드는 확장마다 "전체 메서드 최종본"을 한 번 더 제시하거나, 명확한 마커 주석("// ← 확장 B 추가 블록 시작/끝")으로 삽입 위치를 고정.

---

## DESIGN-001 [Medium] Markdown anchor 링크의 slug 산출 편차 위험

- **위치:** `crud-list/extension-a-inline-edit.md:365-371` 등 다수 — `_common-rules.md`의 헤더로 링크하는 anchor들

recipe 전반이 `_common-rules.md`로 광범위하게 1-hop 링크를 위임한다(plan의 핵심 전략). 그러나 대상 헤더들은 백틱·괄호·큰따옴표·하이픈을 포함해 GitHub/VSCode/npmjs 각각 slugify 규칙이 다르다. 예:

- 헤더 `### \`mark(sig)\`를 "저장 감지" 수단으로 사용하지 않는다` → 링크 anchor `#marksig를-저장-감지-수단으로-사용하지-않는다` (본문에서 사용)
- 헤더 `### 시트 셀 내부 컨트롤에 \`[inset]="true" [size]="'sm'"\`을 명시한다` → `#시트-셀-내부-컨트롤에-insettrue-sizesm을-명시한다`

소비 프로젝트의 Claude Code가 어떤 Markdown 렌더러를 쓰든(파일 시스템에서 raw read하는 경우 anchor 자체가 불필요), GitHub 렌더링 뷰에서 보는 개발자(2차 독자, plan Actor B)에게는 깨진 링크로 보일 위험이 있다. 현행 링크 anchor는 대부분 GitHub 규칙 기반인데, 일부(예: `injectViewTypeSignal`의 괄호) 규칙을 일관 준수했는지 전수 검증이 필요하다.

**개선 방향:** Markdown 링크 검증 스크립트(예: `markdown-link-check`)를 `packages/angular/tests/docs/cross-reference-integrity.verify.md` 검증 경로에 추가 연결. 최소한 `_common-rules.md`를 타깃으로 하는 링크는 자동 검사.

---

## DESIGN-002 [Low] 진입점 최소 뼈대의 "감사 필드" 포함 범위 불일치

- **위치:** `crud-list.md:75-302` vs `crud-detail.md:54-228`

`crud-list.md` 최소 뼈대는 `ICustomer`에 감사 필드(`lastModifiedAt`/`lastModifiedBy`)를 두지 않는다. `crud-detail.md` 최소 뼈대는 두 필드를 포함하고 템플릿에도 "최종수정:" 블록을 렌더한다. 동일 도메인(`ICustomer`)인데 두 진입점의 필드 범위가 달라 LLM이 두 파일을 함께 읽을 때 "진입점이 다루는 최소 컬럼"이 무엇인지 모호해진다. crud-list는 확장 A에서 감사 필드를 도입하는 구조(wbs Feature 2.2 범위)이나, 최소 뼈대 설명에는 "기본 읽기 전용 리스트" 범위라고만 설명돼 있어 누락 이유가 드러나지 않는다.

**개선 방향:** 두 진입점의 "이 최소 뼈대가 포함하지 않는 것" 목록을 "조건부 요소 포함 기준" 표 아래에 한 줄로 병기(crud-list: 감사/카테고리/편집 권한 제외, crud-detail: 포함). 또는 crud-detail도 확장 A로 옮기고 진입점은 name/phone만 유지.

---

## DESIGN-003 [Low] 확장 F(crud-list)의 "제거 대상" 설명과 코드 예시의 간극

- **위치:** `crud-list/extension-f-modal-edit.md:16,73-79`

확장 F는 확장 A와 **상호 배타**이며, A 적용 후 F로 전환할 때 "제거 대상" 11종(`hostDirectives.sdSaveCommand` / `onSaveButtonClick` / `onSubmit` / `diffs` / `_itemsSnapshot` / …)을 나열한다. 하지만 해당 코드 예시는 "제거 후 최종 상태"를 **완성 클래스로 보여주지 않고** "제거 대상 목록 + 신규 추가분"만 나열한다(L73-79 코멘트 블록). 독자는 확장 A의 완성본에서 해당 목록을 직접 들어내는 작업을 수행해야 하며, 경계 오류(예: `onRefreshButtonClick` 내부 `if (!this._checkIgnoreChanges()) return;` 삭제 여부) 가능성이 있다.

**개선 방향:** 확장 F 최종 상태의 핵심 필드/메서드 목록(최소한의 "남는 것")을 한 번 더 체크리스트로 나열하거나, "확장 A를 적용하지 않은 상태에서 F만 얹은 완성 클래스"를 code fence로 첨부.

---

## DESIGN-004 [Low] verify.md 중 일부만 존재 — 품질 게이트 커버리지 불균일

- **위치:** `.tasks/260422230050_angular-recipes-rewrite/*.verify.md`

verify 파일은 `common-rules.verify.md`, `crud-list.verify.md`, `data-select-button.verify.md`, `page-modal-container.verify.md`, `2.2-crud-list-extension-a-inline-edit-rewrite.verify.md`, `3.1-crud-detail-rewrite.verify.md` 6개만 존재한다. wbs 기준 13개 extension 중 2.2 / 3.1만 개별 verify가 있고, 2.3–2.8 / 3.2–3.7은 verify 산출물이 없다. wbs는 모든 Feature를 `[x]` 완료로 표기하나, 품질 검증의 일관성 확보 측면에서 확장 간 격차가 크다.

**개선 방향:** 남은 extension에 대한 verify checklist를 일괄 추가하거나, "완료 기준 체크리스트"를 1.1/2.1/3.1 verify에 포함된 기준을 근거로 통합 verify 1건으로 대체. (품질 관점으로는 검증되지 않은 확장에서 위 LOGIC-001~003이 잔존할 개연성이 현재 실제로 드러남)

---

## 요약

- **Critical 2건** (LOGIC-001, LOGIC-002): ORM 메서드명·diff 결과 필드명 오류. LLM 소비자가 그대로 복사 시 컴파일 실패로 직결. 즉시 수정 필요.
- **Medium 4건** (LOGIC-003, CONSIST-001/002, DESIGN-001): 템플릿 파싱 오류 유발 주석, 도메인 타입 required/optional 편차, 완성 코드 vs diff 스니펫 혼용, anchor 링크 검증 부재.
- **Low 5건** (CONSIST-003/004, DESIGN-002/003/004): 경계 표시·필드 범위·최종 상태 제시·verify 커버리지 개선 제안.

wbs의 재작성 **방향성**(T3/T1 템플릿 정합, ❌/✅ 블록, 1-hop 위임, sibling 템플릿 일관성)은 전반적으로 잘 수행되었으며, 18개 파일이 모두 의도한 템플릿 구조로 재구성되었다. 다만 **실제 `@simplysm/*` API 정합성 검증**(wbs 전제의 "기술적 제약" 항목)이 LOGIC-001/002에서 누락되어, 품질 결정적 오류 2건이 잔존한다.
