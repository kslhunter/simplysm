# @simplysm/sd-angular — reactive (signal 헬퍼, 매니저, setup, injection)

sd-* 컴포넌트/디렉티브를 작성할 때 쓰는 signal 바인딩 헬퍼, 컬렉션 래퍼, 선택/정렬/펼침 매니저, 호스트 셋업 함수, transform/injection, 라우트 signal 모음.
컴포넌트 클래스 필드 초기화 또는 생성자(injection context)에서 호출.

## signal 바인딩

### `$signal`
- **`$signal<T>(): SdWritableSignal<T | undefined>`** / **`$signal<T>(initialValue: T): SdWritableSignal<T>`**
  - WritableSignal 생성 + `$mark()` 메서드 부착.
  - `$mark()` 는 값 참조를 바꾸지 않고 강제로 변경 알림(내부 epoch 증가) — 객체/배열을 mutate 한 뒤 구독자 갱신용.

### `toSignal`
- **`toSignal<T>(sig: WritableSignal<T>): SdWritableSignal<T>`**
  - 기존 WritableSignal 에 `$mark()` 부착(Angular `toSignal` 과 다른 동명 함수, rxjs 아님).

### `$computed`
- **`$computed<R>(fn: () => R): Signal<R>`** — 동기 computed(Angular `computed` 래퍼).
- **`$computed<R>(signals: Signal[], fn: () => R): Signal<R>`** — 의존 signal 배열을 명시하고 그 변화 때만 재계산.
- **`$computed<R>(signals: Signal[], fn: () => Promise<R>, opt?: { initialValue?: R }): Signal<R | undefined>`** — async 계산.
  - signals 변화 시 `untracked` 내부에서 await 후 결과 set.
  - initialValue 로 초기값 지정.

### `$effect`
- **`$effect(fn: (onCleanup) => void, options?: CreateEffectOptions): EffectRef`** — Angular `effect` 래퍼.
- **`$effect(conditions: (() => unknown)[], fn: (onCleanup) => void | Promise<void>, options?): EffectRef`**
  - conditions 만 추적, 본문은 `untracked` 로 실행(본문 내부 signal 읽기는 재실행 트리거 안 함).
  - `[]` 전달 시 최초 1회만.

### `$afterRenderComputed`
- **`$afterRenderComputed<R>(fn, opt?: { initialValue?: R }): Signal<R | undefined>`**
  - afterRenderEffect 시점(렌더 후)에 fn 결과를 담는 signal. DOM 측정값 계산용.
  - initialValue 지정 시 non-undefined.

### `$afterRenderEffect`
- **`$afterRenderEffect(fn | (signals, fn)): EffectRef`**
  - 렌더 후 실행 effect. signals 배열 버전은 그 signal 만 추적하고 본문은 untracked.
  - async fn 단독 시그니처는 `never`(미지원).

### `$resource`
- **`$resource<T, R>(options: ResourceOptions<T,R> & { saver?: (param: T|undefined) => void|PromiseLike; defaultValue?: NoInfer<T> }): ResourceRef<T | undefined>`**
  - Angular `resource` 래퍼.
  - `saver` 지정 시 status 가 `"local"`(로컬 편집)일 때 value 를 microtask 로 saver 에 전달(낙관적 저장).
  - defaultValue 지정 시 `ResourceRef<T>`.

## 변경추적 컬렉션 래퍼

WritableSignal 을 받아 불변 업데이트 헬퍼 객체 반환.

### `$arr<T>(sig: Signal<T[]> | WritableSignal<T[]>)`
- **insert(i, item)/remove(itemOrFn)/toggle(value)** — 배열 불변 변경(readonly signal 이면 throw).
- **snapshot(keyPropNameOrFn)** — 현재 배열을 키 기준 Map 으로 원본 스냅샷 저장.
- **changed(item): boolean** — 스냅샷 대비 해당 item 변경 여부(키 없으면 신규=true).
- **diffs(options?: { includeSame?; excludes?: string[]; includes?: string[] }): TArrayDiffs2Result<T>[]** — 스냅샷 대비 추가/수정/삭제 diff. 저장용.
- **get origin: Map<any,T>** — 스냅샷 Map.

### `$obj<T extends object | undefined>(sig)`
- **snapshot()** — 객체 clone 스냅샷.
- **changed(): boolean** — 스냅샷 대비 변경 여부.
- **get origin: T | undefined**.
- **updateField(key, val)** — 동일 값이면 무시, 아니면 불변 set.
- **deleteField(key)** — 키 제거(readonly 면 throw).

### `$set<T>(sig: WritableSignal<Set<T>>)`
- **add/adds(...)/delete/deletes(...)** — Set 불변 변경.
- **toggle(value, addOrDel?: "add" | "del")** — addOrDel 없으면 존재 여부로 토글.

### `$map<K,T>(sig: WritableSignal<Map<K,T>>)`
- **set(key, value)** / **update(key, (val|undefined) => T)** — Map 불변 변경.

### `$mark(sig: WritableSignal, clone?: boolean)`
- **clone=false(기본)** — 값 참조 유지하고 강제 변경 알림(mutate 후 호출).
- **clone=true** — onlyOneDepth clone 으로 set.
- producerUpdatesAllowed 아니면 throw.

## 매니저 (컬렉션 상태 관리 클래스)

