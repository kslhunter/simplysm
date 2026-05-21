# @simplysm/angular — modal

`SdModalProvider.showAsync` 로 프로그래밍 호출, 또는 `<sd-modal>` 컴포넌트 직접 배치.

## SdModalProvider (root)

```ts
modalCount: WritableSignal<number>;
showAsync<T extends SdModalContentDef<any>>(modal: SdModalInfo<T>, options?: SdModalOptions): Promise<O|undefined>;

interface SdModalContentDef<O> {
  initialized: Signal<boolean>;
  close: OutputEmitterRef<O|undefined>;
  actionTplRef?: TemplateRef<any>;
  readonly _optionalModalInputs?: string;  // type-level marker, optional inputs 이름 union
}

interface SdModalInfo<T, X = ""> {
  title: string;
  type: Type<T>;
  inputs: ...;   // T 의 InputSignal prop 들 (close/initialized 등 제외, _optionalModalInputs 마킹 prop 은 optional)
}

interface SdModalOptions {
  key?: string; hideHeader?: boolean; hideCloseButton?: boolean;
  headerStyle?: string;
  useCloseByBackdrop?: boolean; useCloseByEscapeKey?: boolean;
  float?: boolean; fill?: boolean;
  resizable?: boolean; movable?: boolean;
  position?: "bottom-right"|"top-right";
  minHeightPx?: number; minWidthPx?: number;
  heightPx?: number; widthPx?: number;
  noFirstControlFocusing?: boolean;
}
```

- `showAsync` — 컴포넌트 동적 생성·body 부착·열림 애니메이션·포커스 캡처. 컨텐츠 컴포넌트가 `close.emit(result)` 또는 배경/ESC/닫기버튼으로 `closeRequest` 발화하면 close 진행, Promise 가 result 로 resolve(취소는 undefined).
- `modalCount` — 동시 열린 모달 수. 키보드 이벤트 핸들러 등에서 활용.
- `SdModalContentDef.initialized` — 모달 컴포넌트가 자기 준비 끝났을 때 `true` 로 set. `SdPrintProvider` 등은 이걸 기다림(`SdModalProvider` 는 직접 사용 안 함).
- `SdModalContentDef.actionTplRef` — 모달 헤더 우측 추가 액션 영역에 띄울 `TemplateRef`. set 하면 자동으로 `<sd-modal>` 의 `actionTplRef` 로 브릿지.
- `_optionalModalInputs` — `SdModalInfo.inputs` 의 일부 prop 을 optional 로 만들 때 사용하는 type-level 마커(`= "fieldA" | "fieldB"`). 런타임 값 없음.
- `SdModalOptions` 필드별:
  - `key` — 지정 시 `SdSystemConfigProvider` 키 `sd-modal.<key>` 로 width/height/left/top 자동 저장·복원.
  - `hideHeader`/`hideCloseButton` — 헤더 영역 전체/닫기 버튼만 숨김.
  - `headerStyle` — 헤더 인라인 style 문자열.
  - `useCloseByBackdrop`/`useCloseByEscapeKey` — 기본 true. false 면 배경 클릭/ESC 무시.
  - `float` — true 면 배경 어둡지 않고 그림자만(비차단 플로팅).
  - `fill` — true 면 전체 화면. 헤더 투명·테두리 없음.
  - `resizable` — true 면 8방향 리사이즈 핸들.
  - `movable` — true 면 헤더 드래그로 이동.
  - `position` — `bottom-right`/`top-right` 절대 배치. 미지정 = 상단 가운데.
  - `minWidthPx`/`minHeightPx`/`widthPx`/`heightPx` — 사이즈 제약·고정.
  - `noFirstControlFocusing` — true 면 첫 탭가능 요소가 아니라 dialog 박스 자체에 포커스.

```ts
const result = await sdModal.showAsync({ title: "직원선택", type: EmpSelectModal, inputs: {} }, { resizable: true, key: "emp-select" });
```

## SdModal — `<sd-modal>`

`SdModalProvider` 가 내부에서 사용. 직접 템플릿에 두려면:

```ts
open = model(false); key = input<string|undefined>();
title = input(""); hideHeader = input(false); hideCloseButton = input(false);
headerStyle = input<string|undefined>();
useCloseByBackdrop = input(true); useCloseByEscapeKey = input(true);
float = input(false); fill = input(false);
resizable = input(false); movable = input(false);
position = input<"bottom-right"|"top-right"|undefined>();
minHeightPx/minWidthPx/heightPx/widthPx = input<number|undefined>();
actionTplRef = input<TemplateRef<any>|undefined>();
closeRequest = output<void>();
```

- 의미는 위 `SdModalOptions` 와 1:1. `closeRequest` 발화 시 부모가 `open.set(false)` 책임.

## SdActivatedModalProvider (inject inside modal content)

```ts
modalComponent: WritableSignal<SdModal|undefined>;
contentComponent: WritableSignal<T|undefined>;
canDeactivateFn: () => boolean;  // 닫기 차단 시 false 반환
```

- 컨텐츠 컴포넌트 내부에서 `inject(SdActivatedModalProvider)` 로 자기 모달 참조 가져오기. `canDeactivateFn` 을 함수로 덮어쓰면 ESC/배경/닫기버튼이 false 시 닫힘 차단(저장 안된 변경 사항 보호 패턴).
- `setupCanDeactivate(fn)` 헬퍼가 이걸 set 함 ([routing.md](./routing.md)).

## SdPromptModal / SdConfirmModal (사전 정의 컨텐츠)

```ts
class SdPromptModal implements SdModalContentDef<string> { message = input.required<string>(); }
class SdConfirmModal implements SdModalContentDef<boolean> { message = input.required<string>(); }
```

- 확인 시 prompt 는 입력값, confirm 은 `true` emit. 취소는 둘 다 `undefined`.

```ts
const input = await sdModal.showAsync({ title: "입력", type: SdPromptModal, inputs: { message: "이름?" } });
const ok = await sdModal.showAsync({ title: "확인", type: SdConfirmModal, inputs: { message: "삭제할까요?" } });
```

## SelectModalOutputResult<TKey>

```ts
interface SelectModalOutputResult<TKey = any> { selectedKeys: TKey[]; }
```

- `SdModalSelectButton`/`SdSharedDataSelect*` 가 선택 모달을 호출할 때 모달이 emit 할 표준 출력 형태.

## 주의

- 컨텐츠 컴포넌트가 `close.emit(value)` 를 호출해야 Promise 가 resolve. 닫기 버튼/ESC/배경 클릭은 `closeRequest` → `undefined` resolve.
- 컨텐츠 안에 `<ng-template #actionTpl>...</ng-template>` 두고 컴포넌트 클래스에서 `actionTplRef = viewChild('actionTpl')` 한 뒤 set 하면 헤더 액션 영역 표시됨.
- `resizable`/`movable`/`key` 조합 시 사용자 조정 사이즈·위치가 `sd-modal.<key>` 키로 `SdSystemConfigProvider` 에 저장됨.
