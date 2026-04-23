# `openFileDialog`

프로그래밍 방식으로 파일 선택 대화상자를 여는 함수. `<input type="file">`을 DOM에 추가하지 않고 사용할 수 있다.

## When to use

- ✅ 버튼 클릭 등 사용자 인터랙션에서 파일 선택이 필요할 때
- ✅ Angular 컴포넌트에서 `<input type="file">` 없이 파일 선택할 때
- ❌ 드래그 앤 드롭 파일 업로드 → `dragover`/`drop` 이벤트 직접 처리

## Signature

```typescript
export function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined>
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `options.accept` | `string` | 파일 형식 필터 (예: `".xlsx,.csv"`, `"image/*"`) |
| `options.multiple` | `boolean` | 다중 선택 허용 여부. 기본값 `false` |

## Returns

`Promise<File[] | undefined>` — 파일 선택 시 `File[]`, 취소 시 `undefined`.

## Usage

### 최소 예제

```typescript
import { openFileDialog } from "@simplysm/core-browser";

const files = await openFileDialog();
if (files != null) {
  // 파일 처리
}
```

### 전형 예제 — 이미지 다중 선택

```typescript
import { openFileDialog } from "@simplysm/core-browser";

const images = await openFileDialog({
  accept: "image/*",
  multiple: true,
});

if (images != null) {
  for (const file of images) {
    const arrayBuffer = await file.arrayBuffer();
    // 이미지 처리
  }
}
```
