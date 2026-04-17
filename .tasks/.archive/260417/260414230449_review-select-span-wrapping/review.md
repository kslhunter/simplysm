# 코드 리뷰: sd-angular-style-migration-restore 최종 심층 리뷰

## LOGIC-001 [Medium] sd-select multi 선택 시 span 래핑이 v12와 다름

- **위치:** packages/angular/src/controls/select/sd-select.ts:410

v12 원본(sd-select.control.ts:352)에서는 multi 선택 시 **모든** 항목을 `<span style="display: inline">${item}</span>`으로 래핑한 후 separator로 join한다. 이 래핑은 vertical/horizontal 방향과 무관하게 적용된다.

v14 구현에서는 vertical 모드일 때만 `<span>`으로 래핑하며, `style="display: inline"` 속성도 누락되었다.

**v12 원본** (sd-select.control.ts:350-357):
```typescript
const innerHTML = selectedItemControls
  .map((ctl) => ctl.contentHTML())
  .map((item) => `<span style="display: inline">${item}</span>`)
  .join(
    this.multiSelectionDisplayDirection() === "vertical"
      ? "<div class='p-sm-0'></div>"
      : ", ",
  );
```

**v14 현재** (sd-select.ts:406-411):
```typescript
for (const item of selectedItems) {
  const html = item.contentHTML();
  if (html !== "") {
    htmlParts.push(isVertical ? `<span>${html}</span>` : html);
  }
}
```

두 가지 차이:
1. `style="display: inline"` 속성이 span에서 누락됨 — vertical 모드에서 `<div class='p-sm-0'>` block 요소로 구분할 때, span의 inline 속성이 없으면 레이아웃이 달라질 수 있음
2. span 래핑이 vertical 모드에만 조건부 적용됨 — v12에서는 모든 항목에 무조건 적용

**개선 방향:** Feature 2.2 구현계획(line 405-409 "각 htmlPart를 `<span style="display: inline">` 래핑")과 v12 원본에 맞게, 모든 항목을 `<span style="display: inline">`으로 래핑하도록 수정

---

## CONSIST-001 [Low] Feature 3.3 요구명세에 D4 설계 결정이 반영되지 않음

- **위치:** .tasks/260414211344_sd-angular-style-migration-restore/3.3-sd-modal-restore.md:59-65

Feature 3.3 문서의 요구명세 섹션에 `Rule: dialog tabindex는 0`이 명시되어 있으나, 동일 문서의 설계 결정 D4에서 `tabindex="-1"` 유지로 결정하고 Slice 1에서 "(tabindex는 D4로 제외)"로 명시하였다. WBS에서도 `~~dialog tabindex: -1 → 0 복원~~ → 제외`로 취소선 처리되어 있다.

**실제 코드**(sd-modal.ts:42)는 `tabindex="-1"`로 D4 결정을 올바르게 따르고 있어 **코드에는 문제 없음**. 다만 요구명세 Scenario가 구현과 불일치하여 향후 혼란을 유발할 수 있다.

**개선 방향:** 요구명세의 Rule/Scenario를 D4 결정에 맞게 수정하거나, 제외된 사항임을 명시하는 주석 추가

---
