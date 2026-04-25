# `SdForm`

> **읽어야 하는 상황**: 폼 제출(submit 이벤트)과 유효성 검증이 필요할 때.

폼 래퍼 컴포넌트. `<form>` 태그를 렌더링하며 submit 이벤트 처리 및 유효성 검증을 수행한다.

```typescript
@Component({ selector: "sd-form" })
class SdForm {
  formSubmit = output<SubmitEvent>();
  formInvalid = output();

  requestSubmit(): void;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `formSubmit` | output | `SubmitEvent` | 유효성 검증 통과 시 발생 |
| `formInvalid` | output | `void` | 유효성 검증 실패 시 발생 (`reportValidity()` 호출 후) |
| `requestSubmit()` | method | `() => void` | 프로그래밍 방식으로 submit 트리거 |

## Usage

```html
<sd-form #formCtrl (formSubmit)="onSubmit($event)">
  <sd-textfield [type]="'text'" [(value)]="name" [required]="true" />
  <sd-button [type]="'submit'">저장</sd-button>
</sd-form>
```

프로그래밍 방식 저장:

```typescript
const formCtrl = viewChild.required<SdForm>('formCtrl');

onSave(): void {
  this.formCtrl().requestSubmit();
}
```

## Related Types

### `SdStatePreset`

상태 프리셋 저장/불러오기 컴포넌트.

```typescript
@Component({ selector: "sd-state-preset" })
class SdStatePreset {
  key = input.required<string>();
  state = model<any>();
  size = input<"sm" | "lg">();
}
```

### `SdTiptapEditor`

TipTap 기반 리치 텍스트 에디터.

```typescript
@Component({ selector: "sd-tiptap-editor" })
class SdTiptapEditor {
  value = model<string>();
  disabled = input(false, { transform: booleanAttribute });
  readonly = input(false, { transform: booleanAttribute });
  required = input(false, { transform: booleanAttribute });
  placeholder = input<string>();
  validatorFn = input<(value: string | undefined) => string | undefined>();
  extensions = input<AnyExtension[]>();
}
```

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `value` | `string \| undefined` | - | HTML 콘텐츠 (two-way) |
| `disabled` | `boolean` | `false` | 비활성화 |
| `readonly` | `boolean` | `false` | 읽기 전용 |
| `required` | `boolean` | `false` | 필수 |
| `placeholder` | `string \| undefined` | `undefined` | 플레이스홀더 |
| `validatorFn` | `((value) => string \| undefined) \| undefined` | `undefined` | 커스텀 유효성 검증 함수 |
| `extensions` | `AnyExtension[] \| undefined` | `undefined` | 추가 TipTap 확장 |
