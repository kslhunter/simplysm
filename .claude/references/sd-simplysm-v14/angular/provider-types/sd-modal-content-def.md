# `SdModalContentDef`

모달 컴포넌트가 구현해야 하는 인터페이스.

```typescript
interface SdModalContentDef<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>;
  readonly _optionalModalInputs?: string;
}
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | `Signal<boolean>` | 초기화 완료 여부 |
| `close` | `OutputEmitterRef<O \| undefined>` | 닫기 output (결과 전달) |
| `actionTplRef` | `TemplateRef<any> \| undefined` | 모달 헤더 액션 영역 템플릿 |
| `_optionalModalInputs` | `string \| undefined` | optional로 취급할 input 키 목록 (리터럴 타입) |

## 구현 패턴

```typescript
export class CustomerDetail implements SdModalContentDef<boolean | undefined> {
  initialized = signal(false);
  close = output<boolean | undefined>();
  actionTplRef?: TemplateRef<any>;

  private readonly _modalActionTpl = viewChild("modalActionTpl", { read: TemplateRef });

  constructor() {
    effect(() => {
      this.actionTplRef = this._modalActionTpl();
    });
  }

  protected async onSubmit(): Promise<void> {
    // ... (ORM upsert)
    this.close.emit(true);
  }
}
```

## Related Types

### `SdModalInfo`

모달 생성 시 전달하는 정보.

```typescript
interface SdModalInfo<T extends SdModalContentDef<any>, X extends keyof any = ""> {
  title: string;
  type: Type<T>;
  inputs: WithOptional<Omit<DirectiveInputSignals<T>, SdModalExcludeKeys | X>, ...>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 모달 제목 |
| `type` | `Type<T>` | 모달 컴포넌트 타입 |
| `inputs` | `object` | 컴포넌트 inputs (initialized, close, actionTplRef 제외) |

### `SdModalOptions`

모달 옵션.

```typescript
interface SdModalOptions {
  key?: string;
  hideHeader?: boolean;
  hideCloseButton?: boolean;
  useCloseByBackdrop?: boolean;
  useCloseByEscapeKey?: boolean;
  float?: boolean;
  fill?: boolean;
  resizable?: boolean;
  movable?: boolean;
  position?: "bottom-right" | "top-right";
  minHeightPx?: number;
  minWidthPx?: number;
  heightPx?: number;
  widthPx?: number;
  headerStyle?: string;
  noFirstControlFocusing?: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string \| undefined` | 동일 키의 모달이 이미 열려 있으면 재사용 |
| `hideHeader` | `boolean \| undefined` | 헤더 숨김 |
| `hideCloseButton` | `boolean \| undefined` | 닫기 버튼 숨김 |
| `useCloseByBackdrop` | `boolean \| undefined` | 배경 클릭으로 닫기 |
| `useCloseByEscapeKey` | `boolean \| undefined` | ESC 키로 닫기 |
| `float` | `boolean \| undefined` | 플로팅 모달 |
| `fill` | `boolean \| undefined` | 전체 화면 채우기 |
| `resizable` | `boolean \| undefined` | 크기 조절 가능 |
| `movable` | `boolean \| undefined` | 이동 가능 |
| `position` | `"bottom-right" \| "top-right" \| undefined` | 위치 프리셋 |
| `minHeightPx` | `number \| undefined` | 최소 높이 (px) |
| `minWidthPx` | `number \| undefined` | 최소 너비 (px) |
| `heightPx` | `number \| undefined` | 높이 (px) |
| `widthPx` | `number \| undefined` | 너비 (px) |
| `headerStyle` | `string \| undefined` | 헤더 인라인 스타일 |
| `noFirstControlFocusing` | `boolean \| undefined` | 첫 번째 컨트롤 자동 포커스 비활성화 |

### `SelectModalOutputResult`

모달 선택 결과.

```typescript
interface SelectModalOutputResult<T> {
  selectedItemKeys: any[];
  selectedItems: T[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `selectedItemKeys` | `any[]` | 선택된 항목 키 배열 |
| `selectedItems` | `T[]` | 선택된 항목 배열 |

### `SdSelectModal`

선택 모달 컴포넌트가 구현해야 하는 인터페이스. `SdModalContentDef<SelectModalOutputResult<T>>`를 확장한다.

```typescript
interface SdSelectModal<T> extends SdModalContentDef<SelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `selectMode` | `InputSignal<"single" \| "multi" \| undefined>` | 선택 모드 |
| `selectedItemKeys` | `InputSignal<any[]>` | 이미 선택된 항목 키 배열 (복원용) |

### `SdSelectModalInfo`

모달 선택 정보.

```typescript
type SdSelectModalInfo<T extends SdSelectModal<any>> = SdModalInfo<T, "selectMode" | "selectedItemKeys">
```
