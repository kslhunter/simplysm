# `mark`

WritableSignal의 변경 알림을 수동으로 트리거한다. 배열/객체의 내부 변경(mutation) 후 consumer에게 변경을 알릴 때 사용. shallow copy로 새 참조를 생성하여 signal을 업데이트한다.

```typescript
function mark(sig: WritableSignal<any>): void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `sig` | `WritableSignal<any>` | 대상 signal. 배열이면 `[...v]`, 객체이면 `{...v}`로 shallow copy하여 update |

## 역할

- **OnPush 템플릿 재렌더링**: shallow copy로 새 참조를 생성하여 Angular의 변경 감지를 트리거한다
- **computed/effect 의존성 갱신**: signal 참조가 갱신되어 의존하는 computed·effect가 재실행된다

## Usage

```typescript
// 배열 내부 mutation 후 mark → UI 갱신
items()[0].name = "new";
mark(items);  // items signal이 [...items()] 로 갱신됨

// 객체 내부 mutation 후 mark → effect 재실행
filter().searchText = "abc";
mark(filter);  // filter signal이 {...filter()} 로 갱신됨
```

## 주의사항

> **"저장 감지"가 아니다.** `obj.equal`이 deep equal로 snapshot과 현재 값을 비교하므로, `item.name = "new"` 같은 mutation은 `mark` 없이도 `diffs()` / `onSubmit()`의 snapshot 비교에서 감지된다.

- Chrome 61 호환성(`Proxy` 폴리필 불가)으로 signal 자동 notify가 불가하여 명시적 `mark` 호출이 필요
- `mark`는 **UI에 변경을 반영**하기 위한 것이지, 데이터 변경 자체를 감지하는 메커니즘이 아니다

**실사용 예:**
- [crud-list.md §5 확장 A: inline 편집/저장](../recipes/crud-list.md#5-확장-a-inline-편집저장) — items 배열 mutation 후 mark
- [crud-list.md §6 확장 B: 선택 기능](../recipes/crud-list.md#6-확장-b-선택-기능--선택-삭제복구) — selectedItems 변경 후 mark
- [crud-detail.md §5 확장 A: 편집/저장](../recipes/crud-detail.md#5-확장-a-편집저장) — data 객체 mutation 후 mark
- [crud-detail.md §10 확장 F: 복합 상세](../recipes/crud-detail.md#10-확장-f-복합-상세-내부-sd-sheet) — 하위 컬렉션 mutation 후 mark
