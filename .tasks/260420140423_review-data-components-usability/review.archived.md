# 코드 리뷰: data-detail / data-select-button / data-sheet 사용법 복잡도 (ARCHIVED)

> **⚠️ 무효 처리 (2026-04-20):**
>
> 본 리뷰는 `SdDataSheet`/`SdDataDetail`/`SdDataSelectButton`/`SdBaseContainer`의 **전면 삭제** 결정(`.tasks/260420163508_remove-data-base-classes/wbs.md`)에 따라 **대부분 무효**가 되었다. 원본 코드가 제거되므로 Base 상속 구조 개선안들은 실행되지 않는다.
>
> **유지되는 액션 아이템:**
> - **DESIGN-006** (orm-common `Queryable.orderBy` string overload) → 별도 task로 분리: `.tasks/260420165650_orm-common-orderby-string-overload/plan.md`
> - **DESIGN-004 관점** (`mark`의 실제 역할을 "UI 동기화"로 정확히 서술) → WBS Feature 1.1·2.1의 레시피 작성 관용 규칙으로 녹여넣음 (`.tasks/260420163508_remove-data-base-classes/wbs.md`)
> - **DESIGN-007 관점** (시트 셀 내부 컨트롤의 `[inset]="true" [size]="'sm'"` 관용 규칙) → WBS Feature 1.1의 레시피 작성 관용 규칙으로 녹여넣음
>
> 이 파일은 히스토리 보존 목적으로만 유지한다. 새로운 결정은 상기 분리된 task와 WBS에서 진행한다.

---

리뷰 대상:
- `packages/angular/src/data/data-detail/`
- `packages/angular/src/data/data-select-button/`
- `packages/angular/src/data/data-sheet/`

관점: **사용자(소비 프로젝트 개발자)가 Base를 상속해 화면 하나를 만들 때의 인지 부담**이 과도한지.

---

## CONSIST-001 [Critical] SdDataSheet / SdDataDetail 템플릿 구조가 거의 같은데 슬롯/버튼 배치가 비대칭

- **위치:**
  - `packages/angular/src/data/data-detail/sd-data-detail.ts:52-189`
  - `packages/angular/src/data/data-sheet/sd-data-sheet.ts:64-386`

두 컴포넌트는 "페이지/모달/컨트롤 뷰 공통 CRUD 추상"이라는 동일 철학이고, `<sd-base-container>` 안에 `#pageTopbarTpl` + `#contentTpl` + `#modalBottomTpl` + `#modalActionTpl`이라는 **동일 뼈대**를 가진다. 그런데 각 슬롯 내부 구성과 소비자 확장점이 제각각이다. 같은 골격 위에 올라간 추상이라면 소비자는 두 컴포넌트를 "같은 패턴으로" 배울 수 있어야 하는데 실제는 매번 다른 규칙을 학습해야 한다.

**1) 소비자 슬롯 비대칭**

| 소비자 슬롯 | SdDataDetail | SdDataSheet |
|---|---|---|
| `#pageTopbarTpl` (page 탑바 확장) | **없음** | 있음 (`sd-data-sheet.ts:86` `<ng-template [ngTemplateOutlet]="pageTopbarTplRef() ?? null" />`) |
| `#prevTpl` | 있음 (contentTpl 위, `:115-119`) | 있음 (편집 버튼 바 영역, `:103,107`) — **렌더 위치 다름** |
| `#nextTpl` | 있음 (`:142-146`) | **없음** |
| `#toolTpl` | 있음 (control 뷰 편집바 뒤, `:111`) | 있음 (도구바 끝, `sd-data-sheet.ts:200`) — **렌더 위치 다름** |
| `#beforeToolTpl` | **없음** | 있음 (`sd-data-sheet.ts:152`) |
| `#filterTpl` | **없음** | 있음 |
| `#contentTpl` | 있음 (필수) | **없음** (구조화된 `<sd-data-sheet-column>` 컬렉션으로 대체) |
| `#modalBottomTpl` | 있음 (렌더 조건: `canEdit()`) | 있음 (렌더 조건: `selectMode()`) |

같은 이름의 슬롯이 어느 쪽에 있는지, 어디에 렌더링되는지, 어떤 조건에서 표시되는지 모두 다르다. 특히 `#toolTpl`과 `#prevTpl`은 두 컴포넌트에서 **이름은 같은데 렌더 위치가 다른** 상태여서, 사용자가 한쪽 규칙으로 다른 쪽을 쓰면 엉뚱한 자리에 컨텐츠가 뜬다.

**2) 저장/새로고침 버튼 중복 작성**

완전히 동일한 마크업(`<sd-button [theme]="'link-primary'"><ng-icon [svg]="tablerDeviceFloppy"/>저장<small>(CTRL+S)</small></sd-button>` + 새로고침)이 네 곳에 복붙되어 있다:

