# Providers

## `SdThemeProvider`

다크모드 토글 프로바이더. `dark` signal 변경 시 body에 `sd-theme-dark` 클래스를 토글한다.

```typescript
@Injectable({ providedIn: "root" })
class SdThemeProvider {
  dark = signal<boolean>(false);
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dark` | `WritableSignal<boolean>` | 다크모드 활성화 여부 |

## `SdSystemLogProvider`

시스템 로그 기록 프로바이더. console 출력 + 커스텀 `writeFn` 콜백 호출.

```typescript
@Injectable({ providedIn: "root" })
class SdSystemLogProvider {
  writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;
  async writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `writeFn` | `((severity, ...data) => Promise<void> \| void) \| undefined` | 커스텀 로그 기록 함수 |

| Method | Description |
|--------|-------------|
| `writeAsync(severity, ...data)` | console 출력 후 `writeFn` 호출 |

## `SdAppStructureProvider`

앱 구조(메뉴/권한) 관리 추상 프로바이더. 소비 프로젝트에서 상속하여 구현한다.

```typescript
@Injectable({ providedIn: "root" })
abstract class SdAppStructureProvider<TModule = unknown> {
  abstract items: AppStructureItem<TModule>[];
  abstract usableModules: Signal<TModule[] | undefined>;
  abstract permRecord: Signal<Record<string, boolean> | undefined>;

  usableMenus: Signal<SdMenu[]>;
  usableFlatMenus: Signal<SdFlatMenu<TModule>[]>;

