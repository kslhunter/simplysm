# @simplysm/angular

Angular 21 zoneless 프론트엔드 UI 라이브러리. 부트스트랩 프로바이더, signal 기반 standalone 컴포넌트/디렉티브, 모달·토스트·busy 등 오버레이, 시트·CRUD 골격, 공유데이터·레이아웃·시각화 컴포넌트를 제공. `import "@simplysm/core-browser"` 를 side-effect 로 로드하며, 컴포넌트는 standalone + OnPush + `ViewEncapsulation.None`, selector 는 `sd-` prefix. 앱 화면을 작성·수정할 때 거의 항상 이 패키지를 import.

## 사용 트리거 인덱스

- **provideSdAngular / SdAngularConfigProvider** — 앱 부트스트랩 시 1회 등록(테마·에러핸들러·zoneless·SW 업데이트·라우팅 busy 연동). 아래 "부트스트랩" 인라인 섹션.
- **SdThemeProvider / setupBgTheme** — 다크모드·폰트크기 전역 테마 제어, 배경 테마 지정. 아래 "테마·배경" 인라인 섹션. 셀렉터 UI 는 `자세히: [features.md](./features.md)`.
- **SdSystemLogProvider / SdLocalStorageProvider / SdSystemConfigProvider / injectSdSystemConfigResource** — 시스템 로그 적재 훅, 클라이언트별 localStorage, key 기반 영속 설정(시트/프리셋/모달 위치 저장). 아래 "설정·로그·인프라" 인라인 섹션.
- **SdServiceClientFactoryProvider / SdFileDialogProvider** — 서버 서비스 클라이언트 연결, 파일 선택 대화상자. 아래 "설정·로그·인프라" 인라인 섹션.
- **모달·토스트·busy·인쇄(Provider + 컴포넌트 + Def 타입)** — 프로그래밍 방식 오버레이를 띄울 때. `자세히: [overlay.md](./overlay.md)`.
- **버튼·폼 입력·선택·체크박스·드롭다운·탭·리스트·페이징·gap 컨트롤** — 화면 폼/조작 UI 작성. `자세히: [controls.md](./controls.md)`.
- **SdSheet 및 시트 컬럼/설정** — 데이터 그리드(정렬·페이징·트리·고정·선택·인라인편집·설정저장). `자세히: [sheet.md](./sheet.md)`.
- **SdBaseContainer / SdCrudList / SdCrudDetail** — 목록·단건 화면 표준 골격. `자세히: [crud.md](./crud.md)`.
- **SdSharedDataProvider / sd-shared-data-select\*** — 공유 마스터 데이터 정의·선택 컨트롤. `자세히: [shared-data.md](./shared-data.md)`.
- **sidebar·topbar 레이아웃 + 메뉴/사용자** — 앱 셸 레이아웃. `자세히: [layout.md](./layout.md)`.
- **라우팅 헬퍼 + SdAppStructureProvider/Utils** — 페이지 코드/제목/뷰타입/권한 시그널, 메뉴·권한 트리 구성. `자세히: [routing-appstructure.md](./routing-appstructure.md)`.
- **core 디렉티브·signal 헬퍼** — resize/intersection/ripple/show-effect/invalid/명령단축키/template/모델훅 등. `자세히: [directives.md](./directives.md)`.
- **useSelectionManager / useSortingManager / useExpandingManager** — 시트류 컴포넌트의 선택·정렬·확장 로직 합성 헬퍼(컴포넌트 작성용). 아래 "선택·정렬·확장 매니저" 인라인 섹션.
- **SdPermissionTable / SdStatePreset** — 권한 트리 편집표, 화면 상태 프리셋 저장 컨트롤. `자세히: [features.md](./features.md)`.
- **테마 셀렉터·주소검색·tiptap 에디터·label·note·progress·calendar·barcode·echarts** — 부가 기능 컴포넌트. `자세히: [features.md](./features.md)`.
- **kanban 보드** — 드래그 가능 칸반. `자세히: [kanban.md](./kanban.md)`.

## 부트스트랩

### provideSdAngular

```ts
provideSdAngular(opt: { clientName: string }): EnvironmentProviders
```

- `opt.clientName` — 클라이언트 식별자. `SdAngularConfigProvider.clientName` 으로 보관되며 localStorage 키 접두사·서비스 클라이언트 이름으로 쓰임. 앱마다 고유 문자열.

`makeEnvironmentProviders` 로 다음을 한 번에 등록: `IMAGE_CONFIG`(이미지 경고 비활성), ng-icons 기본 설정(strokeWidth 1.5, size 1.33em), 테마 dark/fontSize 의 localStorage 복원·저장 effect, 전역 `unhandledrejection`/`error` 리스너→`ErrorHandler`, `SdAngularConfigProvider`(clientName 주입), `SdOptionEventPlugin`(이벤트 수식어 지원), `ErrorHandler=SdGlobalErrorHandlerPlugin`, `provideZonelessChangeDetection()`, `SwUpdate` 주기 점검(5분 시작 → 실패 시 지수 백오프 최대 60분, 업데이트 발견 시 confirm 후 reload), 라우팅 네비게이션을 `SdBusyProvider.globalBusyCount` 와 연동. 앱 `ApplicationConfig.providers` 에 1회 추가.

