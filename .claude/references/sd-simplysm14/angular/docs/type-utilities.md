# Type Utilities

## `TDirectiveInputSignals`

컴포넌트/디렉티브의 InputSignal 프로퍼티에서 값 타입을 추출하는 유틸리티 타입. InputSignal이 아닌 프로퍼티는 제외되며, undefined를 포함하는 필드는 optional로 변환된다.

```typescript
type TDirectiveInputSignals<T> = TUndefToOptional<{
  [P in keyof T as T[P] extends InputSignal<any> ? P : never]: T[P] extends InputSignal<infer V> ? V : never;
}>
```

예시:
```typescript
class MyComponent {
  name = input.required<string>();
  age = input(0);
}
// TDirectiveInputSignals<MyComponent> = { name: string; age: number }
```

## `TUndefToOptional`

undefined를 포함하는 프로퍼티를 optional로 변환하는 유틸리티 타입.

```typescript
type TUndefToOptional<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
}
```

예시: `{ name: string; age: number | undefined }` -> `{ name: string; age?: number }`

## `TWithOptional`

특정 키를 optional로 변환하는 유틸리티 타입.

```typescript
type TWithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
```

## `TSdViewType`

뷰 타입.

```typescript
type TSdViewType = "page" | "modal" | "control"
```

## `ISortingDef`

정렬 정의.

```typescript
interface ISortingDef {
  key: string;
  desc: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | 정렬 키 |
| `desc` | `boolean` | 내림차순 여부 |

## `IExpandItemDef`

트리 확장 항목 정의.

```typescript
interface IExpandItemDef<T> {
  item: T;
  parentDef: IExpandItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `item` | `T` | 항목 |
| `parentDef` | `IExpandItemDef<T> \| undefined` | 부모 정의 |
| `hasChildren` | `boolean` | 자식 존재 여부 |
| `depth` | `number` | 깊이 |

## `ISdSelectModal`

모달 선택 컴포넌트가 구현해야 하는 인터페이스. `ISdModal`을 확장.

```typescript
interface ISdSelectModal<T> extends ISdModal<ISelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}
```

## `TSdSelectModalInfo`

모달 선택 정보. `ISdModalInfo`에서 selectMode/selectedItemKeys를 제외.

```typescript
type TSdSelectModalInfo<T extends ISdSelectModal<any>> = ISdModalInfo<T, "selectMode" | "selectedItemKeys">
```

## `TSdTextfieldTypes`

텍스트필드 타입별 값 타입 매핑.

```typescript
type TSdTextfieldTypes = {
  "number": number;
  "text": string;
  "password": string;
  "color": string;
  "email": string;
  "format": string;
  "date": DateOnly;
  "month": DateOnly;
  "year": DateOnly;
  "datetime": DateTime;
  "datetime-sec": DateTime;
  "time": Time;
  "time-sec": Time;
}
```

## `sdTextfieldTypes`

텍스트필드 타입 문자열 배열.

```typescript
const sdTextfieldTypes: (keyof TSdTextfieldTypes)[] = [
  "number", "text", "password", "color", "email", "format",
  "date", "month", "year", "datetime", "datetime-sec", "time", "time-sec",
]
```

## `TSelectModeValue`

select mode별 value 타입 매핑. `SdSelectControl`에서 export됨.

```typescript
type TSelectModeValue<T> = {
  single: T | undefined;
  multi: T[];
  "multi-with-header": T[];
}
```

## `ISidebarUserMenu`

사이드바 사용자 메뉴 항목. `SdSidebarUserControl`에서 export됨.

```typescript
interface ISidebarUserMenu {
  label: string;
  onClick: () => void | Promise<void>;
}
```

## `ISdTopbarUserMenu`

탑바 사용자 메뉴 항목. `SdTopbarUserControl`에서 export됨.

```typescript
interface ISdTopbarUserMenu {
  label: string;
  onClick: () => void | Promise<void>;
}
```

## `ISdStatePreset`

상태 프리셋 데이터. `SdStatePresetControl`에서 export됨.

```typescript
interface ISdStatePreset {
  name: string;
  data: Record<string, any>;
}
```

## `ISdKanbanBoardDropInfo`

칸반 보드 드롭 정보.

```typescript
interface ISdKanbanBoardDropInfo {
  sourceItem: any;
  sourceLane: any;
  targetLane: any;
  targetIndex: number;
}
```

## `ISdKanbanDragRef` / `ISdKanbanDropTarget`

칸반 드래그앤드롭 내부 참조 타입.

```typescript
interface ISdKanbanDragRef {
  element: HTMLElement;
  item: any;
  lane: any;
}

interface ISdKanbanDropTarget {
  element: HTMLElement;
  lane: any;
}
```
