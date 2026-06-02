# @simplysm/angular

Angular 19+ (zoneless, signal 기반) 업무 프론트엔드용 컴포넌트·디렉티브·프로바이더 모음. 모든 컴포넌트는 standalone, `OnPush`, signal input/model/output 사용. 부트스트랩은 `provideSdAngular` 1개로 시작.

## 사용 트리거 인덱스

- **앱 부트스트랩·전역 설정** — 앱 시작 시 `provideSdAngular` 호출, 전역 에러 처리·테마·로컬스토리지·서버연결·시스템설정 프로바이더 주입. 자세히: [infra.md](./infra.md)
- **모달·토스트·바쁨·인쇄(오버레이)** — 프로그래밍 방식으로 모달/토스트 띄우기, busy 표시, 화면 인쇄/PDF. 자세히: [overlay.md](./overlay.md)
- **라우팅·앱 구조·메뉴·권한** — 페이지 코드·뷰 타입·뷰 제목 signal, 라우터 링크, 사이드바/탑바 메뉴 트리, 권한 판정. 자세히: [routing-appstructure.md](./routing-appstructure.md)
- **호스트 디렉티브·setup 훅** — 엘리먼트에 ripple/show-effect/invalid 표시 부착, 리사이즈/교차/명령(ctrl+s 등) 이벤트, 옵션 이벤트(`.capture`/`.passive`), 타입드 템플릿. 자세히: [directives.md](./directives.md)
- **입력·버튼 컨트롤** — textfield/textarea/numpad/range/checkbox/switch/select/dropdown/form/button 등 폼 컨트롤. 자세히: [controls.md](./controls.md)
- **레이아웃(사이드바·탑바)** — 화면 골격(사이드바 컨테이너/메뉴/유저, 탑바 컨테이너/메뉴/유저). 자세히: [layout.md](./layout.md)
- **시트(데이터 그리드)** — `sd-sheet` 와 컬럼 정의, 정렬/선택/페이징/고정/셀편집. 자세히: [sheet.md](./sheet.md)
- **공유 데이터(shared-data)** — 서버 마스터 데이터 캐시 프로바이더와 그 select/list/button UI. 자세히: [shared-data.md](./shared-data.md)
- **선택·정렬·확장 매니저(use* 컴포저블)** — 커스텀 리스트에 선택/정렬/트리확장 로직 부착. 자세히: [selection-managers.md](./selection-managers.md)
- **CRUD 화면 골격·상태프리셋·권한표** — 목록/상세 화면 컨테이너, 상태 프리셋 저장, 권한 편집 테이블. 자세히: [crud.md](./crud.md)
- **기능 컴포넌트(주소검색·에디터·시각화·칸반)** — 다음 주소검색 모달, tiptap 에디터, 바코드/달력/차트/라벨/노트/진행률, 칸반 보드. 자세히: [features.md](./features.md)
- **FormatPipe** — 템플릿에서 문자열/날짜 포맷 표시. 아래 인라인 참조.
- **SelectModalOutputResult / DirectiveInputSignals / UndefToOptional / WithOptional** — 모달 선택 결과·input signal 타입 유틸. 아래 인라인 참조.

## FormatPipe

`{{ value | format: formatStr }}` — 파이프. value 가 `DateTime`/`DateOnly` 면 `toFormatString(formatStr)`, `string` 이면 `X` 마스크 포맷 적용(예: `format: 'XXX-XXXX'`, `|` 로 길이별 다중 패턴 분기 — `X` 개수가 value.length 와 일치하는 패턴 선택). value 가 null/undefined 면 `""` 반환(결측은 빈 문자열로 표시). standalone import 후 사용.

```html
<span>{{ phone | format: 'XXX-XXXX-XXXX|XXX-XXX-XXXX' }}</span>
<span>{{ dateOnly | format: 'yyyy-MM-dd' }}</span>
```

## 타입 유틸

- **SelectModalOutputResult<TKey>** — `{ selectedKeys: TKey[] }`. 선택 모달이 `close.emit` 으로 돌려주는 결과 형태. 선택 모달 컴포넌트 작성 시 close output 타입으로 사용.
- **DirectiveInputSignals<T>** — 컴포넌트/디렉티브 클래스 T 의 `InputSignal` prop 들만 골라 `{ prop: 값타입 }` 객체 타입으로 추출. `undefined` 포함 필드는 optional 로 변환. 모달/토스트/인쇄에 컴포넌트를 넘길 때 inputs 타입 산출에 내부적으로 쓰임.
- **UndefToOptional<T>** — `value: T | undefined` 필드를 `value?: T` 로 변환하는 매핑 타입. `DirectiveInputSignals` 가 내부에서 사용.
- **WithOptional<T, K>** — T 에서 키 K 들만 optional 로 만드는 타입. 모달/인쇄 inputs 에서 일부 input 을 선택 항목으로 표시할 때 사용.
