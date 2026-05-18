# @simplysm/angular — modal

선언형 `<sd-modal>` 과 프로그래밍 방식 `SdModalProvider` 둘 다 지원.

## 프로그래밍 방식

```typescript
const result = await inject(SdModalProvider).showAsync(
  {
    title: "주문 선택",
    type: OrderSelectModal,            // SdModalContentDef<TOutput> 구현
    inputs: { mode: "single" },        // DirectiveInputSignals<T> (close/initialized 등 제외)
  },
  { fill: true, resizable: true, key: "order-select" },
);
```

- `showAsync<T>(info, options?)` → `Promise<TOutput | undefined>`. `close.emit(value)` 시 resolve.
- `SdModalProvider.modalCount = signal(0)` (열린 모달 수).
- `key`를 주면 `SdSystemConfigProvider` 통해 width/height/위치 영속화.
- `noFirstControlFocusing: true`면 첫 tabbable 요소가 아닌 dialog 자체 포커스.

### 모달 컨텐츠 컴포넌트 인터페이스

```typescript
interface SdModalContentDef<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O | undefined>;
  actionTplRef?: TemplateRef<any>;
  readonly _optionalModalInputs?: string;   // 키 union → 해당 input들이 optional 처리
}
```

`SdModalInfo<T, X>`: `X`는 inputs에서 제외할 추가 키 union (예: `SdSelectModalInfo`가 `selectMode|selectedKeys` 제외).

### `SdModalOptions`

`key`, `hideHeader`, `hideCloseButton`, `headerStyle`, `useCloseByBackdrop`, `useCloseByEscapeKey`, `float`, `fill`, `resizable`, `movable`, `position: "bottom-right"|"top-right"`, `minHeightPx`, `minWidthPx`, `heightPx`, `widthPx`, `noFirstControlFocusing`.

## 선언형 `<sd-modal>`

`open` model, `title`/`key`/`hideHeader`/`hideCloseButton`/`headerStyle`/`useCloseByBackdrop`/`useCloseByEscapeKey`/`float`/`fill`/`resizable`/`movable`/`position`/`minHeightPx`/`minWidthPx`/`heightPx`/`widthPx`/`actionTplRef` input. `closeRequest` output (배경 클릭/ESC/닫기 버튼).

## 내부에서 모달 정보 사용

```typescript
const am = inject(SdActivatedModalProvider, { optional: true });
am?.modalComponent();    // SdModal 인스턴스 (title() 등)
am?.contentComponent();  // 컨텐츠 인스턴스
am.canDeactivateFn = () => isClean();   // 닫기 차단 (false 반환 시)
```

## 내장 컨텐츠 컴포넌트

- `SdPromptModal` (`SdModalContentDef<string>`): `message` input. Enter/확인 → `close.emit(value)` (빈 값이면 emit X), 취소 → `undefined`.
- `SdConfirmModal` (`SdModalContentDef<boolean>`): `message` input. 확인 → `true`, 취소 → `undefined`.
- `SdAddressSearchModal` (`SdModalContentDef<Address>`): Daum Postcode 스크립트 자동 로드. `Address = { postNumber, address, buildingName }`.

## 주의

- `SdModalContentDef` 의 `initialized` signal 은 컨텐츠 준비 후 `true` 로 (인쇄/모달 등이 대기).
- 모달은 body에 직접 attach (z-index 자동 할당, 최상위로 끌어올림). focus trap 적용.
- 닫힘 애니메이션 transition duration 대기 후 destroy.
