# Provider Types

## `AppStructureItem`

앱 구조 항목. 그룹(children 보유) 또는 리프(perms/url 보유) 중 하나.

```typescript
type AppStructureItem<TModule = unknown> =
  | AppStructureGroupItem<TModule>
  | AppStructureLeafItem<TModule>;
```

### `AppStructureGroupItem`

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | 항목 코드 |
| `title` | `string` | 표시 제목 |
| `modules` | `TModule[] \| undefined` | 모듈 제한 (OR 조건) |
| `requiredModules` | `TModule[] \| undefined` | 필수 모듈 (AND 조건) |
| `icon` | `string \| undefined` | 아이콘 |
| `children` | `AppStructureItem<TModule>[]` | 자식 항목 |

### `AppStructureLeafItem`

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | 항목 코드 |
| `title` | `string` | 표시 제목 |
| `modules` | `TModule[] \| undefined` | 모듈 제한 (OR 조건) |
| `requiredModules` | `TModule[] \| undefined` | 필수 모듈 (AND 조건) |
| `perms` | `("use" \| "edit")[] \| undefined` | 권한 목록 |
| `subPerms` | `AppStructureSubPermission<TModule>[] \| undefined` | 하위 권한 |
| `icon` | `string \| undefined` | 아이콘 |
| `url` | `string \| undefined` | 외부 URL |
| `isNotMenu` | `boolean \| undefined` | 메뉴에서 제외 여부 |

### `AppStructureSubPermission`

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | 하위 권한 코드 |
| `title` | `string` | 표시 제목 |
| `modules` | `TModule[] \| undefined` | 모듈 제한 |
| `requiredModules` | `TModule[] \| undefined` | 필수 모듈 |
| `perms` | `("use" \| "edit")[]` | 권한 목록 |

## `SdMenu`

메뉴 트리 노드.

```typescript
interface SdMenu {
  title: string;
  codeChain: string[];
  url?: string;
  icon?: string;
  children?: SdMenu[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 메뉴 제목 |
| `codeChain` | `string[]` | 코드 체인 (루트부터 현재까지) |
| `url` | `string \| undefined` | 외부 URL |
| `icon` | `string \| undefined` | 아이콘 |
| `children` | `SdMenu[] \| undefined` | 하위 메뉴 |

## `SdFlatMenu`

플랫 메뉴 항목 (리프만).

```typescript
interface SdFlatMenu<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `titleChain` | `string[]` | 타이틀 체인 |
| `codeChain` | `string[]` | 코드 체인 |
| `modulesChain` | `TModule[][]` | 모듈 체인 |

## `SdPermission`

권한 트리 노드.

```typescript
interface SdPermission<TModule = unknown> {
  title: string;
  codeChain: string[];
  modules: TModule[] | undefined;
  perms: ("use" | "edit")[] | undefined;
  children: SdPermission<TModule>[] | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | 권한 제목 |
| `codeChain` | `string[]` | 코드 체인 |
| `modules` | `TModule[] \| undefined` | 모듈 제한 |
| `perms` | `("use" \| "edit")[] \| undefined` | 권한 목록 |
| `children` | `SdPermission<TModule>[] \| undefined` | 하위 권한 |

## `FlatPermission`

플랫 권한 항목.

```typescript
interface FlatPermission<TModule = unknown> {
  titleChain: string[];
  codeChain: string[];
  modulesChain: TModule[][];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `titleChain` | `string[]` | 타이틀 체인 |
| `codeChain` | `string[]` | 코드 체인 |
| `modulesChain` | `TModule[][]` | 모듈 체인 |

## `SharedDataBase`

공유 데이터 기본 인터페이스. 모든 공유 데이터 항목이 구현해야 한다.

```typescript
interface SharedDataBase<TKey extends string | number> {
  __valueKey: TKey;
  __searchText: string;
  __isHidden: boolean;
  __parentKey?: TKey;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `__valueKey` | `TKey` | 고유 키 |
| `__searchText` | `string` | 검색 대상 텍스트 |
| `__isHidden` | `boolean` | 숨김 여부 |
| `__parentKey` | `TKey \| undefined` | 부모 키 (트리 구조용) |

## `SharedDataInfo`

공유 데이터 등록 정보.

```typescript
interface SharedDataInfo<T extends SharedDataBase<string | number>> {
  serviceKey: string;
  getter: (changeKeys?: (string | number)[]) => Promise<T[]>;
  filter?: unknown;
  orderBy?: (a: T, b: T) => number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `serviceKey` | `string` | ServiceClient 연결 키 |
| `getter` | `(changeKeys?) => Promise<T[]>` | 데이터 조회 함수. changeKeys 전달 시 부분 조회 |
| `filter` | `unknown` | 이벤트 필터 (같은 이름의 다른 필터 구분용) |
| `orderBy` | `((a, b) => number) \| undefined` | 정렬 함수 |

## `SharedDataHandle`

공유 데이터 핸들. `getHandle()`이 반환하는 객체.

```typescript
interface SharedDataHandle<T extends SharedDataBase<string | number>> {
  items: Signal<T[]>;
  get(key: T["__valueKey"] | undefined): T | undefined;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `Signal<T[]>` | 데이터 항목 signal |
| `get(key)` | `(key) => T \| undefined` | 키로 항목 조회 |

## `SdModalContentDef`

모달 컴포넌트가 구현해야 하는 인터페이스.

```typescript
interface SdModalContentDef<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>;
  readonly _optionalModalInputs?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `initialized` | `Signal<boolean>` | 초기화 완료 여부 |
| `close` | `OutputEmitterRef<O \| undefined>` | 닫기 output (결과 전달) |
| `actionTplRef` | `TemplateRef<any> \| undefined` | 모달 헤더 액션 영역 템플릿 |
| `_optionalModalInputs` | `string \| undefined` | optional로 취급할 input 키 목록 (리터럴 타입) |

## `SdModalInfo`

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

## `SdModalOptions`

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

## `SdToastContentDef`

커스텀 토스트 컴포넌트가 구현해야 하는 인터페이스.

```typescript
interface SdToastContentDef<O> {
  close: OutputEmitterRef<O | undefined>;
}
```

## `SdToastInput`

커스텀 토스트 생성 입력.

```typescript
interface SdToastInput<T extends SdToastContentDef<any>> {
  type: Type<T>;
  inputs: Omit<DirectiveInputSignals<T>, "close">;
}
```

## `SdToastSeverity`

```typescript
type SdToastSeverity = "info" | "success" | "warning" | "danger";
```

## `SdToastTheme`

```typescript
type SdToastTheme = "primary" | "secondary" | SdToastSeverity | "gray" | "blue-gray";
```

## `SdBusyType`

```typescript
type SdBusyType = "spinner" | "bar" | "cube";
```

## `SdPrint`

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

## `SdPrintInput`

인쇄 생성 입력.

```typescript
interface SdPrintInput<T, X extends keyof any = ""> {
  type: Type<T>;
  inputs: WithOptional<Omit<DirectiveInputSignals<T>, "_optionalPrintInputs" | X>, ...>;
}
```

## `SelectModalOutputResult`

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
