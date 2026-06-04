# @simplysm/angular — 디렉티브·signal setup 헬퍼

DOM 관찰(리사이즈/교차)·캡처 이벤트·커맨드 단축키·ripple·노출 애니메이션·invalid 표시·타입드 템플릿을 호스트 엘리먼트에 붙이는 군. `setup*` 헬퍼는 컴포넌트 `constructor` 안에서 호출(`inject(ElementRef)` 의존), `Sd*` 디렉티브는 그 헬퍼를 attribute 로 래핑한 것.

## SdResizeDirective (`[sdResize]`)

`ResizeObserver` 를 requestAnimationFrame 으로 디바운스해 크기 변화를 emit.

- `sdResize: output<SdResizeEvent>` — 크기 변화 시 발화.
- `SdResizeEvent = { heightChanged: boolean; widthChanged: boolean; target: HTMLElement; contentRect: DOMRectReadOnly }` — 어떤 축이 바뀌었는지·대상·새 사각형. `heightChanged`/`widthChanged` 로 필요한 축만 처리.
- 사용: `<div (sdResize)="onResize($event)">`. `sd-sheet`·`sd-collapse`·`sd-echarts` 등이 hostDirective 로 사용.

## SdIntersectionDirective (`[sdIntersection]`)

`IntersectionObserver` 로 뷰포트 진입/이탈 emit.

- `sdIntersection: output<SdIntersectionEvent>` — 교차 변화 시 발화.
- `SdIntersectionEvent = { entry: IntersectionObserverEntry }` — `entry.isIntersecting` 으로 진입 판단. 무한 스크롤·지연 로드에 사용.

## SdEvents (옵션부 이벤트)

Angular 기본 바인딩이 못 거는 capture/passive/once 이벤트를 output 으로 노출하는 디렉티브. selector 에 든 attribute 중 쓰는 것만 바인딩하면 됨(전부 listen 하지 않음). `SdOptionEventPlugin`(provideSdAngular 가 등록) 이 실제 옵션 처리.

- 클릭/마우스: `click.capture`, `click.once`, `click.capture.once`, `mousedown.capture`, `mouseup.capture`, `mouseover.capture`, `mouseout.capture` — `output<MouseEvent>`.
- 키보드: `keydown.capture`, `keyup.capture` — `output<KeyboardEvent>`.
- 포커스: `focus.capture`, `blur.capture` — `output<FocusEvent>`(버블 안 되므로 capture 필수).
- 폼: `invalid.capture` — `output<Event>`.
- 스크롤/휠: `scroll.capture`, `scroll.passive`, `scroll.capture.passive`, `wheel.passive`, `wheel.capture.passive` — passive 로 스크롤 성능 확보.
- 터치: `touchstart.passive`(+capture), `touchmove.passive`(+capture), `touchend.passive` — `output<TouchEvent>`.
- 드래그: `dragover.capture`, `dragenter.capture`, `dragleave.capture`, `drop.capture` — `output<DragEvent>`.
- 애니메이션: `transitionend.once`, `animationend.once` — 1회만.
- `.capture` = 캡처 단계 수신, `.passive` = preventDefault 불가(스크롤 블로킹 방지), `.once` = 1회 후 자동 해제.
- 사용: `<div (scroll.passive)="onScroll()">`, `<div (keydown.capture)="onKeydown($event)">`.

## SdCommandDirective (`[sdRefreshCommand],[sdSaveCommand],[sdInsertCommand]`)

문서 레벨 Ctrl 단축키를 명령 output 으로. 최상위 열린 모달 안에서만 동작(다른 컨텍스트로 새지 않게 가드).

- `sdRefreshCommand: output<KeyboardEvent>` — Ctrl+Alt+L.
- `sdSaveCommand: output<KeyboardEvent>` — Ctrl+S.
- `sdInsertCommand: output<KeyboardEvent>` — Ctrl+Insert.
- 매칭 시 preventDefault + stopPropagation. `sd-crud-list`/`sd-crud-detail` 가 `sdSaveCommand` 를 hostDirective 로 받아 저장 트리거.

## SdRipple (`[sdRipple]`) / setupRipple

클릭 지점에서 퍼지는 물결 효과.

- `SdRipple.sdRipple: input.required(booleanAttribute)` — true 일 때만 ripple 동작(disabled 토글). `<sd-button [sdRipple]="!disabled()">`.
- `setupRipple(enableFn?: () => boolean): void` — constructor 에서 호출하는 헬퍼. `enableFn` 이 false 반환 시 해당 클릭은 ripple 생략. 커스텀 컴포넌트 내부에서 직접 ripple 부여 시.

## SdShowEffect (`[sdShowEffect]`) / setupRevealOnShow

뷰포트 진입 시 페이드+슬라이드로 나타나는 효과.

- `SdShowEffect.sdShowEffect: input.required(booleanAttribute)` — true 면 효과 적용, false 면 효과 없이 즉시 표시.
- `SdShowEffect.sdShowEffectType: "l2r" | "t2b"` — 등장 방향. `"t2b"`(기본) = 위에서 아래로, `"l2r"` = 왼쪽에서 오른쪽으로.
- `setupRevealOnShow(optFn?: () => { type?: "l2r"|"t2b"; enabled?: boolean }): void` — constructor 헬퍼. `enabled` false 면 트랜지션 없이 노출.

## SdInvalid (`[sdInvalid]`) / setupInvalid

폼 검증 실패를 좌상단 빨간 점 + 네이티브 form 검증으로 표시. 숨은 input 에 `setCustomValidity` 를 걸어 form submit 시 차단.

- `SdInvalid.sdInvalid: input.required<string>` — 빈 문자열이면 유효, 비어있지 않으면 그 메시지로 invalid 표시.
- `setupInvalid(getInvalidMessage: () => string): void` — constructor 헬퍼. 반환 문자열이 비면 valid, 아니면 invalid. 모든 입력 컨트롤(`sd-textfield`/`sd-select`/`sd-modal-select-button` 등)이 내부에서 이걸로 required/형식 검증을 구현. 커스텀 입력 컴포넌트 작성 시 동일 패턴.

## SdTypedTemplate (`ng-template[typed]`)

`<ng-template>` 컨텍스트에 타입을 주는 디렉티브(런타임 동작 없음, 타입 가드만).

- `typed: input.required<T>` — 컨텍스트 타입 토큰. `let-x` 변수에 `T` 타입이 추론됨. 사이드바/탑바 메뉴 재귀 템플릿이 사용.

## SdItemOfTemplate (`ng-template[itemOf]`)

항목 반복 템플릿에 항목 타입을 주는 디렉티브.

- `itemOf: input.required<TItem[]>` — 항목 배열(타입 추론용 더미, 실제 반복은 부모가 수행).
- 컨텍스트: `SdItemOfTemplateContext<TItem> = { $implicit; item; index: number; depth: number }`. `let-item="item"` / `let-index="index"` / `let-depth="depth"`.
- 사용: `sd-shared-data-select`·`sd-calendar` 의 항목 템플릿. `<ng-template [itemOf]="items()" let-item="item">{{ item.name }}</ng-template>`.
