# 코드 리뷰: style-migration

## LOGIC-001 [Medium] sd-shared-data-select "미지정" 클릭 시 single 모드에서 드롭다운 미닫힘

- **위치:** packages/angular/src/data/shared-data/sd-shared-data-select.ts:377-379

v12에서 "미지정" 옵션은 `<sd-select-item>`으로 구현되어 클릭 시 `SdSelect.selectItem()` → `closeDropdown()`이 호출되었다. v14에서는 `<div>` + `onUndefinedClick()`으로 변경되었는데, 이 메서드는 값만 설정하고 드롭다운을 닫지 않는다.

```typescript
// 현재 (v14)
onUndefinedClick(): void {
  this.value.set(undefined as any);
}
```

single 모드에서 사용자가 "미지정"을 선택하면 드롭다운이 열린 채로 남아 있어, 다른 항목 선택 시 자동 닫기 동작과 불일치한다. WBS에서 "스타일 복원 범위 밖"으로 표기했으나, 동일 화면에서 일반 항목은 닫히고 "미지정"만 안 닫히는 것은 사용자 경험 퇴행이다.

**개선 방향:** single 모드일 때 `closeDropdown()` 호출 추가

```typescript
onUndefinedClick(): void {
  this.value.set(undefined as any);
  if (this.selectMode() === "single") {
    this._selectCtrl()?.closeDropdown();
  }
}
```

---

## CONSIST-001 [Low] sd-select-button의 border-left/padding이 sd-select 부모 스타일과 중복 선언

- **위치:** packages/angular/src/controls/select/sd-select-button.ts:23-25, packages/angular/src/controls/select/sd-select.ts:147-155

sd-select-button 자체 스타일과 sd-select의 자식 선택자 스타일이 동일 속성을 서로 다른 값으로 선언한다:

| 속성 | sd-select-button 자체 | sd-select 부모 (적용됨) |
|---|---|---|
| `padding` | `var(--gap-sm) var(--gap-default)` | `var(--gap-sm)` |
| `border-left` | `1px solid var(--trans-lighter)` | `1px solid var(--theme-gray-lightest)` |

sd-select의 `sd-select > sd-dropdown > sd-select-button` 선택자가 더 높은 specificity를 가지므로 항상 부모 스타일이 적용된다. sd-select-button은 sd-select 내부에서만 사용되므로(`inject(SdSelect)` 의존), 자체 `padding`/`border-left` 선언은 dead code이다.

v12에서 sd-select-button은 `padding`과 `border-left`를 자체 스타일에 포함하지 않았으며, 이 두 속성은 부모 sd-select에서만 설정되었다. 이 중복은 마이그레이션 수정 이전의 v14에서 이미 존재하던 문제이다.

**개선 방향:** sd-select-button의 자체 스타일에서 `padding`과 `border-left`를 제거하고 부모(sd-select)의 자식 선택자에서만 관리. 또는 의도적으로 standalone 사용을 위한 fallback이라면 부모와 동일한 값으로 통일.

---

## DESIGN-001 [Low] sd-select-button의 CSS position/overflow가 setupRipple() 런타임 설정과 중복

- **위치:** packages/angular/src/controls/select/sd-select-button.ts:26-27

sd-select-button의 CSS에 `position: relative; overflow: hidden;`이 선언되어 있으나, 생성자에서 호출하는 `setupRipple()`이 동일 속성을 inline style로 설정한다 (`setupRipple.ts:9-12`). inline style이 CSS 선언보다 우선하므로, CSS 선언은 실질적으로 효과가 없다.

이 중복은 마이그레이션 수정 이전에 이미 존재하던 문제이다.

**개선 방향:** CSS에서 `position: relative; overflow: hidden;`을 제거하거나, setupRipple()의 런타임 스타일 설정과 역할을 명확히 분리.
