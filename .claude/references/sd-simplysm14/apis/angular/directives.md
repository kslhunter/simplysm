# @simplysm/angular — 호스트 디렉티브·동작 셋업·템플릿

엘리먼트/컴포넌트에 동작을 부착하는 디렉티브와, 컴포넌트 constructor 에서 호출하는 `setup*` 훅, 타입드 ng-template 묶음. 컴포넌트 동작을 직접 조립할 때 함께 읽힘.

## 이벤트 디렉티브

옵션 이벤트(`.capture`/`.passive`/`.once`)는 `provideSdAngular` 가 등록한 `SdOptionEventPlugin` 으로 동작. 직접 inject 안 함.

- **SdEvents** — 표준 이벤트의 옵션 변형을 output 으로 노출하는 디렉티브. `(click.capture)`, `(scroll.passive)`, `(touchstart.passive)`, `(wheel.capture.passive)`, `(transitionend.once)` 등(셀렉터에 열거된 조합만). 버블링 안 되는 focus/blur 를 capture 로 받거나 성능상 passive 스크롤이 필요할 때 사용.
- **SdResizeDirective** — `(sdResize)` 출력. ResizeObserver 기반, requestAnimationFrame 디바운스. 이벤트 `SdResizeEvent = { heightChanged; widthChanged; target: HTMLElement; contentRect: DOMRectReadOnly }`. 크기 변화에 반응할 때.
- **SdIntersectionDirective** — `(sdIntersection)` 출력. IntersectionObserver 기반. 이벤트 `SdIntersectionEvent = { entry: IntersectionObserverEntry }`. 화면 진입 감지(지연 로드 등)에.
- **SdCommandDirective** — `(sdRefreshCommand)`(Ctrl+Alt+L), `(sdSaveCommand)`(Ctrl+S), `(sdInsertCommand)`(Insert) 출력(`KeyboardEvent`). 최상위로 열린 모달 안에서만 동작(가려진 화면 단축키 차단). 새로고침/저장/추가 단축키 바인딩에.

## 표시 효과 디렉티브 + 셋업 훅

- **SdRipple** / **setupRipple** — `[sdRipple]="enabled"` 디렉티브 또는 `setupRipple(enableFn?: () => boolean)` 훅. 포인터 다운 위치에서 퍼지는 물결 효과. enabled/enableFn false 면 비활성. 버튼류에 부착.
- **SdShowEffect** / **setupRevealOnShow** — `[sdShowEffect]="enabled"` + `sdShowEffectType`("l2r"|"t2b", 기본 t2b) 디렉티브, 또는 `setupRevealOnShow(optFn?: () => { type?; enabled? })` 훅. 화면 진입 시 페이드+슬라이드로 나타남. type 은 슬라이드 방향(t2b=위→아래, l2r=왼→오). 진입 애니메이션에.
- **SdInvalid** / **setupInvalid** — `[sdInvalid]="message"` 디렉티브, 또는 `setupInvalid(getInvalidMessage: () => string)` 훅. 메시지가 빈 문자열이 아니면 호스트 좌상단에 빨간 점 표시 + 숨김 input 의 `setCustomValidity` 로 폼 검증 연동(폼 submit 시 메시지 노출). 커스텀 컨트롤의 유효성 표시에. (sd-textfield 등 내장 컨트롤이 이미 사용)

## 기타 셋업 훅·유틸

- **setupModelHook<T>(model, canFn: Signal<(item) => boolean | Promise<boolean>>)** — model 의 set/update 를 가로채 canFn 결과가 false 면 변경 차단(Promise 면 비동기 허용). 체크박스/스위치/리스트 선택의 변경 가드(`canChangeFn`)에 사용.
- **setupBgTheme(options?: { theme?; lightness? })** — body 배경색 CSS 변수를 테마색으로 설정(컴포넌트 파괴 시 복원). theme = `"primary"|...|"gray"|"blue-gray"`, lightness = `"lightest"|"lighter"`(기본 lightest). 화면 배경 톤 지정에.
- **setSafeStyle(renderer: Renderer2, el, style: Partial<CSSStyleDeclaration>)** — Renderer2 로 여러 스타일 일괄 적용. 디렉티브에서 DOM 스타일 직접 조작 시.
- **mark(sig: WritableSignal<any>)** — in-place 변경(배열 push 등) 후 shallow copy 새 참조로 set 하여 signal 소비자에게 변경 통지. 배열/객체를 직접 변형했을 때.

## 타입드 템플릿 디렉티브

- **SdTypedTemplate<T>** — `<ng-template [typed]="typeToken" let-x="...">`. ng-template 컨텍스트에 타입을 부여(타입 가드). 재귀 메뉴 템플릿 등에서 컨텍스트 타입 보장에 사용.
- **SdItemOfTemplate<TItem>** / **SdItemOfTemplateContext<TItem>** — `<ng-template [itemOf]="items" let-item="item" let-index="index" let-depth="depth">`. 컨텍스트 `{ $implicit; item; index; depth }`. select/shared-data/calendar 등이 항목 렌더 템플릿 규약으로 사용.

## SdOptionEventPlugin

`provideSdAngular` 가 등록하는 `EventManagerPlugin`. `.capture`/`.passive`/`.once` 접미 이벤트를 해석. 직접 사용 안 함.
