# @simplysm/angular — 호스트 디렉티브·signal 헬퍼·선택 매니저

DOM 관찰(리사이즈/교차)·캡처 이벤트·커맨드 단축키·ripple·노출 애니메이션·invalid 표시·타입드 템플릿을 호스트 엘리먼트에 붙이는 디렉티브와, 선택/정렬/펼침 상태를 시그널로 관리하는 매니저 함수 군. `setup*` 헬퍼는 컴포넌트 `constructor` 에서 호출(`inject(ElementRef)` 의존), `Sd*` 디렉티브는 그 헬퍼를 attribute 로 래핑.

## DOM 관찰 디렉티브

### SdResizeDirective — `[sdResize]`
ResizeObserver 로 크기 변경 감지(rAF 디바운스).
- `sdResize: output<SdResizeEvent>` — `{ heightChanged: boolean; widthChanged: boolean; target: HTMLElement; contentRect: DOMRectReadOnly }`. 폭/높이 변경 여부와 새 크기.

### SdIntersectionDirective — `[sdIntersection]`
IntersectionObserver 로 화면 교차 감지.
- `sdIntersection: output<SdIntersectionEvent>` — `{ entry: IntersectionObserverEntry }`. 마지막 entry 전달. 무한 스크롤·등장 트리거에.

## 캡처 이벤트·명령 단축키

### SdEvents
표준 이벤트를 capture/passive/once 옵션으로 받는 디렉티브. 셀렉터에 등록된 속성(`(click.capture)`, `(scroll.passive)`, `(wheel.capture.passive)`, `(touchstart.passive)`, `(transitionend.once)` 등) 으로 바인딩. 각 output 은 원본 DOM 이벤트(`MouseEvent`/`KeyboardEvent`/`WheelEvent`/`TouchEvent` 등)를 emit. `.capture`=캡처 단계, `.passive`=passive 리스너, `.once`=1회.

### SdOptionEventPlugin
위 `.capture`/`.passive`/`.once` 접미사 이벤트를 Angular 가 인식하게 하는 `EventManagerPlugin`. `provideSdAngular` 가 등록하므로 직접 쓸 일은 없음.

### SdCommandDirective — `[sdRefreshCommand],[sdSaveCommand],[sdInsertCommand]`
전역 키보드 단축키를 명령으로 변환(최상위 열린 모달 기준으로만 처리).
- `sdRefreshCommand: output<KeyboardEvent>` — `Ctrl+Alt+L` (조회).
- `sdSaveCommand: output<KeyboardEvent>` — `Ctrl+S` (저장).
- `sdInsertCommand: output<KeyboardEvent>` — `Ctrl+Insert` (등록).

## 시각 효과·유효성 디렉티브 + setup 헬퍼

### setupRipple / SdRipple
클릭 위치에서 퍼지는 ripple 효과.
- `setupRipple(enableFn?: () => boolean): void` — 호스트에 ripple 부착. `enableFn` 이 false 반환 시 비활성.
- `SdRipple`(`[sdRipple]`): `sdRipple: input.required<boolean>` — ripple 활성 여부.

### setupRevealOnShow / SdShowEffect
교차 시 페이드+슬라이드 등장.
- `setupRevealOnShow(optFn?: () => { type?: "l2r"|"t2b"; enabled?: boolean }): void` — `type` 이 등장 방향(`"t2b"` 위→아래 기본, `"l2r"` 좌→우), `enabled` false 면 애니메이션 없이 즉시 표시.
- `SdShowEffect`(`[sdShowEffect]`): `sdShowEffect: input.required<boolean>`(활성), `sdShowEffectType: "l2r"|"t2b"`.

### setupInvalid / SdInvalid
커스텀 유효성 메시지를 네이티브 폼 검증으로 표시(빨간 인디케이터 + form submit 차단).
- `setupInvalid(getInvalidMessage: () => string): void` — 빈 문자열이면 유효, 아니면 그 메시지로 invalid. 숨겨진 input 의 `setCustomValidity` 로 처리.
- `SdInvalid`(`[sdInvalid]`): `sdInvalid: input.required<string>` — 오류 메시지(빈 값=유효).

## 타입드 템플릿 디렉티브

### SdTypedTemplate — `ng-template[typed]`
`ng-template` 컨텍스트에 타입을 부여.
- `typed: input.required<T>` — 컨텍스트 타입 토큰. `ngTemplateContextGuard` 로 `let-` 변수 타입 추론.

### SdItemOfTemplate<TItem> — `ng-template[itemOf]`
배열 항목 순회 템플릿에 타입 부여(셀렉트·공유데이터 선택·달력의 항목 렌더).
- `itemOf: input.required<TItem[]>` — 항목 배열. 컨텍스트 `SdItemOfTemplateContext`: `$implicit`/`item: TItem`, `index: number`, `depth: number`.

```html
<ng-template [itemOf]="items()" let-item="item">{{ item.name }}</ng-template>
```

## 선택·정렬·펼침 매니저 (signal 기반)

목록/시트가 선택·정렬·트리펼침 상태를 시그널로 관리하도록 돕는 순수 함수. 외부 시그널을 받아 파생 시그널·조작 함수를 반환.

### useSelectionManager<TItem, TKey>
- 입력: `displayItems`/`selectedKeys`(model)/`selectMode`/`getItemSelectableFn`/`trackByFn`(모두 Signal).
- 반환: `hasSelectable`/`isAllSelected`(Signal), `getSelectable(item)`(true/사유문자열/undefined), `getCanChangeFn(item)`, `select`/`deselect`/`toggle`/`toggleAll`/`isSelected`. `selectMode` 가 `"single"` 이면 단일, `"multi"` 면 누적 선택. 키 비교는 `obj.equal` 으로 결측·객체 키도 안전.

### useSortingManager
- 입력: `sorts: WritableSignal<SortingDef[]>`.
- 반환: `defMap`(키→`{ indexText?, desc }`, 다중 정렬 시 순번 표시), `toggle(key, multiple)`(미정렬→오름차순→내림차순→해제 순환, `multiple` 이면 누적), `sort<T>(items)`(현재 정렬로 배열 정렬, null 은 앞쪽).
- `SortingDef` — `{ key: string; desc: boolean }`.

### useExpandingManager<T>
- 입력: `items`/`expandedItems`(model)/`getChildrenFn`/`sort`.
- 반환: `displayItems`(펼침 반영 평면 목록)/`hasExpandable`/`isAllExpanded`(Signal), `toggle`/`toggleAll`/`isVisible(item)`(조상이 모두 펼쳐졌는지)/`def(item)`(`ExpandItemDef`).
- `ExpandItemDef<T>` — `{ item; parentDef; hasChildren; depth }`.
