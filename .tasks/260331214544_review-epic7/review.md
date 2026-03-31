# Epic 7 마이그레이션 심층 리뷰

| 항목 | 내용 |
|------|------|
| 분석 대상 | Epic 7 전체 (7.1, 7.2a, 7.2b, 7.2c, 7.3, 7.4a, 7.4b) |
| 일시 | 2026-03-31 |
| 파일 수 | 소스 10개 + 테스트/fixture 18개 |
| 발견 이슈 | Critical 1건, Medium 3건, Low 5건 |

## 총평

Epic 7 마이그레이션은 전체적으로 높은 완성도를 보인다. 모든 Feature가 v12 기능을 v14 signal-first 패턴으로 충실히 전환했으며, 전체 Feature에 대해 테스트가 작성되어 있다. `index.ts` export도 누락 없이 완료되어 있다. 7.4b에서는 v12의 USE→EDIT 자동 해제 조건 버그를 수정하는 개선도 포함되어 있다.

다만 **1건의 Critical 이슈**(폼 제출 이벤트 바인딩 오류)가 있어 즉시 수정이 필요하다.

---

## Critical

### LOGIC-001: SdDataDetailControl 폼 제출 이벤트 바인딩 오류

```
severity: Critical
category: 로직
location: packages/angular/src/features/data-view/sd-data-detail.control.ts:281
```

**title:** `(submit)` 바인딩은 v14 `SdFormControl`의 output `formSubmit`과 불일치 — 폼 제출이 동작하지 않음

**description:** 템플릿에 `<sd-form #formCtrl (submit)="onSubmit()">`로 바인딩되어 있으나, v14의 `SdFormControl`은 output 이름이 `formSubmit`이다(`sd-form.control.ts:32`). 내부 `<form>` 요소의 네이티브 `submit` 이벤트는 `handleSubmit()`에서 `stopPropagation()`으로 차단되므로, `onSubmit()`은 절대 호출되지 않는다. 결과적으로 저장 버튼 클릭 → `requestSubmit()` → 폼 유효성 검증 → `onSubmit()` 경로가 완전히 끊어진다. 동일 패키지의 `SdDataSheetControl`은 `(formSubmit)`을 올바르게 사용하고 있다(L502, L594).

**suggestion:** `(submit)="onSubmit()"`을 `(formSubmit)="onSubmit()"`로 변경.

---

## Medium

### LOGIC-002: AbsSdDataSheet.doSubmit()에서 실패 시에도 submitted.emit(true) 발생

```
severity: Medium
category: 로직
location: packages/angular/src/features/data-view/sd-data-sheet.control.ts:308
```

**title:** `_sdToast.try()`가 에러를 캐치해도 `submitted.emit(true)`가 무조건 실행됨

**description:** `doSubmit()`에서 `await this._sdToast.try(async () => { ... submit ... })`가 에러를 캐치하면 `undefined`를 반환하고 실행이 계속된다. 이후 `this.submitted.emit(true)`가 무조건 실행되어, submit 실패 시에도 소비자에게 성공 신호를 보낸다. `_sdToast.try`는 `Error` 인스턴스를 잡아 토스트로 표시하고 `undefined`를 반환하는 구조이므로, catch 후 실행 흐름이 `submitted.emit`까지 도달한다. (v12에서도 동일한 패턴이었으므로 pre-existing 이슈)

**suggestion:** `submitted.emit(true)`를 `_sdToast.try` 콜백 내부의 성공 경로(`_sdToast.success` 이후)로 이동하거나, `_sdToast.try`의 반환값이 `undefined`가 아닐 때만 emit.

---

### DESIGN-001: SdDataSheetControl 모달 모드에서 새로고침 버튼 누락 (회귀)

```
severity: Medium
category: 설계
location: packages/angular/src/features/data-view/sd-data-sheet.control.ts (template)
```

**title:** v12에 존재하던 `modalActionTpl`(모달 헤더 새로고침 버튼)이 v14에서 제거됨

**description:** v12의 `SdDataSheetControl`에는 `selectMode` 모달에서 헤더에 새로고침 버튼을 렌더링하는 `#modalActionTpl` 템플릿과 이를 `actionTplRef`에 할당하는 effect가 있었다. v14에서는 이 전체가 제거되었다. `AbsSdDataSheet`에 `actionTplRef?: TemplateRef<any>`(L133)가 선언되어 있지만 실제로 할당하는 코드가 없다. 동일 패키지의 `SdDataDetailControl`에는 이 기능이 존재한다(L336-365).