- `sd-data-detail.ts:62-72` (page 탑바)
- `sd-data-detail.ts:81-90` (control 편집바)
- `sd-data-sheet.ts:74-84` (page 탑바)
- `sd-data-sheet.ts:93-102` (control 편집바)

추가로 `modalActionTpl`의 새로고침 앵커도 양쪽에 동일 복제 (`sd-data-detail.ts:177-186`, `sd-data-sheet.ts:374-383`). 한쪽에서 아이콘이나 단축키 문구를 바꾸면 다른 쪽도 반드시 따라가야 하는데, 문법적 연결이 없다.

**3) 편집 버튼 바(control 뷰 상단)의 포함 범위 차이**

- SdDataDetail: 저장·새로고침 + 삭제/복구 (`:78-108`)
- SdDataSheet: 저장·새로고침만 (`:92-102`). 삭제/복구·엑셀·등록은 **아래 별도 도구바**(`:127-203`)로 분리

"편집 버튼 바"라는 같은 개념이 두 컴포넌트에서 포함 범위를 다르게 정의한다. 소비자는 "이 버튼이 어느 바에 나오지?"를 매번 다시 확인해야 한다.

**확정안 (2026-04-20):**

### 1. 진짜 공통 마크업만 조각 추출

두 컴포넌트에서 마크업·호출·문구가 완전히 동일한 저장/새로고침 버튼만 작은 프레젠테이션 컴포넌트로 추출:

- **`SdCrudSaveButton`** 신설: `[theme]` input(`'link-primary' | 'primary'`), `(click)` output. 내부 마크업은 현재와 동일(`tablerDeviceFloppy` + "저장" + `<small>(CTRL+S)</small>`)
- **`SdCrudRefreshButton`** 신설: `[theme]` input(`'link-info' | 'info'`), `(click)` output. `tablerRefresh` + "새로고침" + `<small>(CTRL+ALT+L)</small>`
- 신설 위치: `packages/angular/src/data/_shared/` 또는 두 data 패키지가 참조 가능한 위치
- 모달 새로고침 앵커는 2곳 중복이라 조각 추출 이득 낮음 → 현행 유지
- 삭제/복구, 모달 확인 버튼은 의미/호출 대상이 달라 공통화 대상 아님 → 각 컴포넌트에서 그대로 유지
- `<sd-base-container>` 래핑 5줄도 그 이후 UI 로직이 전혀 달라 상위 추상 불필요 → 각자 유지

### 2. 슬롯 규약 통일 (양방향 확장 모두 허용)

| 슬롯 | 위치 | Detail | Sheet |
|---|---|---|---|
| `#actionStartTpl` | 편집 액션 바 시작 (저장 앞) | 신규 | 신규 |
| `#actionEndTpl` | 편집 액션 바 끝 (마지막 고정 버튼 뒤) | 기존 `#toolTpl` 이관 | 기존 `#prevTpl` 이관 |
| `#contentAboveTpl` | 본문 위 별도 공간 | 기존 `#prevTpl` 이관 | 신규 |
| `#contentBelowTpl` | 본문 아래 별도 공간 | 기존 `#nextTpl` 이관 | 신규 |
| `#toolbarStartTpl` | 도구 바 시작 | 없음 (도구바 없음) | 기존 `#beforeToolTpl` 이관 |
| `#toolbarEndTpl` | 도구 바 끝 | 없음 | 기존 `#toolTpl` 이관 |
| `#pageTopbarStartTpl` | 페이지 탑바 저장/새로고침 앞 | 신규 | 신규 |
| `#pageTopbarEndTpl` | 페이지 탑바 저장/새로고침 뒤 | 신규 | 기존 `#pageTopbarTpl` 이관 |
| `#modalBottomStartTpl` | 확인 버튼 앞 (Sheet는 해제 버튼까지 포함된 영역, Detail은 기존 삭제/복구 버튼 영역) | 신규 | 기존 `#modalBottomTpl` 이관 |
| `#modalBottomEndTpl` | 확인 버튼 뒤 | 신규 | 신규 |
| `#filterTpl` | 조회 폼 | 없음 (필터 개념 없음) | 기존 유지 |

- 네이밍 규칙: `{영역}{Start|End|Above|Below}Tpl` 단일 패턴. Extra 어미 사용 안 함 (패키지의 `sd-base-container` 등과 일관)
- 두 컴포넌트가 동일한 슬롯 세트를 가지며, 해당 섹션이 없는 컴포넌트에선 슬롯이 존재하지 않음
- Sheet의 편집 액션 바(저장/새로고침이 있는 바)와 도구 바(등록/선택삭제/엑셀이 있는 바)는 개념적으로 다르므로 분리 유지
- base-container의 `pageTopbarTpl`는 title 뒤에 삽입되므로, 소비자 슬롯 `#pageTopbarStart/End`는 title 뒤 영역 내에서 저장/새로고침 앞/뒤로 작동

### 3. 영향 범위

