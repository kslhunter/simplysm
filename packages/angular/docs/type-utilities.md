# Type Utilities

## `DirectiveInputSignals`

컴포넌트/디렉티브의 InputSignal 프로퍼티에서 값 타입을 추출하는 유틸리티 타입. InputSignal이 아닌 프로퍼티는 제외되며, undefined를 포함하는 필드는 optional로 변환된다.

```typescript
type DirectiveInputSignals<T> = UndefToOptional<{
  [P in keyof T as T[P] extends InputSignal<any> ? P : never]: T[P] extends InputSignal<infer V> ? V : never;
}>
```

예시:
```typescript
class MyComponent {
  name = input.required<string>();
  age = input(0);
}
// DirectiveInputSignals<MyComponent> = { name: string; age: number }
```

## `UndefToOptional`

undefined를 포함하는 프로퍼티를 optional로 변환하는 유틸리티 타입.

```typescript
type UndefToOptional<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
}
```

예시: `{ name: string; age: number | undefined }` -> `{ name: string; age?: number }`

## `WithOptional`

특정 키를 optional로 변환하는 유틸리티 타입.

```typescript
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
```

## `SdViewType`

뷰 타입.

```typescript
type SdViewType = "page" | "modal" | "control"
```

## `SortingDef`

정렬 정의.

```typescript
interface SortingDef {
  key: string;
  desc: boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | 정렬 키. **컬럼 `key`가 `"vendor.name"`, `"lot.goods.code"` 같은 체인 경로일 수 있다.** 따라서 `item[key]` 단순 접근 대신 `obj.getChainValue(item, key)` (from `@simplysm/core-common`)을 사용해 체인을 따라 값을 조회해야 한다 |
| `desc` | `boolean` | 내림차순 여부 |

## `ExpandItemDef`

트리 확장 항목 정의.

```typescript
interface ExpandItemDef<T> {
  item: T;
  parentDef: ExpandItemDef<T> | undefined;
  hasChildren: boolean;
  depth: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `item` | `T` | 항목 |
| `parentDef` | `ExpandItemDef<T> \| undefined` | 부모 정의 |
| `hasChildren` | `boolean` | 자식 존재 여부 |
| `depth` | `number` | 깊이 |

## `SdSelectModal`

모달 선택 컴포넌트가 구현해야 하는 인터페이스. `SdModalContentDef`를 확장.

```typescript
interface SdSelectModal<T> extends SdModalContentDef<SelectModalOutputResult<T>> {
  selectMode: InputSignal<"single" | "multi" | undefined>;
  selectedItemKeys: InputSignal<any[]>;
}
```

## `SdSelectModalInfo`

모달 선택 정보. `SdModalInfo`에서 selectMode/selectedItemKeys를 제외.

```typescript
type SdSelectModalInfo<T extends SdSelectModal<any>> = SdModalInfo<T, "selectMode" | "selectedItemKeys">
```

## `SdTextfieldTypes`

텍스트필드 타입별 값 타입 매핑.

```typescript
type SdTextfieldTypes = {
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
const sdTextfieldTypes: (keyof SdTextfieldTypes)[] = [
  "number", "text", "password", "color", "email", "format",
  "date", "month", "year", "datetime", "datetime-sec", "time", "time-sec",
]
```

## `SelectModeValue`

select mode별 value 타입 매핑. `SdSelect`에서 export됨.

```typescript
type SelectModeValue<T> = {
  multi: T[];
  single: T;
}
```

## `SdSidebarUserMenu`

사이드바 사용자 메뉴 항목. `SdSidebarUser`에서 export됨.

```typescript
interface SdSidebarUserMenu {
  title: string;
  menus: {
    title: string;
    onClick: () => void;
  }[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 사용자 메뉴 제목 |
| `menus` | `{ title: string; onClick: () => void }[]` | 하위 메뉴 항목 배열 |

## `SdTopbarUserMenu`

탑바 사용자 메뉴 항목. `SdTopbarUser`에서 export됨.

```typescript
interface SdTopbarUserMenu {
  title: string;
  onClick: () => void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 메뉴 제목 |
| `onClick` | `() => void` | 클릭 핸들러 |

## `SdStatePresetDef`

상태 프리셋 데이터. `SdStatePreset`에서 export됨.

```typescript
interface SdStatePresetDef {
  name: string;
  state: any;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | 프리셋 이름 |
| `state` | `any` | 저장된 상태 데이터 |

## `SdKanbanBoardDropInfo`

칸반 보드 드롭 정보. `SdKanbanBoard`에서 export됨.

```typescript
interface SdKanbanBoardDropInfo<L, T> {
  sourceKanbanValue?: T;
  targetLaneValue?: L;
  targetKanbanValue?: T;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sourceKanbanValue` | `T \| undefined` | 드래그한 칸반 아이템의 값 |
| `targetLaneValue` | `L \| undefined` | 드롭 대상 레인의 값 |
| `targetKanbanValue` | `T \| undefined` | 드롭 대상 칸반 아이템의 값 (칸반 위에 드롭 시) |

## `SdKanbanDragRef`

칸반 드래그 참조 인터페이스. `SdKanbanBoard`에서 export됨.

```typescript
interface SdKanbanDragRef<_L, T> {
  value(): T | undefined;
  heightOnDrag(): number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `value()` | `T \| undefined` | 드래그 중인 칸반 아이템의 값 |
| `heightOnDrag()` | `number` | 드래그 시작 시점의 요소 높이 |

## `SdKanbanDropTarget`

칸반 드롭 타겟 인터페이스. `SdKanbanBoard`에서 export됨.

```typescript
interface SdKanbanDropTarget<L, T> {
  targetLaneValue(): L | undefined;
  targetKanbanValue?(): T | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `targetLaneValue()` | `L \| undefined` | 드롭 대상 레인의 값 |
| `targetKanbanValue?()` | `T \| undefined` | 드롭 대상 칸반 아이템의 값 (optional) |
