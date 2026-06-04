# @simplysm/angular

Angular(zoneless) 기반 SI/업무 클라이언트용 UI 컴포넌트·디렉티브·프로바이더·signal 헬퍼 라이브러리. `import "@simplysm/core-browser"` 를 side-effect 로 로드하며, 모든 컴포넌트는 standalone + OnPush + `ViewEncapsulation.None`, selector 는 `sd-` prefix.

> 사용 예 패턴 근거: `manuals/client-component.md`, `client-shared-data.md`, `client-system-log.md`, `client-demo.md`, `client-rules.md`. 화면 작성 시 provider 경유 호출·표준 시그널(ready/initialized/busyCount/viewType)·`mark` 사용·`$any` 금지 등은 매뉴얼을 따름.

## 사용 트리거 인덱스

- **앱 부트스트랩·전역 프로바이더** — `provideSdAngular`, 테마/로컬스토리지/시스템설정/시스템로그/서비스클라이언트 provider 를 배선할 때. 자세히: [infra.md](./infra.md)
- **모달·토스트·busy·인쇄 (오버레이/전역 피드백)** — 화면에서 모달을 띄우거나, 토스트로 알림·진행률을 표시하거나, busy 인디케이터·인쇄/PDF 를 호출할 때. 자세히: [overlay.md](./overlay.md)
- **라우팅·앱 구조(메뉴·권한)** — 라우터 링크, 현재 페이지 코드·뷰 타입·뷰 제목 signal, 메뉴·권한 트리(`injectPermsSignal`) 를 다룰 때. 자세히: [routing-appstructure.md](./routing-appstructure.md)
- **디렉티브·signal setup 헬퍼** — 리사이즈/교차/캡처 이벤트, 커맨드 단축키, ripple, 노출 애니메이션, invalid 표시, 타입드 템플릿을 붙일 때. 자세히: [directives.md](./directives.md)
- **폼·기본 입력 컨트롤** — 버튼/앵커, textfield/textarea/numpad/range/날짜범위, checkbox/switch/group, select/dropdown, form/collapse/tab/list/pagination 을 배치할 때. 자세히: [controls.md](./controls.md)
- **레이아웃 셸 (사이드바·탑바)** — 앱 좌측 사이드바/상단바 + 메뉴/사용자 메뉴를 구성할 때. 자세히: [layout.md](./layout.md)
- **시트(그리드)** — `sd-sheet` + 컬럼/셀 템플릿으로 다건 목록·편집 표를 그릴 때. 자세히: [sheet.md](./sheet.md)
- **공유 마스터 데이터 + 선택 컨트롤** — `SdSharedDataProvider` 등록·조회, `sd-shared-data-select`(드롭다운/버튼/리스트) 로 마스터 데이터를 선택할 때. 자세히: [shared-data.md](./shared-data.md)
- **selection/sorting/expanding 매니저** — 커스텀 목록 컴포넌트에서 선택·정렬·트리 펼침 상태 로직을 signal 로 합성할 때. 자세히: [selection-managers.md](./selection-managers.md)
- **CRUD 화면 표준 골격** — `sd-base-container` / `sd-crud-list` / `sd-crud-detail` 로 목록/단건 화면을 만들 때. 자세히: [crud.md](./crud.md)
- **기능 컴포넌트 (칸반·권한표·상태프리셋·테마선택·주소검색·에디터·시각화)** — 위 군에 안 드는 도메인성 컴포넌트를 쓸 때. 자세히: [features.md](./features.md)

아래는 군을 별도로 둘 만큼 크지 않은 유틸·타입·표시용 심볼의 인라인 섹션이다.

## signal·DOM 유틸

- `mark(sig: WritableSignal<any>): void` — WritableSignal 의 값을 in-place 변경한 뒤 변경 알림만 발행. 내부적으로 배열이면 `[...v]`, 객체면 `{...v}` 로 shallow copy 해 새 참조를 set. effect 강제 재발화나 객체/배열 필드 변경 알림에 사용. 매뉴얼 권장 패턴: `doRefresh(){ mark(this.lastFilter); }`, 양방향 바인딩 자식 변경 시 `(valueChange)="mark(filter)"`.
- `setSafeStyle(renderer: Renderer2, el: HTMLElement, style: Partial<CSSStyleDeclaration>): void` — `style` 객체의 각 키를 `renderer.setStyle` 로 적용. Angular Renderer 경유로 DOM 스타일을 안전하게 일괄 세팅할 때(직접 `el.style` 대입을 피해야 하는 디렉티브/setup 내부).

## FormatPipe (`format` 파이프)

- `transform(value: string | DateTime | DateOnly | undefined, format: string): string` — 값 표시 포매팅 파이프(`name: "format"`).
  - `value` 가 `null`/`undefined` → `""` 반환(결측 보존).
  - `DateTime`/`DateOnly` → `value.toFormatString(format)`.
  - `string` → `format` 을 `|` 로 끊어 각 후보에서 `X` 개수가 문자열 길이와 같은 것을 찾아 `X` 자리에 한 글자씩 끼워 마스킹(예: 전화번호 `"XXX-XXXX-XXXX"`). 매칭 후보가 없으면 원문 그대로.
  - 사용: `{{ phone | format: 'XXX-XXXX-XXXX' }}`, `{{ date | format: 'yyyy-MM-dd' }}`.

## 디렉티브 입력 추론 타입

모달/토스트/인쇄 provider 의 `inputs` 타입 계산에 쓰이는 유틸 타입. 직접 쓸 일은 드물지만 시그니처 해석용으로 노출됨.

- `DirectiveInputSignals<T>` — 컴포넌트/디렉티브 클래스 `T` 의 `InputSignal` 프로퍼티만 골라 `{ 키: 값타입 }` 으로 추출. `InputSignal` 아닌 멤버는 제외, `undefined` 포함 필드는 optional 로 변환.
- `UndefToOptional<T>` — `undefined` 를 포함하는 프로퍼티를 optional(`?`)로 바꾸는 매핑 타입. `DirectiveInputSignals` 내부에서 사용.
- `WithOptional<T, K extends keyof T>` — 특정 키 `K` 만 optional 로 만든 타입(`Omit<T,K> & Partial<Pick<T,K>>`). provider 의 `inputs` 에서 "기본값 있는 입력은 생략 가능" 을 표현.

## SelectModalOutputResult

- `interface SelectModalOutputResult<TKey = any> { selectedKeys: TKey[] }` — 선택 전용 모달이 close 시 emit 하는 페이로드 규약. `SdSelectModal` / `SdModalSelectButton` / `sd-shared-data-select` 모달 연동의 반환 타입. 선택 모달 컴포넌트는 이 타입을 `close.emit` 으로 돌려줌.

## SdGap (`sd-gap`)

여백 전용 빈 컴포넌트. flex 레이아웃 사이 간격을 토큰/픽셀로 삽입.

- `height: "xxs"|"xs"|"sm"|"default"|"lg"|"xl"|"xxl"` — 세로 간격 토큰(`--gap-*`). 세로 스택 사이 간격에 사용. 지정 시 display=block.
- `heightPx: number` — 세로 간격 px. `0` 이면 display=none(간격 제거).
- `width: "xxs"|...|"xxl"` — 가로 간격 토큰. 가로 나열 사이 간격에 사용. 지정 시 display=inline-block.
- `widthPx: number` — 가로 간격 px. `0` 이면 display=none.
- `widthEm: number` — 가로 간격 em. `0` 이면 display=none.
- 사용: `<sd-gap [width]="'sm'" />`.