**코드 수정:**
- `packages/angular/src/data/data-detail/sd-data-detail.ts` — 저장/새로고침 마크업 교체, 슬롯 이름 rename + 신규 슬롯 수용 위치 추가
- `packages/angular/src/data/data-sheet/sd-data-sheet.ts` — 동일
- **신설:** `packages/angular/src/data/_shared/sd-crud-save-button.ts`, `sd-crud-refresh-button.ts`

**소비 프로젝트 마이그레이션:**
- Detail: `#toolTpl` → `#actionEndTpl`, `#prevTpl` → `#contentAboveTpl`, `#nextTpl` → `#contentBelowTpl`
- Sheet: `#prevTpl` → `#actionEndTpl`, `#beforeToolTpl` → `#toolbarStartTpl`, `#toolTpl` → `#toolbarEndTpl`, `#pageTopbarTpl` → `#pageTopbarEndTpl`, `#modalBottomTpl` → `#modalBottomStartTpl`

**문서 수정:**
- `.claude/references/sd-simplysm14/angular/docs/features-data-detail.md` — 슬롯 섹션, 예제
- `.claude/references/sd-simplysm14/angular/docs/features-data-sheet.md` — 슬롯 섹션, 예제
- `.claude/references/sd-simplysm14/angular/docs/features.md` / `ui-data.md` / `ui-layout.md` — 슬롯 언급이 있다면 업데이트

> **제외:** 최종수정 정보 노출은 단일 레코드(detail) vs 다수 행(sheet)이라는 데이터 구조의 차이에서 자연스럽게 파생된 것이므로 통일 대상이 아니다.

---

## CONSIST-002 [Medium] 공통 동작을 각 Base가 중복 정의

- **위치:**
  - `sd-data-detail.base.ts:68-100` (constructor effect + refresh)
  - `sd-data-sheet.base.ts:144-228` + `injectDataSheetRefreshManager.ts:61-87`

두 Base 모두 동일한 초기화 플로우를 각자 재구현한다:

1. `constructor` 내 effect 등록
2. `prepareRefreshEffect?.()` 호출점 마련
3. `queueMicrotask` 내부에서 `cancelled` 플래그 처리
4. `canUse()` false면 `initialized.set(true)` 후 return
5. `withBusy(busyCount, () => sdToast.try(async () => { await sdSharedData.wait(); await refresh(); }))`
6. 마지막에 `initialized.set(true)`
7. `setupCanDeactivate(() => viewType() === "modal" || checkIgnoreChanges())` — 두 Base 모두 같은 가드

거의 줄 단위로 동일한 코드가 `sd-data-detail.base.ts:69-100`과 `injectDataSheetRefreshManager.ts:61-87`에 있다. `setupCanDeactivate` 호출도 `sd-data-detail.base.ts:99`, `sd-data-sheet.base.ts:227`에 중복. 이는 한쪽에서 버그 수정해도 다른 쪽은 자동으로 수정되지 않는 구조다.

**개선 방향:** 공통 부분을 `setupCrudRefreshEffect(options)` 같은 composable로 추출하여 두 Base가 같은 구현을 공유. `checkIgnoreChanges`도 공통 유틸리티로.

---

## CONSIST-003 [Medium] `close` output의 이벤트 의미/타입이 두 컴포넌트에서 다르게 설계됨

- **위치:**
  - `sd-data-detail.base.ts:59` — `close = output<R>()`. R은 `submit()`/`toggleDelete()`의 결과
  - `sd-data-sheet.base.ts:95` — `close = output<SelectModalOutputResult<TItem>>()`. 모달 선택 결과

두 컴포넌트 모두 "모달로 쓰였을 때 결과를 알리는 output"이라는 역할은 같지만, 타입·의미가 다르다. 더 나아가 sheet는 `close`와 `submitted` 두 output이 공존한다(`:96`). detail은 `submit` 성공과 `close`가 같은 이벤트에 묶여 있다(`sd-data-detail.base.ts:178`).

결과: 마스터-디테일 합성 패턴(`(close)="headerSheet.doRefresh()"` — 문서 `features-data-detail.md:292`)에서 소비자가 "이 `close`는 submit 결과인가 delete 결과인가 모달 취소인가" 매번 다시 확인해야 한다.

**확정안 (2026-04-20):**

두 컴포넌트에서 output의 **의미 체계**를 통일한다:

- **`submitted`**: 기본 컨트롤 관점의 주 이벤트. "저장 작업 완료" 시맨틱. 페이지/컨트롤 뷰에서 소비자(마스터-디테일의 마스터 등)가 구독
- **`close`**: `SdModalContentDef`/`SdSelectModal` 인터페이스 구현용 부가 이벤트. 모달 caller가 `showAsync` 결과로 받음

**구체 변경:**

