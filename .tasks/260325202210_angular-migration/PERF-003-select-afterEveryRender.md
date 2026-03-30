# Feature PERF-003 select-item afterEveryRender 성능 개선

## 참조 자료

- [wbs.md](./wbs.md)
- [review.md](../.achive/260329202656_review-angular-migration/review.md)

### 대상 파일

| 파일 | 역할 |
|------|------|
| `src/ui/form/select/sd-select-item.control.ts` | 자식: afterEveryRender에서 isSelected + contentHTML 갱신 |
| `src/ui/form/select/sd-select.control.ts` | 부모: afterEveryRender에서 _selectedItemContentHTML 갱신 |

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | isSelected 갱신 방식 | computed | parent.value()와 item.value()가 모두 signal이므로 computed로 자동 추적 가능 |
| D2 | contentHTML 갱신 방식 | MutationObserver | ng-content의 DOM 변경만 감지하여 innerHTML을 읽음. afterNextRender로 초기값 설정, 이후 MutationObserver로 변경 감지 |
| D3 | 부모 _selectedItemContentHTML 갱신 방식 | effect | item.contentHTML()과 value()가 signal이므로 effect로 반응형 추적. afterEveryRender 제거 |

## 요구명세

```gherkin
Feature: PERF-003 select-item afterEveryRender 성능 개선

  Background:
    Given sd-select 컴포넌트가 sd-select-item들과 함께 렌더링되어 있다

  Rule: isSelected는 signal 변경 시에만 재계산되어야 한다

    Scenario: value 변경 시 isSelected가 올바르게 갱신된다
      Given selectMode가 "single"이다
      When value가 특정 item의 값으로 변경된다
      Then 해당 item의 isSelected()가 true가 된다
      And 다른 item들의 isSelected()는 false가 된다

    Scenario: multi 모드에서 isSelected가 배열 비교로 동작한다
      Given selectMode가 "multi"이다
      When value 배열에 특정 item이 포함된다
      Then 해당 item의 isSelected()가 true가 된다

  Rule: contentHTML은 DOM 변경 시에만 갱신되어야 한다

    Scenario: 초기 렌더 후 contentHTML이 설정된다
      Given sd-select-item이 렌더링되었다
      Then contentHTML()이 투영된 콘텐츠의 innerHTML과 일치한다

    Scenario: 투영된 콘텐츠가 변경되면 contentHTML이 갱신된다
      Given sd-select-item의 contentHTML이 초기값으로 설정되어 있다
      When 투영된 콘텐츠의 텍스트가 변경된다
      Then contentHTML()이 새 innerHTML으로 갱신된다

  Rule: 부모의 선택 표시는 signal 기반으로 갱신되어야 한다

    Scenario: value 변경 시 선택된 항목의 HTML이 트리거 영역에 표시된다
      Given single 모드 sd-select에 3개 item이 있다
      When value가 두 번째 item으로 변경된다
      Then _selectedItemContentHTML이 두 번째 item의 contentHTML과 일치한다
```

## 구현계획

### 배경

sd-select-item과 sd-select 모두 `afterEveryRender`를 사용하여 매 렌더 사이클마다 DOM 읽기와 signal 갱신을 수행한다. select-item이 많으면 비용이 누적된다.

### 목표

- sd-select-item의 `afterEveryRender` 제거
- `isSelected`를 `computed`로 전환
- `contentHTML`을 `MutationObserver` 기반으로 전환
- sd-select의 `afterEveryRender`를 `effect`로 전환

### 비목표

- sd-select의 기능 변경 (동작은 동일해야 함)
- 다른 컴포넌트의 afterEveryRender 패턴 변경

### 설계

#### sd-select-item 변경

```typescript
// isSelected: afterEveryRender → computed
isSelected = computed(() => {
  const parentValue = this._parentControl.value();
  const itemValue = this.value();
  if (this._parentControl.selectMode() === "multi") {
    const arr = parentValue as T[] | undefined;
    return arr != null && arr.includes(itemValue);
  }
  return parentValue === itemValue;
});

// contentHTML: afterEveryRender → afterNextRender + MutationObserver
constructor() {
  afterNextRender(() => {
    const contentEl = this._elRef.nativeElement.querySelector("._content");
    if (contentEl == null) return;

    // 초기값 설정
    this.contentHTML.set(contentEl.innerHTML);

    // MutationObserver로 변경 감지
    const observer = new MutationObserver(() => {
      this.contentHTML.set(contentEl.innerHTML);
    });
    observer.observe(contentEl, { childList: true, characterData: true, subtree: true });

    inject(DestroyRef).onDestroy(() => observer.disconnect());
  });
}
```

#### sd-select 변경

```typescript
// afterEveryRender → effect
effect(() => {
  const items = this._itemControls();
  const currentValue = this.value();
  // ... (기존 로직 동일)
});
```

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| computed + MutationObserver | 채택 | signal 기반 반응성, DOM 변경 시에만 읽기 |
| afterEveryRender에서 변경 체크 추가 | 미채택 | DOM 읽기 자체가 매 렌더마다 발생 |
| contentHTML을 input으로 노출 | 미채택 | API 변경이 필요하고 기존 사용처에 영향 |

### Vertical Slices

#### Slice 1: isSelected를 computed로 전환 + 부모 effect 전환
- [x] **구현 내용:** sd-select-item의 isSelected를 computed로, sd-select의 afterEveryRender를 effect로 전환. contentHTML은 아직 afterEveryRender에서 처리.
- **Scenarios:**
  - Scenario: value 변경 시 isSelected가 올바르게 갱신된다
  - Scenario: multi 모드에서 isSelected가 배열 비교로 동작한다
  - Scenario: value 변경 시 선택된 항목의 HTML이 트리거 영역에 표시된다

#### Slice 2: contentHTML을 MutationObserver 기반으로 전환
- [x] **구현 내용:** sd-select-item의 afterEveryRender 완전 제거. contentHTML을 afterNextRender + MutationObserver로 전환.
- **의존:** Slice 1
- **Scenarios:**
  - Scenario: 초기 렌더 후 contentHTML이 설정된다
  - Scenario: 투영된 콘텐츠가 변경되면 contentHTML이 갱신된다