  getPermissionsByStructure(items, codeChain?): SdPermission<TModule>[];
  getTitleByFullCode(fullCode: string): string;
  getItemChainByFullCode(fullCode: string): AppStructureItem<TModule>[];
  getPermsByFullCode<K extends string>(fullCodes: string[], permKeys: K[]): K[];
}
```

| Abstract Field | Type | Description |
|----------------|------|-------------|
| `items` | `AppStructureItem<TModule>[]` | 앱 구조 항목 배열 |
| `usableModules` | `Signal<TModule[] \| undefined>` | 사용 가능한 모듈 목록 |
| `permRecord` | `Signal<Record<string, boolean> \| undefined>` | 권한 레코드 |

| Computed | Type | Description |
|----------|------|-------------|
| `usableMenus` | `Signal<SdMenu[]>` | 사용 가능한 메뉴 트리 |
| `usableFlatMenus` | `Signal<SdFlatMenu<TModule>[]>` | 사용 가능한 플랫 메뉴 |

## `injectPermsSignal`

현재 뷰의 권한 목록을 signal로 반환하는 함수. 생성자에서 호출한다.

```typescript
function injectPermsSignal<K extends string>(viewCodes: string[], keys: K[]): Signal<K[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `viewCodes` | `string[]` | 뷰 코드 배열 |
| `keys` | `K[]` | 확인할 권한 키 배열 |

반환: 활성화된 권한 키 배열의 signal

## `SdAppStructureUtils`

앱 구조 유틸리티. 정적 메서드로 메뉴/권한 조회 로직을 제공한다.

```typescript
abstract class SdAppStructureUtils {
  static getTitleByFullCode<TModule>(items, fullCode): string;
  static getPermsByFullCode<TModule, K extends string>(items, fullCodes, permKeys, permRecord): K[];
  static getItemChainByFullCode<TModule>(items, fullCode): AppStructureItem<TModule>[];
  static getMenus<TModule>(items, codeChain, usableModules, permRecord): SdMenu[];
  static getFlatMenus<TModule>(items, usableModules, permRecord): SdFlatMenu<TModule>[];
  static getPermissions<TModule>(items, codeChain, usableModules): SdPermission<TModule>[];
  static getFlatPermissions<TModule>(items, usableModules): FlatPermission<TModule>[];
}
```

## `SdFileDialogProvider`

네이티브 파일 선택 대화상자 프로바이더.

```typescript
@Injectable({ providedIn: "root" })
class SdFileDialogProvider {
  async showAsync(multiple?: false, accept?: string): Promise<File | undefined>;
  async showAsync(multiple: true, accept?: string): Promise<File[] | undefined>;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `multiple` | `boolean` | 다중 선택 여부 |
| `accept` | `string` | 허용 파일 타입 (예: `"image/*"`) |

## `SdLocalStorageProvider`

`clientName` 스코프 localStorage 래퍼. 키가 `{clientName}.{key}` 형태로 저장된다.

```typescript
@Injectable({ providedIn: "root" })
class SdLocalStorageProvider<T> {
  set<K extends keyof T & string>(key: K, value: T[K]): void;
  get<K extends keyof T & string>(key: K): T[K] | undefined;
  remove(key: keyof T & string): void;
}
```

## `SdSystemConfigProvider`

비동기 설정 저장/조회 프로바이더. `fn` 필드를 설정하면 서버 저장, 미설정 시 localStorage에 저장.

```typescript
@Injectable({ providedIn: "root" })
class SdSystemConfigProvider<T> {
  fn?: {
    set<K extends keyof T & string>(key: K, data: T[K]): Promise<void> | void;
    get(key: keyof T & string): PromiseLike<any>;
  };

  async setAsync<K extends keyof T & string>(key: K, data: T[K]): Promise<void>;
  async getAsync(key: keyof T & string): Promise<any>;
}
```

## `SdServiceClientFactoryProvider`

ServiceClient 인스턴스 팩토리/관리. key별로 연결을 관리한다.

```typescript
@Injectable({ providedIn: "root" })
class SdServiceClientFactoryProvider {
  async connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void>;
  async closeAsync(key: string): Promise<void>;
  get(key: string): ServiceClient;
}
```

| Method | Description |
|--------|-------------|
| `connectAsync(key, options?)` | WebSocket 연결. 요청/응답 진행률을 토스트로 표시 |
| `closeAsync(key)` | 연결 종료 |
| `get(key)` | 연결된 ServiceClient 인스턴스 반환 |

## `SdSharedDataProvider`

이벤트 기반 공유 데이터 캐시 추상 프로바이더. `@Injectable()`로 제공되며, 소비 프로젝트에서 상속한다.

```typescript
@Injectable()
abstract class SdSharedDataProvider<T extends Record<string, SharedDataBase<string | number>>> {
  readonly loadingCount: WritableSignal<number>;

  abstract initialize(): void;
  register<K extends string & keyof T>(name: K, info: SharedDataInfo<T[K]>): void;
  getHandle<K extends string & keyof T>(name: K): SharedDataHandle<T[K]>;
  async emitAsync<K extends string & keyof T>(name: K, changeKeys?: (string | number)[]): Promise<void>;
  async wait(): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `register(name, info)` | 공유 데이터 등록 (getter, serviceKey, filter, orderBy) |
| `getHandle(name)` | 등록된 공유 데이터 핸들 반환 (items signal + get 메서드) |
| `emitAsync(name, changeKeys?)` | 변경 이벤트 발행 (부분/전체 리로드 트리거) |
| `wait()` | 모든 로딩 완료까지 대기 |

## `SdSharedDataChangeEvent`

공유 데이터 변경 이벤트 정의. `defineEvent`로 생성.

```typescript
const SdSharedDataChangeEvent: EventDefinition<
  { name: string; filter: unknown },
  (string | number)[] | undefined
>
```

## `SdNavigateWindowProvider`

새 윈도우 네비게이션 + 자동 닫기 프로바이더.

```typescript
@Injectable({ providedIn: "root" })
class SdNavigateWindowProvider {
  get isWindow(): boolean;
  open(navigate: string, params?: Record<string, string>, features?: string): void;
}
```

| Property/Method | Description |
|-----------------|-------------|
| `isWindow` | 현재 페이지가 팝업 윈도우인지 여부 |
| `open(navigate, params?, features?)` | 새 윈도우 열기. `features` 지정 시 팝업, 미지정 시 새 탭 |

## `SdActivatedModalProvider`

모달 내부에서 inject하여 모달/컨텐츠 컴포넌트 참조를 얻는 프로바이더. `@Injectable()`로 모달별 인스턴스 생성.

```typescript
@Injectable()
class SdActivatedModalProvider<T extends SdModalContentDef<any> = SdModalContentDef<any>> {
  modalComponent = signal<any>(undefined);
  contentComponent = signal<T | undefined>(undefined);
  canDeactiveFn: () => boolean;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `modalComponent` | `WritableSignal<any>` | SdModal 인스턴스 |
| `contentComponent` | `WritableSignal<T \| undefined>` | 컨텐츠 컴포넌트 인스턴스 |
| `canDeactiveFn` | `() => boolean` | 모달 닫기 가능 여부 판별 함수 (기본: `() => true`) |

## `SdToastProvider`

토스트 알림 프로바이더. 4가지 심각도(info/success/warning/danger) 메시지, 프로그래스 모드, 커스텀 토스트를 지원한다.

```typescript
@Injectable({ providedIn: "root" })
class SdToastProvider {
  alertThemes = signal<SdToastSeverity[]>([]);
  overlap = signal(false);
  beforeShowFn?: (theme: SdToastSeverity) => void;

  info(message: string, useProgress?: true): WritableSignal<number>;
  info(message: string, useProgress?: false): void;
  success(message: string, useProgress?: true): WritableSignal<number>;
  success(message: string, useProgress?: false): void;
  warning(message: string, useProgress?: true): WritableSignal<number>;
  warning(message: string, useProgress?: false): void;
  danger(message: string, useProgress?: true): WritableSignal<number>;
  danger(message: string, useProgress?: false): void;

  notify<T extends SdToastContentDef<any>>(input: SdToastInput<T>): Promise<...>;
  async try<R>(fn: () => Promise<R>, messageFn?: (err: unknown) => string): Promise<R | undefined>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `alertThemes` | `WritableSignal<SdToastSeverity[]>` | alert()로 표시할 테마 목록 |
| `overlap` | `WritableSignal<boolean>` | 오버랩 모드 (새 토스트 시 기존 제거) |
| `beforeShowFn` | `((theme) => void) \| undefined` | 토스트 표시 전 콜백 |

| Method | Description |
|--------|-------------|
| `info/success/warning/danger(message, useProgress?)` | 토스트 표시. `useProgress=true`면 progress signal 반환 |
| `notify(input)` | 커스텀 토스트 컴포넌트 표시 |
| `try(fn, messageFn?)` | 에러 catch 시 danger 토스트 표시 후 undefined 반환 |

## `SdBusyProvider`

글로벌 busy 상태 관리 프로바이더.

```typescript
@Injectable({ providedIn: "root" })
class SdBusyProvider {
  type = signal<SdBusyType>("bar");
  globalBusyCount = signal(0);
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `WritableSignal<SdBusyType>` | busy 표시 유형 (`"spinner" \| "bar" \| "cube"`) |
| `globalBusyCount` | `WritableSignal<number>` | 글로벌 busy 카운트 (0보다 크면 busy 표시) |

## `SdPrintProvider`

인쇄 및 PDF 생성 프로바이더. jsPDF + html-to-image 사용.

```typescript
@Injectable({ providedIn: "root" })
class SdPrintProvider {
  async printAsync<T extends SdPrint>(
    template: SdPrintInput<T>,
    options?: { size?: string; margin?: string },
  ): Promise<void>;

  async getPdfBufferAsync<T extends SdPrint>(
    template: SdPrintInput<T>,
    options?: { orientation?: "portrait" | "landscape"; pageSize?: string },
  ): Promise<Uint8Array>;
}
```

| Method | Description |
|--------|-------------|
| `printAsync(template, options?)` | 브라우저 인쇄 대화상자 열기. `size` 기본값 `"A4 auto"`, `margin` 기본값 `"0"` |
| `getPdfBufferAsync(template, options?)` | PDF 바이너리 생성. `.page` 클래스 요소 단위로 페이지 분할 |

## `SdModalProvider`

프로그래밍 방식으로 모달을 생성하는 프로바이더.

```typescript
@Injectable({ providedIn: "root" })
class SdModalProvider {
  modalCount = signal(0);

  async showAsync<T extends SdModalContentDef<any>>(
    modal: SdModalInfo<T>,
    options?: SdModalOptions,
  ): Promise<Parameters<T["close"]["emit"]>[0] | undefined>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `modalCount` | `WritableSignal<number>` | 현재 열린 모달 수 |

| Method | Description |
|--------|-------------|
| `showAsync(modal, options?)` | 모달 생성 후 close 결과를 Promise로 반환 |