### `SdSelectionManager<T>` — `new (opt: { displayItems; selectedItems; selectMode: Signal<"single"|"multi"|"none"|undefined>; getItemSelectableFn })`
- **hasSelectable/isAllSelected** (computed), **getSelectable(item): true | string | undefined**(string=불가사유), **select/deselect/toggle/toggleAll**, **getIsSelected**.
- single 모드는 단일 선택 유지.

### `SdExpandingManager<T>` — `new (opt: { items; expandedItems; getChildrenFn; sort })`
트리 펼침 관리.
- **flattedItems**(가시 평면화 computed), **hasExpandable/isAllExpanded**, **toggle/toggleAll**.
- **getIsVisible(item)**(조상 모두 펼쳐졌는지), **getDef(item): ISdExpandItemDef<T>**(`{ item; parentDef; hasChildren; depth }`).

### `SdSortingManager` — `new (opt: { sorts: WritableSignal<ISdSortingDef[]> })`
- **defMap**(키→`{ indexText; desc }` computed, 다중정렬 시 순번 표시).
- **toggle(key, multiple)**(asc→desc→해제 순환, multiple=false 면 단일 정렬).
- **sort<T>(items): T[]**(현재 정렬 적용).
- `ISdSortingDef = { key: string; desc: boolean }`.

## 호스트 setup 함수 (생성자에서 호출)

- **setupRipple(enableFn?: () => boolean)** — 호스트에 pointer 물결효과. enableFn 으로 토글.
- **setupRevealOnShow(optFn?: () => { type?: "l2r" | "t2b"; enabled? })** — 뷰포트 진입 시 등장 애니메이션(기본 t2b).
- **setupInvalid(getInvalidMessage: () => string)** — 메시지 비어있지 않으면 무효 표시점 + 숨김 input 으로 form 검증 실패. focus 시 실제 포커스 가능 요소로 이동.
- **setupCanDeactivate(fn: () => boolean)** — 모달이면 `canDeactivefn`, 라우트면 route 의 `canDeactivate` 가드로 fn 등록(현재 컴포넌트 selector 일치 시).
- **setupBgTheme(options?: { theme?: "primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"; lightness?: "lightest"|"lighter" })**
  - body `--background-color` 를 테마 색으로(기본 lightest). cleanup 시 해제.
- **setupModelHook<T>(model: WritableSignal<T>, canFn: Signal<(item: T) => boolean | Promise<boolean>>)** — model.set 을 가로채 canFn 결과(false 거부 / true 즉시 / Promise resolve 후) 따라 적용.
- **setupCumulateSelectedKeys<T,K>(opt: { items; selectedItems; selectedItemKeys; selectMode; keySelectorFn })** — 표시항목과 선택키를 양방향 동기화(키 기준 누적 선택 유지, single 은 마지막 1개).
- **setupCloserWhenSingleSelectionChange<TKey,TItem>(bindings: { selectedItemKeys; selectedItems; selectMode; close: OutputEmitterRef<ISelectModalOutputResult<TItem>> })**
  - single 모드에서 첫 선택키가 바뀌면 close emit(선택 모달 자동 닫기).

## transform / injection

- **transformBoolean(value: boolean | "" | undefined): boolean** — `input(false,{transform:transformBoolean})` 용. null 이거나 false 면 false, 그 외(빈 attribute `""` 포함)는 true.
- **transformNullableBoolean(value): boolean | undefined** — null 이면 undefined 유지, false 면 false, 그 외 true.
- **injectElementRef<T = HTMLElement>(): ElementRef<T>** — 호스트 ElementRef 주입 단축.
- **injectParent<T>(type?, options?: { optional: true }): T | (T|undefined)** — DI 트리 상위 LView 를 따라 부모 컴포넌트 인스턴스 탐색.
  - type 미지정이면 직속 부모.
  - 못 찾고 optional 아니면 throw.
- **setSafeStyle(renderer: Renderer2, el: HTMLElement, style: Partial<CSSStyleDeclaration>)** — 객체의 각 키를 `renderer.setStyle` 로 적용.
- **TDirectiveInputSignals<T>** — 타입 유틸.
  - 컴포넌트 T 의 `InputSignal` 필드만 골라 그 값 타입의(undefined→optional) 객체 타입.
  - 모달/토스트/프린트 `inputs` 페이로드 타입에 사용.

## 라우트/뷰 signal (생성자에서 호출)

- **useParamMapSignal()** / **useQueryParamMapSignal()** — ActivatedRoute paramMap/queryParamMap 을 Signal 로(없으면 undefined).
- **useFullPageCodeSignal()** — 현재 URL 의 세그먼트를 `.` 으로 이은 전체 페이지 코드 Signal(라우터 NavigationEnd 추적).
- **useCurrentPageCodeSignal()** — ActivatedRoute pathFromRoot 기반 현재 페이지 코드 Signal(없으면 undefined).
- **useViewTitleSignal(): Signal<string>** — 활성 모달 제목 또는 SdAppStructure 의 fullCode 제목.
- **useViewTypeSignal(getComp: () => any): Signal<TSdViewType>** — `"page" | "modal" | "control"` 판정(라우트 컴포넌트=page, 활성 모달 내용=modal, 그 외 control).
- **useSdSystemConfigResource<T>(options: { key: Signal<string | undefined> }): ResourceRef**
  - 호스트 태그명+key 로 SdSystemConfigProvider 값 로드/저장하는 $resource(시트 설정 등 화면별 사용자 설정 영속화).