**suggestion:** `SdDataDetailControl`의 `#modalActionTpl` 패턴을 참고하여 `SdDataSheetControl`에도 모달 새로고침 앵커 템플릿과 할당 effect를 복원. 단, DESIGN-002와 함께 해결해야 실제 동작함.

---

### DESIGN-002: SdModalProvider가 actionTplRef를 content→modal로 전달하지 않음

```
severity: Medium
category: 설계
location: packages/angular/src/ui/overlay/modal/sd-modal.provider.ts:94-140
```

**title:** `actionTplRef`가 콘텐츠 컴포넌트에서 `SdModalControl`로 전달되지 않아 모달 헤더 액션이 표시되지 않음

**description:** `SdModalProvider.showAsync()`는 `contentRef`와 `modalRef`를 독립적으로 생성하지만, `contentRef.instance.actionTplRef`를 `modalRef`의 `actionTplRef` input으로 전달하는 코드가 없다. `TSdModalExcludeKeys`에 `actionTplRef`가 명시적으로 제외되어 있다. 따라서 `SdDataDetailControl`이 `this.parent.actionTplRef = this.modalActionTplRef()`로 설정해도(L364), 이 값은 `AbsSdDataDetail` 인스턴스의 plain 필드에만 머물고 `SdModalControl.actionTplRef` input에는 도달하지 않는다. 이로 인해 모달 헤더의 새로고침 앵커가 표시되지 않는다. (Epic 7 외부 파일이지만, Epic 7의 7.2a/7.2b 기능에 직접 영향)

**suggestion:** `SdModalProvider.showAsync()`에서 `contentRef.instance.actionTplRef`를 감시하여 `modalRef.setInput("actionTplRef", ...)`로 전달하는 effect를 추가. 또는 `SdActivatedModalProvider`를 통한 간접 전달 메커니즘 구축.

---

## Low

### CONSIST-001: AbsSdDataDetail에 ORM 에러 메시지 커스터마이징 누락

```
severity: Low
category: 일관성
location: packages/angular/src/features/data-view/sd-data-detail.control.ts:147-185
```

**title:** `doSubmit`/`doToggleDelete`에서 `_sdToast.try`에 ORM 에러 메시지 변환 콜백이 없음

**description:** `AbsSdDataSheet`는 `_sdToast.try`의 두 번째 인자로 `_getOrmDataEditToastErrorMessage`를 전달하여 FK 제약조건 에러를 한국어 안내 메시지로 변환한다. `AbsSdDataDetail`은 이 콜백 없이 기본 에러 메시지를 사용한다. 동일한 ORM 작업(submit, delete)을 수행하므로, 상세 뷰에서 FK 에러 발생 시 사용자에게 raw 영문 DB 에러가 표시된다. (v12에서도 동일)

**suggestion:** `AbsSdDataSheet._getOrmDataEditToastErrorMessage`와 동일한 헬퍼를 `AbsSdDataDetail`에도 추가하고 `_sdToast.try` 호출 시 전달.

---

### CONSIST-002: SdDataDetailControl과 SdDataSheetControl 간 아이콘 선언 패턴 불일치

```
severity: Low
category: 일관성
location: packages/angular/src/features/data-view/sd-data-detail.control.ts:388-392
```

**title:** SdDataSheetControl은 `icons` 객체 그룹핑, SdDataDetailControl은 개별 `protected readonly` 필드

**description:** `SdDataSheetControl`은 아이콘을 `protected readonly icons = { tablerRefresh, ... }` 객체로 그룹핑하고 템플릿에서 `icons.tablerRefresh`로 참조한다. `SdDataDetailControl`은 `protected readonly tablerDeviceFloppy = tablerDeviceFloppy` 등 개별 필드로 선언한다. 같은 `features/data-view/` 디렉토리 내 형제 컴포넌트 간 패턴 불일치.

**suggestion:** 둘 중 하나로 통일. `icons` 객체 패턴이 더 정돈된 구조.

---

### DESIGN-003: 읽기 전용 모달에서 새로고침 불가

