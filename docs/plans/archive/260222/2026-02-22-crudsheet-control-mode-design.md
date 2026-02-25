# CrudSheet 3-mode 지원 (control 모드 추가 + modal 보완)

## 배경

CrudDetail은 page/modal/control 3가지 모드를 지원하지만, CrudSheet은 control 모드의 인라인 저장/새로고침이 누락되어 있고, modal 모드의 Dialog.Action도 없다. 또한 하단 바(확인/해제)가 selectMode만으로 표시되는 버그도 있다.

## 모드 감지 (CrudDetail과 동일 패턴)

| 모드 | 조건 | 설명 |
|------|------|------|
| page | `topbarCtx` 존재 | Topbar에 저장/새로고침 표시 |
| modal | `dialogInstance` 존재 | Dialog.Action에 새로고침, 하단 바 |
| control | 둘 다 없음 | 인라인 저장/새로고침 바 |

## 변경 파일

`packages/solid/src/components/data/crud-sheet/CrudSheet.tsx` 만 수정

## 변경 내용

### 1. import 추가

- `useDialogInstance` from `../../disclosure/DialogInstanceContext`
- `Dialog` from `../../disclosure/Dialog`

### 2. isModal 감지 추가

```typescript
const dialogInstance = useDialogInstance();
const isModal = dialogInstance !== undefined;
```

### 3. Control 모드: 인라인 저장/새로고침 바

조건: `!isModal && !topbarCtx && canEdit() && local.inlineEdit`

기존 툴바 위에 별도 바로 추가:

```
[저장][새로고침]              ← 이 바를 추가
[Header]
[Filter]
[행추가][삭제][엑셀][Tools]   ← 기존 툴바 (변경 없음)
[Sheet]
```

### 4. Modal 모드: Dialog.Action

조건: `isModal`

```tsx
<Show when={isModal}>
  <Dialog.Action>
    <button onClick={handleRefresh}>
      <Icon icon={IconRefresh} />
    </button>
  </Dialog.Action>
</Show>
```

### 5. 하단 바 조건 수정 (버그 수정)

변경 전: `<Show when={isSelectMode()}>`
변경 후: `<Show when={isModal && isSelectMode()}>`

## 렌더 구조 (변경 후)

```
[Dialog.Action: 새로고침]     ← modal일 때
[저장][새로고침]              ← control + inlineEdit일 때
[Header]
[Filter]
[행추가][삭제][엑셀][Tools]   ← 기존 툴바
[Sheet]
[하단 바: 확인/해제]          ← modal + selectMode일 때
```
