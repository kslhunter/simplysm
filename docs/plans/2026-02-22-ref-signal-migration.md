# solid 패키지: let ref → createSignal ref 마이그레이션

## 배경

`<Show>` + `<Portal>` 내부의 `let` ref가 `createEffect`보다 늦게 설정되어 Dialog z-index가 적용되지 않는 버그 발생. `wrapperRef`를 `createSignal`로 변경하여 해결됨. 나머지 ref도 동일 패턴으로 통일하여 향후 같은 유형의 버그를 원천 차단한다.

## 변경 대상 (6개)

| 파일 | ref명 | 타입 |
|------|-------|------|
| `Dialog.tsx:187` | `dialogRef` | `HTMLDivElement` |
| `TopbarUser.tsx:53` | `buttonRef` | `HTMLButtonElement` |
| `TopbarMenu.tsx:66` | `mobileButtonRef` | `HTMLButtonElement` |
| `TopbarMenu.tsx:114` | `buttonRef` | `HTMLButtonElement` |
| `NotificationBell.tsx:56` | `buttonRef` | `HTMLButtonElement` |
| `Kanban.tsx:401` | `bodyRef` | `HTMLDivElement` |

참고: `Dialog.tsx`의 `wrapperRef`는 이미 변경 완료됨.

## 변경 패턴

```typescript
// Before
let fooRef: HTMLDivElement | undefined;
// JSX: ref={(el) => { fooRef = el; }}
// 사용: fooRef.xxx

// After
const [fooRef, setFooRef] = createSignal<HTMLDivElement>();
// JSX: ref={setFooRef}
// 사용: fooRef()!.xxx (이벤트 핸들러 등 DOM 존재 보장 시)
//       const el = fooRef(); if (!el) return; (effect 등 존재 불확실 시)
```

## 주의사항

- 각 ref의 사용처를 모두 확인하여 `ref()` 호출로 변경
- `createSignal` import 추가
- Dropdown.tsx:77의 ref는 JSDoc 예시이므로 변경 불필요
- 변경 후 `pnpm typecheck packages/solid` 통과 확인