- `sd-data-detail.base.ts:59`에 `submitted = output<boolean>()` 추가
- `sd-data-detail.base.ts:145` (`doToggleDelete` 성공 분기)와 `:178` (`doSubmit` 성공 분기)에서 `close.emit(result)` 직전 또는 직후에 `this.submitted.emit(true)` 추가
- Detail은 "저장 = 닫힘"이 본질이라 두 이벤트가 동시 발현되지만, 각각 다른 관심사(기본 컨트롤 vs 모달 인터페이스)를 위한 의도적 이중 신호로 유지
- `toggleDelete`는 DB 업데이트의 한 형태이므로 `submitted`에 함께 emit (별도 `deleted` output 신설하지 않음)
- Sheet는 변경 없음 (이미 `submitted` + `close` 분리 구조)

**소비자 사용 예:**
- 페이지/컨트롤 뷰 (마스터-디테일의 디테일): `(submitted)="masterSheet.doRefresh()"`
- 모달로 띄울 때: `showAsync(...)`의 반환값으로 close 결과 수신

---

## DESIGN-001 [Critical] editMode와 구현 메서드 쌍이 타입으로 강제되지 않는다

- **위치:** `packages/angular/src/data/data-sheet/sd-data-sheet.base.ts:52,69-72`

`editMode`는 `"inline" | "modal"` 리터럴로 선언되지만, 짝이 되는 API(`newItem`/`submit` vs `editItem`/`toggleDeleteItems`)는 모두 **선택 optional**로 선언되어 있다. `editMode = "inline"`인데 `editItem()`을 실수로 override해도, `editMode = "modal"`인데 `newItem()`을 override해도 컴파일 에러가 나지 않는다. 증상은 "버튼이 안 보이거나 엉뚱한 버튼이 뜬다"로만 나타난다. 문서 `features-data-sheet.md:485-491`에도 "양쪽 다 구현하면 충돌할 수 있다"는 경고가 명시되어 있지만 이는 타입으로 막지 못한 설계의 흔적이다.

**확정안 (2026-04-20):**

Base를 이원화하여 타입 시스템이 잘못된 조합을 차단한다.

```typescript
// 공통 core (현재 SdDataSheetBase에서 editMode/메서드 관련 제외한 부분)
@Directive()
abstract class SdDataSheetBaseCore<TFilter, TItem, TKey> { ... }

// inline 전용
@Directive()
abstract class SdInlineDataSheetBase<TFilter, TItem, TKey>
  extends SdDataSheetBaseCore<TFilter, TItem, TKey> {
  readonly editMode = "inline" as const;
  abstract newItem(): Promise<TItem> | TItem;
  abstract submit(diffs: ArrayOneWayDiffResult<TItem>[]): Promise<boolean> | boolean;
}

// modal 전용
@Directive()
abstract class SdModalDataSheetBase<TFilter, TItem, TKey>
  extends SdDataSheetBaseCore<TFilter, TItem, TKey> {
  readonly editMode = "modal" as const;
  abstract editItem(item?: TItem): Promise<boolean | undefined> | boolean | undefined;
  toggleDeleteItems?(del: boolean): Promise<boolean>;
}
```

- 소비자는 `extends SdInlineDataSheetBase<...>` 또는 `extends SdModalDataSheetBase<...>` 중 선택
- `editMode` 상속자 override 불필요 (각 Base에서 리터럴로 고정)
- 잘못된 메서드 조합은 타입 시스템이 차단
- 기존 `SdDataSheetBase`는 deprecated 또는 제거 (마이그레이션 끝난 후)
- 소비 프로젝트 모든 `SdDataSheetBase<...>` 상속자를 둘 중 하나로 교체 필요 (editMode 값에 따라)

---

## DESIGN-002 [Medium] abstract 멤버의 선언 스타일이 7가지 서로 다른 형태로 혼재

- **위치:** `packages/angular/src/data/data-sheet/sd-data-sheet.base.ts:48-66`

한 Base 내부에서 override할 멤버의 선언 형태가 이렇게 섞여 있다.

```
canUse: Signal<boolean>                                   (Signal)
canEdit: Signal<boolean>                                  (Signal)
hideTool?: Signal<boolean>                                (Signal, optional)
editMode: "inline" | "modal"                              (리터럴)
selectMode: InputSignal<...>                              (InputSignal — 재선언)
diffsExcludes?: string[]                                  (배열)
bindFilter(): TFilter                                     (메서드)
itemPropInfo: SdDataSheetItemPropInfo<TItem>              (객체 프로퍼티)
getItemInfoFn: (item) => SdDataSheetItemInfo<TKey>        (화살표 함수 필드)
search(usePagination): ...                                (메서드)
```

상속자가 "이건 `= computed(...)`로 써야 하나, `override foo() {}`로 써야 하나, `input<T>()`로 재선언해야 하나"를 매번 기억해야 한다. 문서를 뒤져 패턴을 확인하는 비용이 매 override마다 발생한다.

**확정안 (2026-04-20):**

DESIGN-001/003/005 해소로 대부분의 혼재가 자동 해결됨. 남은 조정:

- `getItemInfoFn: (item) => SdDataSheetItemInfo<TKey>` (화살표 함수 필드) → `getItemInfo(item): SdDataSheetItemInfo<TKey>` (메서드)로 전환
- 다른 비즈니스 로직(`bindFilter`, `search`)와 같은 메서드 형태로 통일
- 호출 지점 (`sd-data-sheet.base.ts:110,122,124,129,132,142,150,183,196` 등)에서 `this.getItemInfoFn(item)` → `this.getItemInfo(item)`으로 교체
- Base 내부의 composable 주입 시 콜백도 `(item) => this.getItemInfo(item)`로 교체
- 나머지 선언 형태(Signal, 배열, 메서드, 객체)는 역할 차이에 따른 자연스러운 선언이므로 유지

---

## DESIGN-003 [Medium] selectMode를 상속자가 `input<...>()`으로 재선언하도록 강요

- **위치:** `packages/angular/src/data/data-sheet/sd-data-sheet.base.ts:53`
- **문서 근거:** `features-data-sheet.md:445-451`

```ts
abstract selectMode: InputSignal<"single" | "multi" | undefined>;
```

상속자는 반드시 다음과 같이 **재선언**해야 한다.

```ts
override selectMode = input<"single" | "multi" | undefined>();
```

같은 패키지의 `SdDataDetailBase`, `SdDataSelectButtonBase`는 이런 요구가 없다(`SdDataSelectButtonBase`는 Base 스스로 `input()`을 선언 — `sd-data-select-button.base.ts:43`). 왜 SdDataSheet만 예외인지 코드·문서에 이유가 없다. 사용자는 "이 줄을 안 쓰면 왜 안 되는지 모른 채 복사한다."

**조건부 확정안 (2026-04-20):**

**이상적 수정:** Base에서 `selectMode = input<"single" | "multi" | undefined>(undefined)`로 직접 선언, abstract 제거. 상속자는 기본값 변경 필요 시에만 override (BoxRfqPage의 `override selectMode = input<...>("multi")` 등).

