# TextAreaField 컴포넌트 마이그레이션 설계

## 개요

Angular 레거시 `SdTextareaControl`을 Solid 패키지의 `TextAreaField`로 마이그레이션한다.
기존 `TextField` 패턴을 따르며, textarea 고유의 자동 높이 조절을 hidden div 방식으로 구현한다.

## 원본

- `.legacy-packages/sd-angular/src/ui/form/input/sd-textarea.control.ts`

## 파일 구성

| 파일                                                                 | 작업        |
| -------------------------------------------------------------------- | ----------- |
| `packages/solid/src/components/form-control/field/TextAreaField.tsx` | 신규 생성   |
| `packages/solid/src/index.ts`                                        | export 추가 |

별도 styles 파일은 만들지 않는다. `Field.styles.ts`의 기존 스타일을 재사용한다.

## Props

```typescript
export interface TextAreaFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  readonly?: boolean;
  error?: boolean;
  size?: FieldSize;
  inset?: boolean;
  minRows?: number; // 최소 줄 수 (기본값: 1)
  class?: string;
  style?: JSX.CSSProperties;
}
```

- TextField와 동일한 props 세트에서 `type`, `autocomplete`, `format`을 제외
- textarea 고유 prop으로 `minRows` 추가
- `theme` prop은 제외 (TextField와의 일관성)
- 네이밍: `onChange` (TextField의 `onValueChange`와 달리 `onChange` 사용)

## 자동 높이 조절: Hidden div 방식

### 선택 이유

Table 셀에 inset으로 넣었을 때, 내용물 크기에 따라 셀 크기가 자동 조절되어야 한다.

- **JS scrollHeight 방식의 문제**: textarea는 기본적으로 고정 크기를 가지므로 CSS 레이아웃 시스템이
  내용물 크기를 모른다. JS로 높이를 설정하는 건 렌더링 이후에 일어나므로 layout shift가 발생한다.
- **Hidden div 방식의 장점**: hidden div가 실제 content 크기를 가지고 있어서, table cell이 이를 기반으로
  크기를 정확히 계산할 수 있다.

### 구조

**편집 모드** (disabled/readonly가 아닐 때):

```tsx
<div class={wrapperClass} style={{ position: "relative", ...local.style }}>
  {/* 높이 측정용 div — visibility: hidden이지만 레이아웃 공간 차지 */}
  <div style={{ "visibility": "hidden", "white-space": "pre-wrap", "word-break": "break-all" }}>
    {contentForHeight()}
    {"\n "} {/* 마지막 줄바꿈 뒤 높이 보장 */}
  </div>

  {/* 실제 입력 — absolute로 hidden div 위에 겹침 */}
  <textarea
    class={textareaClass}
    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    value={value()}
    placeholder={local.placeholder}
    title={local.title}
    onInput={handleInput}
  />
</div>
```

**표시 모드** (disabled 또는 readonly):

```tsx
<div class={wrapperClass} style={{ "white-space": "pre-wrap", "word-break": "break-all", ...local.style }}>
  {value() || "\u00A0"}
</div>
```

### minRows 처리

CSS `min-height` 대신 hidden div의 content 자체에 최소 줄 수를 보장한다.
이렇게 하면 padding 계산 없이 wrapper가 자연스럽게 처리한다.

```typescript
const contentForHeight = () => {
  const minContent = "\n".repeat((local.minRows ?? 1) - 1) + "\u00A0";
  const val = value();
  return val.split("\n").length >= (local.minRows ?? 1) ? val : minContent;
};
```

## 스타일 처리

- `Field.styles.ts`의 기존 스타일 재사용 (`fieldBaseClass`, `fieldSizeClasses`, `fieldErrorClass` 등)
- TextArea 고유 override는 `twMerge`로 처리:
  - `h-field` → `h-auto` (내용에 따라 높이 가변)
  - `inline-flex items-center` → `block` (블록 레이아웃)
- textarea 요소 자체: `resize-none`, `overflow-hidden`, `outline-none`, `bg-transparent`

## 제외 항목 (Angular 대비)

| Angular 기능                | 제외 이유                               |
| --------------------------- | --------------------------------------- |
| `theme` prop                | Solid TextField에 없음 (일관성)         |
| `inline` prop               | Solid 필드 계열에서 사용하지 않음       |
| `validatorFn` / `required`  | Solid는 `error` prop으로 외부에서 제어  |
| `inputStyle` / `inputClass` | Solid는 `class` / `style` prop으로 통일 |
