# `SdToastContentDef`

커스텀 토스트 컴포넌트가 구현해야 하는 인터페이스.

```typescript
interface SdToastContentDef<O> {
  close: OutputEmitterRef<O | undefined>;
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `close` | `OutputEmitterRef<O \| undefined>` | 닫기 output |

## Related Types

### `SdToastInput`

커스텀 토스트 생성 입력.

```typescript
interface SdToastInput<T extends SdToastContentDef<any>> {
  type: Type<T>;
  inputs: Omit<DirectiveInputSignals<T>, "close">;
}
```

### `SdToastSeverity`

```typescript
type SdToastSeverity = "info" | "success" | "warning" | "danger";
```

### `SdToastTheme`

```typescript
type SdToastTheme = "primary" | "secondary" | SdToastSeverity | "gray" | "blue-gray";
```

### `SdBusyType`

```typescript
type SdBusyType = "spinner" | "bar" | "cube";
```

## Related Types (Print)

### `SdPrint`

인쇄 컴포넌트가 구현해야 하는 인터페이스.

```typescript
interface SdPrint {
  initialized: Signal<boolean>;
  readonly _optionalPrintInputs?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | `Signal<boolean>` | 초기화 완료 여부 (true 될 때까지 대기 후 인쇄) |
| `_optionalPrintInputs` | `string \| undefined` | optional로 취급할 input 키 목록 |

### `SdPrintInput`

```typescript
interface SdPrintInput<T, X extends keyof any = ""> {
  type: Type<T>;
  inputs: WithOptional<Omit<DirectiveInputSignals<T>, "_optionalPrintInputs" | X>, ...>;
}
```