```ts
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideSdAngular({ clientName: "my-app" })],
};
```

### SdAngularConfigProvider

```ts
@Injectable({ providedIn: "root" }) class SdAngularConfigProvider { clientName: string }
```

- `clientName` — `provideSdAngular` 가 채우는 클라이언트 이름. 직접 set 하지 말고 `provideSdAngular` 로 주입. localStorage/서비스 클라이언트가 참조.

## 테마·배경

### SdThemeProvider

```ts
@Injectable({ providedIn: "root" }) class SdThemeProvider {
  dark: WritableSignal<boolean>;
  fontSizePresets: readonly number[]; // [12,14,16,20,24,28]
  fontSize: WritableSignal<number>;   // 기본 12
  increaseFontSize(): void;
  decreaseFontSize(): void;
}
```

- `dark` — true 면 `<body>` 에 `sd-theme-dark` 클래스 토글. `provideSdAngular` 가 localStorage 와 동기화.
- `fontSize` — html 루트 `font-size(px)` 에 반영(rem 스케일 전체 변동). presets 안에서만 단계 이동 권장.
- `increaseFontSize`/`decreaseFontSize` — presets 기준 다음/이전 단계로 이동. 경계면 무동작.

```ts
inject(SdThemeProvider).dark.set(true);
```

### setupBgTheme

```ts
setupBgTheme(options?: {
  theme?: "primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray";
  lightness?: "lightest" | "lighter";
}): void
```

- `theme` — 본문 배경에 적용할 테마색. 미지정 시 `--background-color` 해제(기본 배경). 화면 톤을 구분할 때 지정.
- `lightness` — 배경 명도. `"lightest"`(기본) 가 더 옅음, `"lighter"` 가 약간 진함.

컴포넌트 생성자(주입 컨텍스트)에서 호출. effect 로 `document.body` 의 `--background-color` 를 설정/cleanup.

## 설정·로그·인프라

### SdSystemLogProvider

```ts
@Injectable({ providedIn: "root" }) class SdSystemLogProvider {
  writeFn?: (severity: "error" | "warn" | "log", ...data: any[]) => Promise<void> | void;
  writeAsync(severity: "error" | "warn" | "log", ...data: any[]): Promise<void>;
}
```

- `writeFn` — 외부 적재 훅. 지정하면 `writeAsync` 가 콘솔 로깅 후 이 함수도 호출(예: 서버 DB 적재). 미지정 시 콘솔만.
- `writeAsync(severity, ...data)` — 콘솔(`logger[severity]`) 출력 후 `writeFn` 호출. `writeFn` 이 throw 해도 로깅으로 흡수. 전역 에러 핸들러가 내부적으로 사용.

### SdLocalStorageProvider

```ts
@Injectable({ providedIn: "root" }) class SdLocalStorageProvider<T> {
  set<K extends keyof T & string>(key: K, value: T[K]): void;
  get<K extends keyof T & string>(key: K): T[K] | undefined;
  remove(key: keyof T & string): void;
}
```

- 키는 `<clientName>.<key>` 로 prefix 되어 JSON 직렬화 저장. `get` 은 파싱 실패 시 undefined(결측 보존).
- 제네릭 `T` 로 키별 값 타입을 지정해 타입 안전하게 사용.

### SdSystemConfigProvider

```ts
@Injectable({ providedIn: "root" }) class SdSystemConfigProvider<T> {
  fn?: { set(key, data): Promise<void> | void; get(key): PromiseLike<unknown> };
  setAsync<K extends keyof T & string>(key: K, data: T[K] | undefined): Promise<void>;
  getAsync(key: keyof T & string): Promise<unknown>;
}
```

- `fn` — 외부(서버) 저장 백엔드. 지정하면 set/get 을 서버로 위임, 미지정 시 `SdLocalStorageProvider` 사용. set 데이터가 null 이면 localStorage 경로에서 remove.
- 시트/상태프리셋/모달 위치 등 영속 UI 설정 저장의 백엔드. 보통 `injectSdSystemConfigResource` 를 통해 사용.

### injectSdSystemConfigResource

```ts
injectSdSystemConfigResource<T>(options: { key: Signal<string | undefined> }): {
  value: Signal<T | undefined>; isLoading: Signal<boolean>; status; hasValue(): boolean;
  reload(): void; set(value: T | undefined): void; update(fn: (prev: T | undefined) => T | undefined): void;
}
```