```
severity: Low
category: 설계
location: packages/angular/src/features/data-view/sd-data-detail.control.ts:309-346
```

**title:** `canEdit()` 분기가 `modalActionTpl`까지 감싸서, 편집 권한 없으면 모달 새로고침도 불가

**description:** `@if (parent.canEdit()) { ... }` 블록이 `#modalBottomTpl`(제출/삭제 버튼)과 `#modalActionTpl`(새로고침 앵커)을 모두 감싸고 있다. `canEdit()=false`인 읽기 전용 모달에서도 데이터 새로고침은 필요할 수 있으나 현재 구조에서는 불가하다.

**suggestion:** `#modalActionTpl`을 `canEdit()` 분기 밖으로 이동하여 읽기 전용 모달에서도 새로고침 가능하게 변경. `#modalBottomTpl`만 `canEdit()` 내부에 유지.

---

### PERF-001: AbsSdDataSheet.refresh()의 selectedItems 재조정이 O(n*m)

```
severity: Low
category: 성능
location: packages/angular/src/features/data-view/sd-data-sheet.control.ts:259-265
```

**title:** refresh 후 selectedItems 갱신이 items × selectedItems 이중 루프

**description:** `items()` 각 항목에 대해 `selectedItems()`를 순회하며 키 비교로 매칭하는 O(n*m) 로직. 대량 데이터셋에서 다수 선택 시 성능 저하 가능. (v12에서도 동일)

**suggestion:** `selectedItems`의 키를 `Set`으로 먼저 구축한 뒤 `items().filter(item => keySet.has(keyFn(item)))`으로 O(n+m) 최적화.

---

### LOGIC-003: getItemSelectable 주석과 실제 로직 불일치

```
severity: Low
category: 로직
location: packages/angular/src/features/shared-data/sd-shared-data-select.control.ts:256-260
```

**title:** 주석 "depth가 0이면서 자식을 가진 항목(카테고리)은 선택 불가"이지만, 실제로 자식 존재 여부를 확인하지 않음

**description:** `getItemSelectable`의 로직은 `return depth !== 0 || item.__parentKey == null`이다. depth=0이고 `__parentKey`가 없는 루트 항목은 자식 유무와 무관하게 항상 선택 가능하다. 주석이 의미하는 "자식을 가진" 조건은 코드에 반영되어 있지 않다. 실제 동작은 v12와 동일하므로 기능적 문제는 아니지만, 주석이 오해를 유발할 수 있다.

**suggestion:** 주석을 실제 로직에 맞게 수정: "트리 구조에서 depth=0이면서 __parentKey가 있는 항목은 선택 불가" 등.

---

## 부가 사항

### 긍정적 변경

- **7.4b 버그 수정**: v12의 `_changePermCheck`에서 USE 해제 시 EDIT 자동 해제 조건이 반전되어 있었음(`!value[permCode + ".edit"]` → edit가 이미 false일 때만 동작하는 no-op). v14에서 `value[permCode + ".edit"]`로 수정하여 실제로 edit가 true일 때 해제되도록 올바르게 변경됨.
- **7.1 injectParent 안전성 개선**: v12는 `_lView` null 체크 없이 접근하여 `EnvironmentInjector`에서 크래시 가능. v14는 `_lView == null` 가드를 추가하여 안전하게 순회 종료.
- **7.4a 타입 안전성 개선**: v12의 `@ts-expect-error` 2건이 `declare const daum` 타입 선언으로 대체되어 타입 안전성 확보.

### 마이그레이션 완료 현황

| Feature | 소스 | 테스트 | Export | 상태 |
|---------|------|--------|--------|------|
| 7.1 앱 컨테이너 | O | O | O | 완료 |
| 7.2a 데이터 시트 | O | O | O | 이슈 2건 |
| 7.2b 데이터 상세 | O | O | O | **Critical 1건** + 이슈 3건 |
| 7.2c 데이터 선택 버튼 | O | O | O | 완료 |
| 7.3 공유 데이터 | O | O | O | 이슈 1건 |
| 7.4a 주소 검색 | O | O | O | 완료 |
| 7.4b 권한 테이블 | O | O | O | 완료 (+ v12 버그 수정) |
| 7.4c 다크 모드 전환 | - | - | - | 미착수 (WBS에 [ ]로 표시) |