**보류 사유:** Angular의 AOT 컴파일러가 "Base의 구체 input을 자식이 `override`"하는 케이스를 명시적으로 문서화하지 않음. 관련 GitHub 이슈(#59152, #59214)를 검토했으나 정확히 일치하는 공식 가이드 없음. `SdDataSelectButtonBase`(`sd-data-select-button.base.ts:43`)는 Base에 구체 input을 선언하지만 상속자가 override하는 패턴은 검증되지 않음.

**수정 개발 시 절차:**
1. Base에 `selectMode = input<...>(undefined)` 선언 + 한 상속자에 `override selectMode = input<...>("multi")` 패턴으로 작은 실험
2. 빌드·실행·template 바인딩 확인
3. 정상 작동 시 전체 적용
4. Angular compiler에서 충돌·경고 발생 시 현행 abstract 패턴 유지하고 DESIGN-003 포기

---

## DESIGN-004 [Medium] `mark(sig)` 수동 호출 의무가 모든 템플릿 바인딩에 전파됨

- **위치:** `packages/angular/src/core/mark.ts` (함수 정의), 사용 지점은 모든 소비 코드의 `(valueChange)="mark(data)"`
- **문서 근거:** `features-data-sheet.md:415-427`, `features-data-detail.md:378-384`

Signal이 보유한 객체/배열의 내부 필드를 변경할 때마다 소비자가 `mark(sig)`를 명시적으로 호출해야 한다. 한 화면에 컨트롤이 20개라면 20번의 `(valueChange)="mark(data)"`가 반복된다. 누락하면 `obj.equal(data(), _dataSnapshot)`(`sd-data-detail.base.ts:105`) 또는 `oneWayDiffs`(`injectDataSheetRefreshManager.ts:53`)가 변경을 감지하지 못해 "변경사항이 없습니다" 토스트가 뜨고 저장이 조용히 스킵된다.

이는 Angular signal의 불변성 철학과 충돌하는 설계이며, 사용자 실수가 silent 실패로 이어지는 구조다.

**확정안 (2026-04-20 - 재분석):**

원래 주장("mark 누락 시 submit silent 실패")은 코드 재검증 결과 **부정확했다**:

- `obj.equal` (`obj.ts:172-174`)는 참조 동일(`===`) 체크 후 deep equal로 값 비교
- `_dataSnapshot`은 `obj.clone(result.data)`로 별개 객체 (`sd-data-detail.base.ts:127`)
- 사용자가 `data().name = "new"`로 mutation해도 `obj.equal`의 deep equal 단계에서 값 차이를 감지 → submit 정상 작동

즉 mark의 실제 역할은 **submit 감지가 아닌 UI 동기화**:
- signal 참조 갱신 → OnPush 템플릿 재렌더링
- 다른 `{{ data().name }}` 바인딩, computed/effect 의존성 갱신

**수정 범위 (문서 정정 전용):**

- `.claude/references/sd-simplysm14/angular/docs/features-data-detail.md:378-384` — "mark 없으면 submit 시 변경사항 없음 처리될 수 있다" 표현 정정. mark의 실제 역할을 "UI 동기화 및 의존 computed/effect 재실행 트리거"로 명시
- `.claude/references/sd-simplysm14/angular/docs/features-data-sheet.md:415-427` — 동일 정정
- 그 외 `features-data-select-button.md`, `usage.md`, `ui-data.md` 등 mark 언급 위치 점검 및 정정
- 코드는 그대로 유지 (Chrome 61 제약으로 Proxy 기반 자동 notify 불가. Angular signal의 본질적 제약)
- 보일러플레이트 축소 효과는 DESIGN-013(`mark` Base 재노출)에서 다룸

---

## DESIGN-006 [Medium] 정렬 key가 체인 경로일 때 상속자가 직접 분기 처리

- **위치:** `packages/angular/src/data/data-sheet/injectDataSheetRefreshManager.ts:33-47` (search 호출), `sd-data-sheet.base.ts:64-66`
- **문서 근거:** `features-data-sheet.md:453-472`

`sortingDef.key`는 컬럼 key를 그대로 전달하므로 `"vendor.name"` 같은 체인 경로가 들어올 수 있다. 상속자가 `search()` 안에서 `(item as any)[s.key]`로 쓰면 undefined로 조용히 실패한다. 문서는 `obj.getChainValue(item, s.key)`를 쓰라고 안내하지만, 이는 "Base가 해줘야 할 일을 소비자에게 떠넘기는 관용 규칙"이다. 다른 상속자 수십 개에 같은 보일러플레이트가 복붙된다.

**확정안 (2026-04-20 - 재분석):**

제 초기 "ORM이 static SQL 변환" 주장은 추측이었고 철회한다. 실제 구현(`packages/orm-common/src/exec/queryable.ts:419-437`)은 `fn(this.meta.columns)`로 **런타임 실행** 후 `ExprUnit` 반환. `this.meta.columns`는 프록시성 객체로, 호출 시 ORM이 이해하는 ExprUnit으로 변환.

**해결 방향: `@simplysm/orm-common`의 `Queryable.orderBy`에 string overload 추가** (본 리뷰 범위 확장)

```typescript
// queryable.ts:419-437 수정
orderBy(
  fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
  orderBy?: "ASC" | "DESC",
): Queryable<TData, TFrom>;

orderBy(
  keyStr: string,                                    // 체인 경로 지원
  orderBy?: "ASC" | "DESC",
): Queryable<TData, TFrom>;

orderBy(
  fnOrKey: string | ((columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>),
  dir?: "ASC" | "DESC",
): Queryable<TData, TFrom> {
  const fn = typeof fnOrKey === "string"
    ? (columns: QueryableRecord<TData>) => obj.getChainValue(columns, fnOrKey, true) as any
    : fnOrKey;
  ...
}
```

**소비자 코드 간결화:**
```typescript
// Before
qr2 = applyDbOrderBy(qr2, this.sortingDefs());     // adtek 자체 유틸
// 또는
for (const s of this.sortingDefs()) {
  qr = qr.orderBy((item) => obj.getChainValue(item, s.key, true) as any, s.desc ? "DESC" : "ASC");
}

// After
for (const s of this.sortingDefs()) {
  qr = qr.orderBy(s.key, s.desc ? "DESC" : "ASC");
}
```

**영향 범위:**
- `packages/orm-common/src/exec/queryable.ts:419-437` — overload 시그니처 + 구현 분기 추가
- `@simplysm/orm-common` 테스트 업데이트
- `.claude/references/sd-simplysm14/angular/docs/features-data-sheet.md:99,464,588` — 예제 코드 간결화
- adtek의 `applyDbOrderBy` 유틸 제거 가능 (소비 프로젝트 정리)
- 본 리뷰 대상(sd-data-sheet)의 `search()` 예제 단순화

---

## DESIGN-007 [Medium] 셀 내부 컨트롤이 `[inset]="true" [size]="'sm'"`를 매번 수동 지정

- **위치:** 관용 규칙 (`features-data-sheet.md:429-443`, `features-data-select-button.md:277-295`)

시트 셀 안의 모든 컨트롤에 다음 두 속성을 반복 지정해야 한다. 누락하면 컴파일 에러 없이 스타일만 깨진다.

```html
<sd-textfield [inset]="true" [size]="'sm'" ... />
```

"시트 안의 셀 렌더링 컨텍스트"라는 정보는 트리상에 있는데, 그걸 소비자가 매번 수동으로 전달하게 한다. DRY 위반이자 silent 실패 유발 설계다.

**확정안 (2026-04-20):**

사용자 판단: `inset`은 대부분 고정이지만 복합 구조(텍스트+컨트롤)에선 false 필요, `size`는 "큰 시트 요청"에 따라 undefined 필요. 각 컨트롤에 자동 감지 로직 추가는 `controls/*` 전체 수정으로 번져 과한 변경. 전용 컴포넌트(`sd-text-column` 등) 신설도 과함.

**수정 범위 (문서/예제 강화 전용):**

- `.claude/references/sd-simplysm14/angular/docs/features-data-sheet.md:429-443` — 셀 내부 컨트롤 관용 규칙의 예제·경고를 눈에 띄게 강화 (잘못된 예 + 올바른 예 대비)
- `.claude/references/sd-simplysm14/angular/docs/features-data-select-button.md:277-295` — 동일 정정
- 코드 변경 없음 (`inset`/`size` input은 현재 형태 유지)
- Silent 스타일 깨짐 위험은 여전히 남지만, 근본 해결 대비 변경 비용이 과하다고 판단하여 타협

---

## DESIGN-008 [Medium] ~~템플릿 슬롯 이름이 렌더 위치를 드러내지 않음~~ — CONSIST-001에 흡수 (제거됨)

CONSIST-001 확정안(Full 통일)에서 슬롯 이름을 위치 기반으로 재명명(`#actionEndTpl`, `#contentAboveTpl`, `#toolbarStartTpl` 등)하는 내용이 이 이슈의 모든 내용을 커버하므로 별도 유지 불필요. 2026-04-20 중복으로 제거.

~~이하 원본 내용:~~

`<sd-data-sheet>`의 슬롯: `pageTopbarTpl`, `prevTpl`, `filterTpl`, `beforeToolTpl`, `toolTpl`, `modalBottomTpl`.
`<sd-data-detail>`의 슬롯: `toolTpl`, `prevTpl`, `contentTpl`, `nextTpl`.

- `prevTpl`/`nextTpl`은 어느 기준의 "이전/이후"인가? (상단/하단이라는 뜻)
- `beforeToolTpl`/`toolTpl`의 차이는? (도구바 내부 앞뒤 위치)
- 두 컴포넌트에서 같은 이름인 `toolTpl`이 렌더링 위치가 서로 다름 (`SdDataSheet`는 도구바, `SdDataDetail`은 control뷰 상단)

사용자는 이름만 보고는 어디 들어가는지 알 수 없어 매번 문서를 확인해야 한다.

**개선 방향:** 이름을 위치 기준으로 재명명한다. 예: `topTpl` / `bottomTpl` / `toolbarStartTpl` / `toolbarEndTpl` / `modalFooterTpl`. 두 컴포넌트에서 역할이 같은 슬롯은 같은 이름으로 통일.

---

## DESIGN-009 [Medium] `bindFilter()` 함수명이 의도를 드러내지 않음

- **위치:** `packages/angular/src/data/data-sheet/sd-data-sheet.base.ts:57`
- **사용 지점:** `useDataSheetFilterManager.ts:4-18`에서 `linkedSignal`의 source로 사용

이름만 보면 "어딘가에 bind한다"는 동사로 읽히지만, 실제 동작은 "필터의 초기값을 반환하고 `linkedSignal`의 source로 등록되어 상위 context가 바뀌면 자동 재설정"이다. `getInitialFilter()` 또는 `buildDefaultFilter()`가 훨씬 명확하다.

**개선 방향:** `bindFilter` → `getInitialFilter` (또는 `buildFilter`) 로 rename. 내부 linkedSignal 연결은 그대로 유지.

---

## DESIGN-010 ~~`SdDataDetail.load()`가 info 4필드를 모두 반환하도록 강제~~ — 거짓양성으로 제거

2026-04-20 제거. 현재 설계는 "상속자가 각 필드의 필요 여부를 매번 의식적으로 점검하게 강제"하는 **의도적 방어 설계**. optional로 완화하면 `lastModifiedAt/By` 표시가 누락되거나 `isDeleted` 체크를 빠뜨려 silent 실패. DESIGN-005와 동일한 패턴으로 판정.

---

## DESIGN-011 [Medium] `SdDataSelectButton.modal`이 항상 Signal 강제

- **위치:** `packages/angular/src/data/data-select-button/sd-data-select-button.base.ts:30`
- **문서 근거:** `features-data-select-button.md:346-360`

```ts
abstract modal: Signal<SdSelectModalInfo<SdSelectModal<any>>>;
```

정적 객체(입력이 변하지 않는 경우)에도 `computed(() => ({ type: LotPage, title: "LOT조회", inputs: {} }))` 래핑이 필요. 이유는 Signal 일관성이지만, 90%의 사용처는 정적이다.

**개선 방향:** `modal: SdSelectModalInfo<...> | Signal<...>` 유니온으로 받고 Base 내부에서 Signal로 정규화(`toSignal`/`signal`). 정적 케이스의 보일러플레이트 제거.

---

## DESIGN-012 [Low] `injectParent` 호출에 `any` 제네릭 유출

- **위치:** `packages/angular/src/data/data-sheet/sd-data-sheet.ts:389`, `sd-data-detail.ts:192`, `sd-data-select-button.ts:84`

```ts
parent = injectParent<SdDataSheetBase<any, any, any>>();
parent = injectParent<SdDataDetailBase<any>>();
parent = injectParent<SdDataSelectButtonBase<any, any>>();
```

컴포넌트 내부에서는 타입이 `any` 제네릭이라, `parent.items()`, `parent.data()` 등 모든 접근이 `any`로 퇴화한다. 템플릿에서 타입 안전성을 상실. 소비자 영향은 간접적이지만, 프레임워크 자체의 타입 견고성이 낮다.

**개선 방향:** `injectParent`를 제네릭 지연 추론으로 설계하거나, 혹은 `<sd-data-sheet>`를 제네릭 컴포넌트로 만들어 소비자가 `SdDataSheet<IFilter, IItem, TKey>`로 타입을 확정할 수 있게 한다.

---

## DESIGN-013 [Low] `mark`를 Base가 protected 필드로 재노출하지 않아 상속자 반복 선언

- **위치:** 문서 예제 `features-data-sheet.md:115`, `features-data-detail.md:119`

모든 상속자가 반복한다.

```ts
protected readonly mark = mark;
```

Base에서 한 번만 선언하면 소비자는 `<sd-textfield ... (valueChange)="mark(data)" />`를 바로 쓸 수 있다. 그런데 Base에 없어 매 클래스 하단에 이 한 줄이 반복된다.

**개선 방향:** `SdDataSheetBase`/`SdDataDetailBase`에 `protected readonly mark = mark` 추가. 단, 이 이슈는 DESIGN-004(`mark` 자체의 제거)가 해결되면 자동 해소.

---

## DESIGN-014 [Low] `key` 필드가 `selector`에 암묵 의존해 fragile

- **위치:** `packages/angular/src/data/data-sheet/sd-data-sheet.base.ts:88`

```ts
key = reflectComponentType(this.constructor as any)?.selector ?? this.constructor.name;
```

내부 `<sd-sheet [key]="key + '-sheet'">`로 전달되어 사용자별 시트 설정(컬럼 너비/숨김 등) 저장 키로 쓰인다. selector를 바꾸거나 클래스 이름을 바꾸면 **사용자가 저장해둔 설정이 전부 유실**되는데, 이 연결 고리는 코드에 명시되지 않고 숨어 있다.

**개선 방향:** (a) `key`를 abstract로 강제하여 소비자가 명시적으로 안정 키를 지정하게 하거나, (b) 마이그레이션 경로(예: 이전 키에서 읽어오는 fallback)를 제공. 최소한 주석으로 "이 값이 바뀌면 사용자 설정 유실됨"을 경고.

---

## DESIGN-015 [Low] 필수 8개 + 선택 9개 — 학습 곡선이 과도

- **위치:** `packages/angular/src/data/data-sheet/sd-data-sheet.base.ts:48-75`

한 화면 하나 만들려고 17개의 멤버 시그니처를 익혀야 한다. 대부분은 관례대로 구현되는데 Base가 관례를 모른다.

**개선 방향:** 합리적 기본값을 Base에 두고, 진짜 필수만 abstract로 유지. 예를 들어 `canUse`/`canEdit` 기본값은 `computed(() => true)`, `itemPropInfo`는 관례 이름 탐지, `getItemInfoFn`은 `item[keyField]` 기반 기본 구현 — 이러면 필수가 `search()`/`bindFilter()`/`editMode` 수준으로 줄어든다.

---

## 종합 의견

세 컴포넌트 모두 "풍부한 추상화"를 제공하지만, 그 대가로 **(a) 타입 안전성을 희생한 약속 의존(`editMode`-메서드 쌍, `mark` 호출, 셀 컨텍스트 prop)**, **(b) 일관성 없는 선언 스타일 (Base 내부 + 두 컴포넌트 간 템플릿)**, **(c) 불필요한 Signal/함수 래핑 강제**, **(d) 렌더링 위치를 암시하지 않는 슬롯 이름**을 소비자에게 떠넘기고 있다.

특히 **CONSIST-001은 가장 결정적**이다. `SdDataDetail`과 `SdDataSheet`가 동일한 `<sd-base-container>` 골격을 쓰면서도 각자 슬롯과 버튼을 재정의해서, "이 추상을 학습하려면 두 번 학습해야 한다." 공통 부분을 추출하고 슬롯을 통일하면 학습비용이 절반으로 줄어들고 유지보수 중복도 사라진다.

가장 영향이 큰 수정 네 가지:
1. CONSIST-001 — 두 컴포넌트 템플릿 통일 (슬롯/버튼 공통화, 최종수정 정보 노출 통일)
2. DESIGN-001 — `editMode`/메서드 짝을 타입으로 강제 (silent 실패 차단)
3. DESIGN-004 — `mark` 수동 호출 제거 (silent 실패 차단 + 보일러플레이트 축소)
4. DESIGN-005 + DESIGN-015 — `itemPropInfo`/`getItemInfoFn` 기본값 및 abstract 축소 (학습곡선 완화)

이 넷을 해결하면 "사용법이 어렵다"는 인상의 대부분이 해소된다.
