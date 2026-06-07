# @simplysm/angular

Angular(zoneless) 기반 SI/업무 클라이언트용 UI 컴포넌트·디렉티브·전역 프로바이더·signal 헬퍼 모음. `provideSdAngular` 부트스트랩 위에서 모달/토스트/busy/인쇄, 라우팅/메뉴/권한, 폼 입력 컨트롤, 시트(sd-sheet), 공유 마스터 데이터, CRUD 화면 골격, 사이드바/탑바 레이아웃, 칸반/권한표/에디터/시각화를 제공. `import "@simplysm/core-browser"` 를 side-effect 로 로드하며, 컴포넌트는 standalone + OnPush + `ViewEncapsulation.None`, selector 는 `sd-` prefix.

## 사용 트리거 인덱스

- **앱 부트스트랩·전역 설정** — `provideSdAngular` 로 zoneless 앱을 띄우고, 클라이언트명·테마·로컬스토리지·시스템설정·시스템로그·서비스클라이언트 프로바이더를 설정할 때. 자세히: [infra.md](./infra.md)
- **오버레이(모달·토스트·busy·인쇄)** — 코드로 모달/토스트를 띄우거나, 화면 busy 표시·인쇄/PDF 출력을 할 때. 자세히: [overlay.md](./overlay.md)
- **라우팅·메뉴·권한(app-structure)** — 페이지 코드·뷰 타입·제목 시그널, 라우터 링크/창 열기, 이탈 가드, 메뉴/권한 트리 계산을 할 때. 자세히: [routing-appstructure.md](./routing-appstructure.md)
- **공유 마스터 데이터** — `SdSharedDataProvider` 로 고객사·품목 등 마스터를 한 번 등록해 화면에서 공유 시그널로 쓰고, 선택 컨트롤로 관리·선택 모달을 띄울 때. 자세히: [shared-data.md](./shared-data.md)
- **시트(sd-sheet)** — 컬럼·셀 템플릿·정렬·페이징·선택·트리·요약 행을 가진 데이터 그리드를 그릴 때. 자세히: [sheet.md](./sheet.md)
- **CRUD 화면 골격** — 목록(`sd-crud-list`)·단건(`sd-crud-detail`)·공통 컨테이너(`sd-base-container`) 표준 화면 골격을 채택할 때. 자세히: [crud.md](./crud.md)
- **폼·입력 컨트롤** — 버튼·텍스트필드·체크박스·셀렉트·드롭다운·폼·페이지네이션 등 입력 컨트롤을 쓸 때. 자세히: [controls.md](./controls.md)
- **레이아웃(사이드바·탑바)** — 앱 셸의 사이드바/탑바/메뉴/유저 메뉴를 배치할 때. 자세히: [layout.md](./layout.md)
- **호스트 디렉티브·signal 헬퍼·선택 매니저** — 리사이즈/교차/리플/등장효과/유효성 디렉티브, 명령 단축키, 옵션 이벤트 플러그인, 템플릿 타입 가드, 선택/정렬/펼침 매니저를 쓸 때. 자세히: [directives.md](./directives.md)
- **부가 기능(칸반·권한표·상태프리셋·테마·주소·에디터·시각화)** — 칸반 보드, 권한 트리 표, 상태 프리셋, 테마 토글, 주소 검색 모달, Tiptap 에디터, 라벨/노트/진행바/달력/바코드/ECharts 를 쓸 때. 자세히: [features.md](./features.md)

## 공통 인라인 (소형 심볼)

### FormatPipe

문자열·날짜를 표시 포맷으로 변환하는 standalone pipe. name `format`.

- `transform(value: string | DateTime | DateOnly | undefined, format: string): string` — `value` 가 null 이면 `""`. `DateTime`/`DateOnly` 면 `value.toFormatString(format)`. 문자열이면 `format` 을 `|` 로 분리해 `X` 개수가 문자열 길이와 같은 패턴을 골라 `X` 자리에 글자를 끼워 넣음(전화번호·사업자번호 등 자릿수 마스킹). 매칭 패턴 없으면 원문 반환.

```html
{{ phone | format: "XXX-XXXX-XXXX|XX-XXXX-XXXX" }}
{{ regDate | format: "yyyy-MM-dd" }}
```

### mark

시그널 값을 in-place 변경한 뒤 소비자에게 변경 알림만 발행.

- `mark(sig: WritableSignal<any>): void` — `sig` 가 배열이면 `[...v]`, 객체면 `{...v}` 로 shallow copy 해 set. 객체·배열 시그널 내부 필드만 바꾼 뒤(`data().name = ...; mark(data)`) 양방향 바인딩의 `(valueChange)` 에 묶어 호출하거나, 값이 같아도 effect 를 강제 재발화시킬 때 사용.

```html
<sd-textfield [(value)]="data().name" (valueChange)="mark(data)" />
```

### setSafeStyle

`Renderer2` 로 여러 스타일 속성을 한 번에 설정.

- `setSafeStyle(renderer: Renderer2, el: HTMLElement, style: Partial<CSSStyleDeclaration>): void` — `style` 의 각 키를 `renderer.setStyle` 로 적용. 디렉티브·setup 헬퍼에서 호스트 엘리먼트에 스타일을 줄 때 사용.

### setupBgTheme

현재 컴포넌트가 살아있는 동안 `document.body` 배경색 CSS 변수를 테마색으로 설정(파괴 시 해제). injection 컨텍스트(생성자)에서 호출.

- `options.theme: "primary"|"secondary"|"info"|"success"|"warning"|"danger"|"gray"|"blue-gray"` — 배경 테마 계열. 미지정 시 배경색 변수를 빈 값으로 둠(기본 배경 유지).
- `options.lightness: "lightest"|"lighter"` — 테마색 밝기. 미지정 시 `"lightest"`. 페이지 전체 배경을 옅게 깔 때 사용.

```ts
constructor() { setupBgTheme({ theme: "gray", lightness: "lightest" }); }
```

### setupModelHook

`WritableSignal` 의 `set`/`update` 를 가로채 변경 허용 여부를 콜백으로 검사(비동기 허용). injection 컨텍스트에서 호출.

- `model: WritableSignal<T>` — 가드를 걸 대상 모델 시그널.
- `canFn: Signal<(item: T) => boolean | Promise<boolean>>` — 새 값을 받기 전 호출. `false` 면 반영 차단, `true` 면 즉시 반영, `Promise` 면 resolve 가 `false` 가 아닐 때만 반영(reject 는 `ErrorHandler` 로). 체크박스·스위치의 변경 확인 후에만 모델을 바꿔야 할 때.

### SelectModalOutputResult

선택 모달이 close 페이로드로 돌려주는 결과 타입.

- `selectedKeys: TKey[]` — 모달에서 선택된 키 배열. 단건 선택도 배열로 반환(첫 키만 사용). `sd-modal-select-button`·`sd-shared-data-select` 가 이 페이로드로 선택을 갱신.

### 타입 유틸 (directive-input-signals)

컴포넌트 input 시그널에서 값 타입을 뽑는 매핑 타입. 모달/토스트/인쇄 `inputs` 의 정적 타입 검증에 쓰임.

- `DirectiveInputSignals<T>` — `T` 의 `InputSignal` 프로퍼티만 골라 값 타입으로 변환한 객체 타입. `undefined` 포함 필드는 optional 로.
- `UndefToOptional<T>` — `undefined` 를 포함하는 프로퍼티를 optional(`?`) 로 변환.
- `WithOptional<T, K>` — `T` 에서 키 `K` 들만 optional 로 변환.
