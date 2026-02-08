# Field 컴포넌트 dual-element 패턴 재설계

## 배경

현재 field 컴포넌트(TextField 등)는 `<Show>`로 input과 div를 통째 교체하는 단일 요소 구조.
inset 모드에서 readonly ↔ 편집 전환 시 DOM이 바뀌어 셀 크기가 변동됨.

설계 문서(`docs/plans/260205/2026-02-05-field-components-design.md`)와 레거시 코드(`sd-textfield.control.ts`)에 명시된 dual-element 패턴으로 재작성.

## 대상 컴포넌트

field 6개:
- TextField, NumberField, DateField, DateTimeField, TimeField, TextAreaField

Select는 readonly가 없으므로 제외. Button, CheckBox, Radio는 inset 스타일만 필요.

## 렌더링 구조

### standalone (inset이 아닐 때) — 단일 구조 유지

```tsx
<Show when={isEditable()} fallback={<div class={wrapperClass}>{displayValue()}</div>}>
  <div class={wrapperClass}>
    <input class={inputClass} />
  </div>
</Show>
```

### inset일 때 — dual-element overlay 패턴

```tsx
<div class={clsx("relative", local.class)} style={local.style}>
  {/* content div — 항상 존재, 셀 크기를 잡아줌 */}
  <div
    class={wrapperClass}
    style={{ visibility: isEditable() ? "hidden" : undefined }}
  >
    {displayValue() || local.placeholder || "\u00A0"}
  </div>

  {/* input — 편집 가능할 때만, content 위에 겹침 */}
  <Show when={isEditable()}>
    <input class={twMerge(inputWrapperClass, "absolute inset-0")} />
  </Show>
</div>
```

핵심:
- content div가 항상 DOM에 존재하여 셀 크기 유지
- 편집 모드: content는 `visibility: hidden` (보이지 않지만 크기 유지), input이 `absolute inset-0`으로 위에 겹침
- readonly/disabled: content만 보임, input 없음
- content div와 input이 동일한 `fieldBaseClass` + `sizeClass`를 공유하여 크기 일치

## Field.styles.ts 변경

실질적 변경은 twMerge 순서뿐 (이미 적용됨):
- `fieldInsetClass`가 `fieldReadonlyClass`/`fieldDisabledClass` 뒤에 위치
- inset의 `bg-transparent`가 readonly의 `bg-base-100`을 항상 이김
- `fieldInsetClass`: `border-none rounded-none bg-transparent` (현행 유지)

## 컴포넌트별 차이점

| 컴포넌트 | input type | displayValue 특이사항 |
|----------|-----------|---------------------|
| TextField | text/password/email | password: `****`, format 적용 |
| NumberField | text (inputMode=numeric) | 우측 정렬, 천단위 콤마 |
| DateField | date/month/number(year) | DateOnly → 문자열 |
| DateTimeField | datetime-local | DateTime → 문자열 |
| TimeField | time | Time → 문자열 |
| TextAreaField | textarea | 여러 줄, 자동 높이 (기존 패턴 활용) |

값 변환 로직, props, 이벤트 핸들링은 변경 없음. 렌더링 구조만 교체.

## 빈 값 처리

- 값이 없을 때: placeholder 표시
- placeholder도 없을 때: `"\u00A0"` (non-breaking space)로 높이 유지

## Sheet 셀 편집 연동

```tsx
{/* 편집 컬럼: td에 class 없음 — inset TextField가 자체 패딩 보유 */}
<Sheet.Column<User> key="name" header="이름">
  {(ctx) => (
    <TextField
      value={ctx.item.name}
      onValueChange={(v) => updateEditUser(ctx.index, "name", v)}
      readonly={!ctx.edit}
      inset
    />
  )}
</Sheet.Column>

{/* 비편집 컬럼: td에 class로 패딩 */}
<Sheet.Column<User> key="email" header="이메일" class="px-2 py-1">
  {(ctx) => ctx.item.email}
</Sheet.Column>
```

inset TextField가 `fieldBaseClass`에서 패딩을 가지므로 td에 별도 패딩 불필요.
편집 컬럼과 비편집 컬럼의 패딩이 동일하게 유지됨.
