# @simplysm/angular

Angular 기반 업무 화면 UI 컴포넌트·디렉티브·프로바이더 묶음. `provideSdAngular()` 로 부트스트랩하고, 폼 컨트롤·시트·모달/토스트/Busy 오버레이·CRUD 화면 골격·권한/공유데이터 인프라를 standalone 컴포넌트로 제공. zoneless(Signal 기반) 전제이며 모든 입력은 Angular `input()`/`model()` 시그널.

## 사용 트리거 인덱스

- **provideSdAngular / 설정·로깅·서비스 인프라** — 앱 부트스트랩, 클라이언트명 주입, 시스템 로그/로컬스토리지/시스템설정 저장, 서비스 클라이언트 연결, 전역 에러 처리. 자세히: [infra.md](./infra.md)
- **모달 / 토스트 / Busy / 인쇄(오버레이)** — 프로그래밍 방식 모달·확인/프롬프트 모달, 토스트 알림, 로딩 표시, 인쇄·PDF 생성. 자세히: [overlay.md](./overlay.md)
- **폼 컨트롤·버튼·선택 컨트롤** — textfield/textarea/numpad/range/checkbox/switch/select/dropdown/form/collapse/tab/list/gap/pagination/button. 자세히: [controls.md](./controls.md)
- **레이아웃(사이드바·탑바)** — 사이드바/탑바 컨테이너·메뉴·사용자 메뉴로 화면 셸 구성. 자세히: [layout.md](./layout.md)
- **시트(sd-sheet)** — 트리/페이징/정렬/고정열/셀편집/선택 그리드. 자세히: [sheet.md](./sheet.md)
- **CRUD 화면 골격** — 목록(sd-crud-list)·상세(sd-crud-detail)·기반 컨테이너(sd-base-container) 화면 템플릿. 자세히: [crud.md](./crud.md)
- **공유 데이터(shared-data)** — 서버 공유 마스터데이터 등록·구독, 선택 컨트롤(select/select-button/select-list). 자세히: [shared-data.md](./shared-data.md)
- **라우팅 / 앱 구조(메뉴·권한)** — 페이지 코드·뷰 타입·제목 시그널, 라우터링크, 앱 구조→메뉴/권한 변환, 권한 테이블. 자세히: [routing-appstructure.md](./routing-appstructure.md)
- **선택/정렬/확장 매니저** — sd-sheet/공유선택 컨트롤이 공유하는 selection/sorting/expanding 로직 컴포저블. 자세히: [selection-managers.md](./selection-managers.md)
- **부가 기능(테마·주소·에디터·시각화)** — 다크모드/폰트크기, 주소검색 모달, TipTap 리치에디터, 라벨/노트/진행률/달력/바코드/ECharts, 칸반, 상태 프리셋. 자세히: [features.md](./features.md)
- **호스트 디렉티브·동작 셋업** — resize/intersection/이벤트옵션/명령키 디렉티브, ripple/show-effect/invalid 셋업, 타입드 템플릿. 자세히: [directives.md](./directives.md)

## 유틸 타입·헬퍼 (인라인)

군에 속하지 않는 소형 유틸. 모두 `@simplysm/angular` 루트에서 직접 import.

### mark

`mark(sig: WritableSignal<any>): void` — 시그널 값을 in-place mutation 한 뒤 소비자에게 변경을 알림.

- `sig` — 대상 WritableSignal. 값이 배열이면 `[...v]`, 객체면 `{...v}` 로 얕은 복사해 새 참조로 set → OnPush/computed 재평가 트리거. push·속성변경 후 한 줄로 갱신 신호를 줄 때.

```typescript
items().push(x); // 참조 동일 → 안 알려짐
mark(items);     // 얕은 복사로 새 참조 → 변경 전파
```

### setSafeStyle

`setSafeStyle(renderer: Renderer2, el: HTMLElement, style: Partial<CSSStyleDeclaration>): void` — Renderer2 로 여러 인라인 스타일을 한 번에 적용.

- `renderer` — Angular `Renderer2` 인스턴스. 키별로 `renderer.setStyle` 호출.
- `el` — 대상 엘리먼트.
- `style` — CSS 속성 부분 객체. 동작 셋업 함수(setupInvalid 등)가 내부적으로 사용.

### FormatPipe (`| format`)

`transform(value: string | DateTime | DateOnly | undefined, format: string): string` — 값을 포맷 문자열로 변환하는 standalone 파이프(name `format`).

- `value` — 대상. `null`/`undefined` 면 `""`. `DateTime`/`DateOnly` 면 `value.toFormatString(format)`. 문자열이면 `X` 자리표시자 마스킹 적용(길이 일치 시).
- `format` — 포맷 문자열. 문자열 입력 시 `|` 로 분리한 후보 중 `X` 개수가 값 길이와 같은 패턴을 골라 `X` 를 한 글자씩 치환(예: `"XXX-XXXX"`).

### DirectiveInputSignals / UndefToOptional / WithOptional (타입)

컴포넌트의 `input()` 시그널 집합에서 값 타입을 추출하는 유틸 타입. 모달/토스트/인쇄 콘텐츠 컴포넌트의 `inputs` 타입 추론에 쓰임.

- `DirectiveInputSignals<T>` — `T` 의 `InputSignal` 프로퍼티만 골라 `{ key: 값타입 }` 로 변환. `InputSignal<V>` → `V`, undefined 포함 필드는 optional.
- `UndefToOptional<T>` — `T` 의 필드 중 `undefined` 를 포함하는 키를 optional(`?`)로 바꾸고 값에서 `undefined` 제외.
- `WithOptional<T, K>` — `T` 의 키 `K` 들만 optional 로 변환.

### SelectModalOutputResult (타입)

`interface SelectModalOutputResult<TKey = any> { selectedKeys: TKey[] }` — 선택 모달이 close 로 반환하는 결과 형태.

- `selectedKeys` — 선택된 키 배열. 단일 선택이어도 배열. `SdSelectModal` 구현 모달이 확정 시 emit.