- `options.key` — 설정 키 시그널. key 가 null 이면 로드/저장 안 함. 저장 키는 `<호스트엘리먼트태그>.<key>` 로 구성(컴포넌트 종류별 분리).
- `value`/`isLoading`/`status` — Angular `resource` 위임. `set`/`update` 는 즉시 value 갱신 후 microtask 로 `SdSystemConfigProvider.setAsync` 영속화(에러는 `ErrorHandler`).
- 주입 컨텍스트에서 호출(`ElementRef`/`SdSystemConfigProvider`/`ErrorHandler` inject). 시트·상태프리셋이 내부 사용.

### SdServiceClientFactoryProvider

```ts
@Injectable({ providedIn: "root" }) class SdServiceClientFactoryProvider {
  connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void>;
  closeAsync(key: string): Promise<void>;
  get(key: string): ServiceClient;
}
```

- `connectAsync(key, options)` — `key` 별 `ServiceClient` 생성·연결. options 미지정 시 현재 location(host/port/ssl)으로 접속. 이미 연결·이미 종료된 key 면 throw. 요청/응답 진행률을 progress 토스트로 표시.
- `closeAsync(key)` — 연결 종료 후 해당 key 를 종료 상태로 표시(이후 재연결 불가). 미연결 key 면 throw.
- `get(key)` — 연결된 클라이언트 반환. 미연결·종료 key 면 throw(silent 반환 안 함). 앱 서비스/이벤트 호출의 기반(공유데이터·서버 함수 provider 가 내부 사용).

### SdFileDialogProvider

```ts
@Injectable({ providedIn: "root" }) class SdFileDialogProvider {
  showAsync(multiple?: false, accept?: string): Promise<File | undefined>;
  showAsync(multiple: true, accept?: string): Promise<File[] | undefined>;
}
```

- `multiple` — true 면 다중 선택(`File[]`), 미지정/false 면 단건(`File`). 타입이 오버로드로 분기.
- `accept` — 파일 형식 필터(예: `".xlsx"`, `"image/*"`). 취소·미선택 시 undefined.

```ts
const file = await inject(SdFileDialogProvider).showAsync(false, ".xlsx");
```

## 선택·정렬·확장 매니저

컴포넌트 작성 시 시트류 동작을 합성하는 헬퍼. 주입 컨텍스트가 아닌 일반 함수로, signal 바인딩을 받아 파생 시그널·조작 함수를 반환. `SdSheet` 내부도 이를 사용.

### useSelectionManager

```ts
useSelectionManager<TItem, TKey>(options: {
  displayItems: Signal<TItem[]>; selectedKeys: WritableSignal<TKey[]>;
  selectMode: Signal<"single" | "multi" | undefined>;
  getItemSelectableFn: Signal<((item: TItem) => boolean | string) | undefined>;
  trackByFn: Signal<(item: TItem, index: number) => TKey>;
}): { hasSelectable; isAllSelected; getSelectable(item); getCanChangeFn(item); select(item); deselect(item); toggle(item); toggleAll(); isSelected(item); }
```

- `selectMode` — `"single"`=단일(선택 시 기존 교체), `"multi"`=다중, undefined=선택 비활성.
- `getItemSelectableFn` — 행별 선택 가능 여부. `true`=가능, `false`/undefined=불가, `string`=불가+사유(툴팁). `getSelectable` 이 이를 그대로 반환.
- 키 비교는 참조 동일 또는 `obj.equal` 로 깊은 비교. `toggleAll` 은 선택 가능 항목 기준 전체 토글.

### useSortingManager

```ts
useSortingManager(options: { sorts: WritableSignal<SortingDef[]> }): {
  defMap: Signal<Map<string, { indexText?: string; desc: boolean }>>;
  toggle(key: string, multiple: boolean): void;
  sort<T>(items: T[]): T[];
}
// SortingDef = { key: string; desc: boolean }
```

- `toggle(key, multiple)` — 클릭 정렬 토글. `multiple`=true 면 다중 정렬 누적(asc→desc→제거 순환), false 면 단일 정렬로 교체. 헤더 클릭의 shift 여부를 넘김.
- `defMap` — 정렬 중인 컬럼의 방향·표시순번(`indexText`, 2개 이상일 때만). `sort` 는 null-우선 정렬로 클라이언트 정렬 수행.

### useExpandingManager

```ts
useExpandingManager<T>(binding: {
  items: Signal<T[]>; expandedItems: WritableSignal<T[]>;
  getChildrenFn: Signal<((item: T, index: number) => T[] | undefined) | undefined>;
  sort: (items: T[]) => T[];
}): { displayItems; hasExpandable; isAllExpanded; toggle(item); toggleAll(); isVisible(item); def(item); }
// ExpandItemDef<T> = { item: T; parentDef: ExpandItemDef<T> | undefined; hasChildren: boolean; depth: number }
```

- `getChildrenFn` — 자식 배열 반환 함수(트리). undefined 면 평면.
- `displayItems` — 펼침 상태를 반영해 평탄화된 표시 목록(접힌 노드 하위 제외 여부는 `isVisible` 로 판단). `def(item)` 은 항목의 depth/부모/자식유무 메타 반환(없으면 throw).
