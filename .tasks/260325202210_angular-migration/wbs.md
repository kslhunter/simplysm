# WBS

## Impact Mapping

- **Goal:** sd-angular 160개 모듈을 v14 워크스페이스에서 동작하게 하여, 기존 애플리케이션의 v14 전환을 완료한다
  - **Actor:** simplysm 프레임워크 사용 개발자
    - **Impact:** v14 환경에서 동일한 UI 컴포넌트 라이브러리로 애플리케이션을 개발한다
      - **Deliverable:** v14 호환 @simplysm/angular 패키지 (컴포넌트, 디렉티브, 서비스 포함)
    - **Impact:** 표준 폼 API와 호환되는 방식으로 데이터 입력 폼을 구축한다
      - **Deliverable:** 표준 폼 API 호환 입력 컴포넌트
    - **Impact:** 보일러플레이트 없이 반응형 상태를 관리한다
      - **Deliverable:** ~~개선된 시그널 유틸리티~~ → 네이티브 Angular Signal API 직접 사용 (커스텀 래퍼 불필요)
    - **Impact:** 테마 구분 없이 html font-size 변경만으로 다양한 화면 밀도에 대응한다
      - **Deliverable:** rem/em 기반 반응형 스타일 시스템 (mobile/compact/kiosk 테마 제거, light/dark 유지)

## Feature Breakdown

> 각 Feature의 범위 힌트(`-` 불릿)는 대표 예시이며 전체 목록이 아니다. 정식 분해는 `/sd-dev-spec`에서 수행한다.
> 각 UI Feature는 해당 컴포넌트의 SCSS 스타일을 포함한다 (수직 슬라이스).

### Epic 1. 공통 인프라

- [x] Feature 1.1 패키지 구조 및 의존성 설정
  - 워크스페이스 컨벤션에 맞는 패키지 구성
  - 진입점 및 export 구조
  - 빌드 설정 등록
  - Angular 컴파일러 옵션 (tsconfig.json)

- [x] Feature 1.1.1 테스트 환경구성
  - Vitest browser 환경에서 Angular TestBed 세팅
  - EventManagerPlugin 등 Angular 플러그인 테스트 인프라
  - 기존 텍스트 매칭 테스트(1.2, 1.5)를 실제 동작 테스트로 교체

- [x] Feature 1.2 테마 및 스타일 기반
  - CSS 변수 기반 테마 시스템
  - 다양한 테마 변형
  - 공통 스타일 믹스인

- [x] Feature 1.2.1 rem/em 사이징 전환 및 크기 테마 제거
  - mobile/compact/kiosk 크기 테마 제거
  - 모든 크기 값을 rem 기반으로 전환 (html font-size로 전체 배율 조정)
  - 상위 컨트롤에 비례하는 값은 em 사용
  - 테마 프로바이더의 크기 테마 선택 기능 제거

- ~~Feature 1.3 반응형 유틸리티~~ (제거 — 네이티브 Angular API + core-common으로 대체)

- ~~Feature 1.4 상태 매니저~~ (제거 — 각 UI Feature로 이관: SdExpandingManager→4.1, SdSelectionManager/SdSortingManager→6.1)

- [x] Feature 1.5 이벤트 시스템
  - DOM 이벤트 확장 및 커스텀 이벤트
  - 키보드 커맨드 이벤트 (모달 컨텍스트 필터링은 3.2로 이관)
  - 전역 에러 핸들링 (SdSystemLogProvider 연동은 1.8로 이관)
  - ~~SdBackbuttonEventPlugin~~ (제거 — @deprecated)

- [x] Feature 1.6 DOM 효과 디렉티브
  - 클릭 피드백 효과
  - 표시 애니메이션
  - 유효성 표시
  - setSafeStyle (1.3에서 이관)

- [x] Feature 1.7 템플릿 유틸리티
  - 타입 안전 템플릿 디렉티브
  - 라우터 연동 디렉티브 (SdNavigateWindowProvider 포함 — 1.9에서 이관)
  - 포맷 표시 파이프
  - 모델 바인딩 훅

- [x] Feature 1.8 앱 설정 프로바이더
  - 앱 식별 설정 (clientName)
  - 앱 구조 (메뉴/권한) 관리
  - 시스템 로그 관리
  - 에러 핸들러 SdSystemLogProvider 연동 (1.5에서 이관)
  - ~~시스템 설정~~ (SdSystemConfigProvider → 1.9로 이관, SdLocalStorageProvider 의존성)

- [x] Feature 1.9 서비스·스토리지 프로바이더
  - 파일 선택 다이얼로그 (SdFileDialogProvider)
  - 로컬 스토리지 (SdLocalStorageProvider)
  - 시스템 설정 (SdSystemConfigProvider — 1.8에서 이관)
  - 엘리먼트별 설정 리소스 (useSdSystemConfigResource)
  - ~~서비스 클라이언트 팩토리~~ → Feature 3.5로 이관 (SdToastProvider 의존)
  - ~~인쇄/PDF~~ → Feature 3.5로 이관 (SdBusyProvider + TDirectiveInputSignals 의존)
  - ~~공유 데이터 관리~~ → Feature 3.5로 이관 (SdServiceClientFactoryProvider 의존)

- [x] Feature 1.10 앱 부트스트래핑
  - 앱 초기화 함수 (플러그인·프로바이더 일괄 등록)
  - ~~HMR 부트스트랩~~ (제거 — Angular 21 네이티브 HMR(`ngHmrMode`)로 대체, sd-cli Vite 플러그인이 처리)
  - 테마 프로바이더 등록

- [x] Feature 1.11 라우터 시그널 훅
  - ~~라우터 파라미터 시그널~~ (useParamMapSignal/useQueryParamMapSignal 제거 — `toSignal()` 1줄 인라인)
  - 페이지 코드 시그널
  - 뷰 상태 시그널

### Epic 2. 기본 UI

- [x] Feature 2.1 기본 레이아웃
  - 다양한 페이지 배치 방식
  - 영역 고정 및 스크롤 레이아웃
  - 기본 구조 컨테이너

- [x] Feature 2.2 폼 레이아웃 및 뷰 전환
  - 폼 전용 배치 (라벨-입력 정렬)
  - 뷰 전환 및 상태 유지

- [x] Feature 2.3 버튼
  - 다양한 형태의 액션 트리거
  - ~~모달 선택 버튼~~ → Feature 5.3으로 이관 (SdModalProvider 의존)

- [x] Feature 2.4 텍스트 입력 (sd-textfield)
  - 13종 타입 지원 단일 입력 컴포넌트 (text, password, email, color, format, number, date, month, year, datetime, datetime-sec, time, time-sec)
  - 내부 전략 패턴으로 타입별 handler 분리 (공개 API는 sd-textfield [type] 유지)

- [x] Feature 2.4.1 다중행 입력 및 폼 컨테이너 (sd-textarea, sd-form)
  - 다중행 텍스트 입력 (sd-textarea)
  - 폼 영역 컨테이너 (sd-form)

- [x] Feature 2.5 체크박스 및 스위치
  - 토글형 선택
  - 그룹 선택

- [x] Feature 2.6 표시 컴포넌트
  - 텍스트 라벨 및 안내 노트
  - 진행률 표시
  - 캘린더 표시 및 날짜 탐색

- [x] Feature 2.7 외부 시각화
  - 차트 렌더링
  - 바코드/QR 코드 생성

### Epic 3. 오버레이

- [x] Feature 3.1 드롭다운
  - 트리거 및 팝업 위치 관리
  - 외부 클릭 닫기

- [x] Feature 3.2 모달
  - 동적 컴포넌트 생성
  - 포커스 트랩 및 복귀
  - 닫기 옵션 관리
  - 모달 UI 커스터마이즈 (크기 조절, 드래그 이동, float/fill)
  - TDirectiveInputSignals 타입 유틸 (1.3에서 이관)

- [x] Feature 3.2.1 모달 통합
  - 커맨드 플러그인 모달 컨텍스트 필터링 (1.5에서 이관)
  - useViewTitleSignal·useViewTypeSignal·setupCanDeactivate 모달 통합 (1.11에서 이관)
  - 드롭다운 모바일 모달 형식 표현 (3.1에서 이관 — v12 TODO 미구현)

- [x] Feature 3.3 토스트
  - 심각도별 알림 메시지
  - 자동 해제

- [x] Feature 3.4 비지 인디케이터
  - 로딩 상태 표시
  - 전역 카운팅
  - 라우터 네비게이션 busy (1.10에서 이관 — SdBusyProvider 의존)

- [x] Feature 3.5 서비스 연동 프로바이더
  - 서비스 클라이언트 팩토리 (SdServiceClientFactoryProvider — 1.9에서 이관, SdToastProvider 의존)
  - 공유 데이터 실시간 동기화 (SdSharedDataProvider — 1.9에서 이관, SdServiceClientFactoryProvider 의존)

- [x] Feature 3.5.1 인쇄·PDF 프로바이더
  - 인쇄/PDF 생성 (SdPrintProvider — 1.9에서 이관, SdBusyProvider + TDirectiveInputSignals 의존)

### Epic 4. 목록 및 네비게이션

- [x] Feature 4.1 목록·접기
  - 계층 구조 목록 표시
  - 접기/펼치기 토글
  - SdExpandingManager (1.4에서 이관)

- [x] Feature 4.1.1 페이지네이션
  - 페이지 단위 탐색

- [x] Feature 4.2 탭
  - 탭 선택 및 컨텐츠 전환
  - 탭뷰 상태 관리

- [x] Feature 4.3 사이드바
  - 측면 메뉴 토글
  - 메뉴 항목 및 사용자 정보

- [x] Feature 4.4 톱바
  - 상단 바 표시
  - 메뉴 드롭다운 및 사용자 메뉴

### Epic 5. 고급 입력

- [x] Feature 5.1 셀렉트
  - 드롭다운 기반 단일·다중 선택
  - 선택 버튼 변형

- [x] Feature 5.2 숫자·범위·날짜 입력
  - 숫자 패드 입력
  - 범위 입력 (dual-textfield from~to)
  - 날짜 범위 선택

- [x] Feature 5.3 모달 선택 및 상태 프리셋
  - 모달 기반 항목 선택 (SdModalSelectButtonControl — single/multi 모드)
  - 상태 프리셋 저장·불러오기 (SdStatePresetControl — 커스텀 모달로 prompt/confirm 교체)
  - 모달 선택 버튼 (2.3에서 이관 — SdModalProvider 의존)
  - ISdSelectModal/TSdSelectModalInfo 타입 정의 (버튼 컴포넌트 파일에 배치)

- [x] Feature 5.4 리치 텍스트 에디터
  - 서식 편집
  - 이미지 리사이즈

### Epic 6. 복합 UI

- [x] Feature 6.1 데이터 그리드 — 기본 표시
  - 다중 컬럼 테이블 렌더링
  - 컬럼 고정 및 스크롤 동기화
  - 행 표시 및 레이아웃 엔진
  - SdSelectionManager, SdSortingManager (1.4에서 이관)

- [x] Feature 6.2 데이터 그리드 — 편집 및 설정
  - 셀 인라인 편집
  - 키보드 탐색 및 행 선택
  - 그리드 설정 관리

- [x] Feature 6.3 칸반
  - 칸반 보드·레인·카드 관리
  - 항목 선택 및 로딩 상태
  - SdCardDirective TS 파일 누락 보완 포함 (Feature 2.1에서 SCSS만 생성됨)

### Epic 7. 앱 Feature

- [ ] Feature 7.1 앱 컨테이너
  - 페이지/모달 공통 레이아웃
  - 권한 체크 및 타이틀 관리
  - injectParent 유틸 (1.3에서 이관 — Angular 내부 API 대안 검토 필요)

- [ ] Feature 7.2 데이터 뷰
  - CRUD 데이터 테이블 뷰
  - 단일 항목 상세 뷰
  - 데이터 선택 버튼

- [ ] Feature 7.3 공유 데이터 관리
  - 공유 데이터 선택 (셀렉트, 버튼, 목록 형태)

- [ ] Feature 7.4 부가 기능
  - 외부 서비스 연동 검색
  - 권한 매트릭스 편집
  - 다크 모드 전환

## 참조 자료

### 소스 및 대상 경로

- 소스: `D:\workspaces-12\simplysm\packages\sd-angular` (v12.16.39, 160개 파일)
- 대상: `D:\workspaces-14\simplysm\packages\angular` (@simplysm/angular v14.0.0)

### 소스 코드 구조

```
src/
├── core/ (65 파일)
│   ├── directives/ (7) — DOM 이벤트, 리플, 유효성, 라우터 링크, 템플릿 등
│   ├── pipes/ (1) — 포맷
│   ├── plugins/ (8) — 커스텀 이벤트(resize, intersection, option, backbutton), 커맨드(save, refresh, insert), 에러 핸들러
│   ├── providers/ (11) — 앱 설정(4), 서비스 통합(4), 스토리지(2), 테마(1)
│   ├── utils/ (35) — 바인딩(16), 인젝션(2), 매니저(3), 셋업(8), 시그널(7), 트랜스폼(2)
│   └── root (2) — commons, provideSdAngular
├── ui/ (83 파일)
│   ├── data/ (16) — list(2), sheet(14: 컴포넌트+디렉티브+내부기능+타입)
│   ├── form/ (19) — button(4), choice(5), editor(1), input(5), select(3), form(1)
│   ├── layout/ (18) — dock(2), flex(2), grid(2), form(3), kanban(3), view(2), card, gap, pane, table
│   ├── navigation/ (15) — collapse(2), sidebar(4), tab(4), topbar(4), pagination(1)
│   ├── overlay/ (9) — busy(2), dropdown(2), modal(2), toast(3)
│   └── visual/ (6) — barcode, calendar, echarts, label, note, progress
└── features/ (11 파일)
    ├── base/ (1) — base-container
    ├── data-view/ (4) — data-sheet, data-detail, data-select-button, data-sheet-column
    ├── address/ (1), permission-table/ (1), theme/ (1)
    └── shared-data/ (3) — select, select-button, select-list
```

### 밀접 결합 관계 (Feature 분해 근거)

| Feature | 포함 파일 | 결합 근거 |
|---------|----------|-----------|
| ~~1.3 반응형 유틸리티~~ | (제거됨) | 네이티브 Angular API + core-common으로 대체. 잔여 항목 이관: setSafeStyle→1.6, TDirectiveInputSignals→3.x, injectParent→7.x |
| ~~1.4 상태 매니저~~ | (제거됨) | 매니저를 사용처 Feature로 이관: SdExpandingManager→4.1, SdSelectionManager/SdSortingManager→6.1 |
| 1.5 이벤트 시스템 | SdEventsDirective + 3 event plugins + 3 command plugins + error handler | 동일한 EventManagerPlugin 패턴. ~~SdBackbuttonEventPlugin 제거~~. **주의: 커맨드 플러그인→SdModalProvider 순환 의존** |
| 1.6 DOM 효과 | SdRippleDirective + SdShowEffectDirective + SdInvalidDirective + setupRipple/setupRevealOnShow/setupInvalid | 각 디렉티브와 전용 setup 함수가 1:1 결합 |
| 4.1 목록·접기 | list(2) + collapse(2) | list-item이 collapse를 import (순환 해소) |
| 4.1.1 페이지네이션 | pagination(1) | 독립 컴포넌트 (SdAnchorControl만 의존) |
| 6.1/6.2 데이터 그리드 | sheet + 6개 내부 feature 클래스 + 4개 타입 + 2개 디렉티브 + config modal | sheet 내부 모듈이 상호 참조 |

### 셋업 함수 배치

| 셋업 함수 | 배치 Feature | 근거 |
|-----------|-------------|------|
| setupRipple, setupRevealOnShow, setupInvalid | 1.6 DOM 효과 | 각 디렉티브의 전용 셋업 |
| setupModelHook | 1.7 템플릿 유틸리티 | 양방향 바인딩 훅 |
| setupBgTheme | 1.2 테마 및 스타일 기반 | 배경 테마 설정 |
| setupCanDeactivate | 1.11 라우터 시그널 훅 | 라우터 가드 |
| setupCloserWhenSingleSelectionChange | 5.1 셀렉트 | 단일 선택 시 자동 닫기 |
| setupCumulateSelectedKeys | 5.1 셀렉트 | 누적 선택 키 관리 |

### UI 간 교차 의존성

| 의존 관계 | 해소 방법 |
|-----------|-----------|
| data/list-item → navigation/collapse | Feature 4.1로 통합 (순환 의존 해소) |
| overlay/modal → form/anchor | Epic 3이 Epic 2 이후 |
| form/select → overlay/dropdown | Epic 5가 Epic 3 이후 |
| navigation/topbar → overlay/dropdown + data/list + form/button | Feature 4.4가 4.1, Epic 2-3 이후 |
| data/sheet → form + overlay + navigation/pagination | Epic 6이 Epic 3-4 이후 (pagination은 4.1.1) |
| layout/kanban → form + overlay/busy | Feature 6.3이 Epic 2-3 이후 |

### Angular 환경

- Angular: ^21.0.0
- 소스에 이미 적용된 패턴: standalone, signal inputs/outputs/model, inject(), @if/@for/@switch, OnPush, zoneless
- 빌드: esbuild 기반 LibraryBuilder (sd-cli), browser target
- 브라우저 호환: WebKit 61+
  - 사용자가 PostCSS 플러그인 설정 가능, 표준 PostCSS 플러그인으로 폴리필 불가능한 CSS 스펙은 사용 금지
  - 반대로 표준 PostCSS 플러그인으로 폴리필 가능한 부분은 가능한한 최신 스펙으로 구현

### 내부 의존성

- @simplysm/core-browser, @simplysm/core-common (v14 마이그레이션 완료)
- @simplysm/service-client, @simplysm/service-common (v14 존재)
- @simplysm/excel (v14 존재)

### 외부 의존성

- 아이콘: @ng-icons/core, @ng-icons/tabler-icons
- 차트: echarts ^6.0.0
- 에디터: quill ^2.0.3, quill-resize-image
- 바코드: jsbarcode, qrcode, bwip-js
- 출력: jspdf, html-to-image
- 유틸: marked, semver
- 모바일(optional): @capacitor/core, @capacitor/app

### v14 코딩 컨벤션

- 패키지 구조: packages/{name}/src/index.ts
- 모듈: ESM only ("type": "module")
- TypeScript: strict mode, verbatimModuleSyntax
- Export 패턴: barrel + namespace 혼합 (core-common 참고)
- 버전: 14.0.0, 내부 의존성 workspace:*

### 개선 리서치 방향

- 각 Feature의 sd-dev-spec 단계에서, 단순 포팅이 아닌 v14(Angular 21) 환경 및 업계표준에 맞는 개선을 리서치한다
- 리서치하여 구체적 개선안과 근거를 도출한 뒤, 선택지로 제시한다
- 개선 관련 질문을 할 때, "개선할 게 있나요?"라고 묻지 않는다
- 조사 결과를 "이런 근거로 이런 개선이 가능하다 → 어떤 걸 적용할지" 형태로 제시한다

### 결정 사항

| 결정 | 선택 |
|------|------|
| 패키지 분리 | 수행 안 함 — 단일 @simplysm/angular 유지 |
| EventManagerPlugin | 현행 유지 |
| Signal 유틸리티 | Feature 1.3 제거 — $signal/$computed/$effect/$resource/$afterRender*/$mark 전부 네이티브 Angular API로 대체, $arr/$obj/$map/$set 제거 (core-common 직접 사용), transformBoolean→네이티브 booleanAttribute, injectElementRef 제거 (1줄 인라인) |
| 폼 컴포넌트 | ControlValueAccessor 구현으로 표준 폼 API 호환 |
| @taiga-ui/event-plugins | 미채택 (strictTemplates 호환성 문제) |
| CSS 색상 스펙 (oklch/color-mix/light-dark/@property) | SCSS 유지 — WebKit 61 제약으로 CSS 변수 포함 시 PostCSS 변환 불가 |
| @layer | 도입 — postcss-cascade-layers로 WebKit 61 폴리필 가능 |
| color-map 네이밍 | 수정 — lightest~darkest가 실제 밝기와 일치하도록 (dark/darker/darkest를 어두운 방향으로) |
| 다크모드 이미지 반전 | opt-out 방식 — 기본 반전 + .no-invert 클래스로 제외 |
| modern 테마 | 제거 — 소스에서 파일 부재 |
| mobile/compact/kiosk 테마 | 전체 제거 — rem/em 기반 상대 단위 전환, html font-size로 화면 밀도 대응. light/dark 유지 |
| Feature 1.4 상태 매니저 | 제거 — 매니저는 UI 컴포넌트 내부 구현이므로 사용처 Feature(4.1, 6.1)로 이관 |
| SdBackbuttonEventPlugin | 제거 — @deprecated |
| useParamMapSignal / useQueryParamMapSignal | 제거 — `toSignal(activatedRoute.paramMap)` 1줄 인라인으로 대체 |
| 네이티브 API 치환 (공통) | 전 Feature에서 $signal→signal(), $computed→computed(), $effect→effect(), $resource→resource(), transformBoolean→booleanAttribute, injectElementRef→inject(ElementRef) 기계적 교체 |
| SdSystemConfigProvider (1.8) | Feature 1.9로 이관 — SdLocalStorageProvider(1.9) 의존성으로 자연스러운 순서 유지 |
| 에러 핸들러 로그 연동 방식 (1.8) | void writeAsync() fire-and-forget — writeFn은 DB/서버 전송 등 비동기 본질, 동기 래퍼 불필요 |
| SdAngularConfigProvider 속성 (1.8) | clientName만 유지 — defaultTheme 제거(1.2.1), defaultDark 제거(테마는 SdThemeProvider가 관리) |
| rem 기준값 (1.2.1) | 12px (compact 기본 폰트 크기, 1rem = 12px) — `_variables.scss`의 font-size-default에서 도출 |
| 하드코드 px 처리 (1.2.1) | 크기→rem, border 너비(구분 표시)→px 유지 — border는 스케일링 대상이 아닌 구분 표시 용도 |
| 커맨드 플러그인 모달 감지 (1.5) | Feature 3.2.1로 이관 — 모달 미존재 시점에서 모달 로직 구현 부적절 |
| SdActivatedModalProvider 의존성 (1.11) | 모달 로직 제외 이관, Feature 3.2.1에서 useViewTitleSignal·useViewTypeSignal·setupCanDeactivate에 모달 통합 추가 |
| 에러 핸들러 로그 프로바이더 (1.5) | Feature 1.8로 이관 — console 직접 사용, SdSystemLogProvider 연동은 1.8에서 추가 |
| .findParent() (1.5) | Element.closest() 네이티브 API로 대체 — v14 core-browser에 findParent 미포함 |
| process.env["NODE_ENV"] (1.5) | Angular isDevMode()로 대체 — Angular 표준 빌드 모드 감지 |
| SdIntersectionEventPlugin (1.5) | opt-in (수동 등록) 유지 — 원본에서도 provideSdAngular()에 미등록 |
| SdNavigateWindowProvider (1.7) | 1.9에서 1.7로 이관 — SdRouterLinkDirective의 직접 의존성, 32줄 간단 래퍼 |
| 모달 내 커맨드 핸들러 부재 시 동작 (3.2.1) | 무시 (소멸) — 모달이 격리 컨텍스트로 동작하여 예측 가능, 뒤쪽 페이지 의도치 않은 동작 방지 |
| 드롭다운 모바일 판단 기준 (3.2.1) | CSS 미디어 쿼리 (max-width: 520px) — 기존 SdDropdownPopupControl 미디어 쿼리와 일관된 임계값 |
| 드롭다운 모바일 UX (3.2.1) | Bottom sheet (화면 하단 슬라이드 업) — 모바일 표준 패턴, 엄지 접근 영역, 드롭다운 선택지 목록 성격에 부합 |
| 드롭다운 모바일 Bottom Sheet 구현 (3.2.1) | 드롭다운 자체 구현 — open/close 모델 직접 연동, 불필요한 모달 크롬 없음, 구조적 정합성 |
| querystring Node.js 모듈 (1.7) | URLSearchParams 브라우저 API로 대체 — Node.js→브라우저 API 치환 패턴. ParsedUrlQuery 타입도 Record<string, string>으로 단순화 |
| Forward dependency 처리 (1.9) | Feature 분리 — SdServiceClientFactoryProvider(→SdToastProvider), SdPrintProvider(→SdBusyProvider+TDirectiveInputSignals), SdSharedDataProvider(→SdServiceClientFactoryProvider)를 Feature 3.5로 이관 |
| 제외된 Provider 배치 (1.9) | Epic 3 이후 별도 Feature 3.5 생성 — core provider와 UI overlay 분리, WBS 정합성 유지 |
| injectSdLocalStorage (1.9) | 제거 — inject(SdLocalStorageProvider) 직접 사용 (injectElementRef 제거와 동일 패턴) |
| Cordova 감지 (1.10) | 제거 — v14에서 Capacitor v7.6.1로 완전 전환, Cordova 참조 0건 |
| ɵresetCompiledComponents (1.10) | 제거 — sdHmrBootstrapAsync 전체 삭제됨 (Angular 21 네이티브 HMR로 대체) |
| 라우터 네비게이션 busy (1.10) | Feature 3.4로 이관 — SdBusyProvider(3.4) 미존재, forward dependency 이관 패턴 |
| SW update (1.10) | v14에 포함 — 원본과 동일 (SwUpdate optional inject, 5분 주기 체크) |
| 테마 persistence (1.10) | provideSdAngular initializer에서 처리 — SdThemeProvider가 SdLocalStorageProvider 미의존 |
| sdHmrBootstrapAsync (1.10) | 전체 제거 — Angular 21 네이티브 HMR(`ngHmrMode`)로 대체, service-* reload 파이프라인도 함께 제거 |
| Feature 3.5 분리 (3.5) | Path 기반 2-way 분리 — 3.5: 서비스 연동(SdServiceClientFactoryProvider+SdSharedDataProvider), 3.5.1: 인쇄/PDF(SdPrintProvider). 서비스 연동과 프레젠테이션 출력의 관심사 분리 |
| 에디터 라이브러리 (5.4) | TipTap 3 (Core 직접, ngx-tiptap 미사용) — Quill 12개월 Inactive, TipTap 활발한 개발(2026 로드맵), ProseMirror 기반 확장성 |
| TipTap 통합 방식 (5.4) | Core 직접 사용 (ngx-tiptap 제외) — ngModel/FormsModule은 v14 signal 패턴과 불일치 |
| 폼 공통 옵션 (5.4) | disabled + required + validatorFn + TipTap 자체 지원(placeholder, readonly) |
| extension 커스터마이제이션 (5.4) | extensions input 제공 (기본 세트 + 오버라이드) — TipTap extension 아키텍처에 부합 |
| 이미지 삽입 방식 (5.4) | paste/drop만 (삽입 버튼 없음) — v12 동등, 이미지 노드 + 리사이즈는 기본 extension 세트 포함 |
| SdSelectionManager/SdSortingManager API (6.1) | function 기반 (useSelectionManager/useSortingManager) — 4.1의 useExpandingManager 선례, v14 use* 패턴 일관성 |
| ARIA 접근성 (6.1) | 추가 — aria-sort(정렬 헤더), aria-selected(선택 행), aria-expanded(확장 행). 동작 변경 없이 template 속성만 추가 |
| 6.1/6.2 경계 (6.1) | 6.1: 마우스 기반 표시/선택/정렬 + config 로드(읽기 전용) + 포커스/선택 표시자. 6.2: 셀 편집 + 키보드 탐색 + 컬럼 리사이징 + 설정 모달 + config 저장 |

### 크기 테마 제거 대상 파일

- `packages/angular/scss/themes/_variables-mobile.scss` — 제거 대상. mobile 테마 변수 정의
- `packages/angular/scss/themes/_variables-kiosk.scss` — 제거 대상. kiosk 테마 변수 정의
- `packages/angular/scss/commons/_theme-variables.scss` — mobile/kiosk @layer 제거 대상
- `packages/angular/scss/commons/_variables.scss` — 기본(compact) 변수의 px→rem 전환 대상
- `packages/angular/src/core/providers/sd-theme-provider.ts` — theme signal(compact/mobile/kiosk) 제거 대상. dark signal만 유지

### rem 전환 참조 정보

- 현재 compact 기본 사이즈: gap(1~18px), font-size(11~24px), elevation-size(1px)
- 이미 em 기반인 값: sidebar width(15em), topbar height(3em), ng-icon size(1.33em), line-height(1.5em)
- em 대상: 상위 컨트롤 크기에 비례해야 하는 값 (예: icon 크기)
- rem 대상: 나머지 모든 크기 값

### 현재 진행 상태

- Feature 1.1 완료: package.json, sd.config.ts 등록, tsconfig.json(angularCompilerOptions) 생성. styles.css placeholder는 삭제됨 (dist/styles.css로 대체)
- Feature 1.2 요구명세 + 구현계획 완료: 4 Slice (SCSS 변수→테마 전환→유틸리티 클래스→TS 프로바이더)
- Feature 1.3 제거: 모든 유틸이 네이티브 Angular API 또는 core-common으로 대체 가능하여 Feature 자체 불필요. 잔여 이관: setSafeStyle→1.6, TDirectiveInputSignals→3.2, injectParent→7.1
- Feature 1.4 제거: 매니저 3개를 사용처 Feature로 이관 (SdExpandingManager→4.1, SdSelectionManager/SdSortingManager→6.1)
- Feature 1.5 축소: SdBackbuttonEventPlugin(@deprecated) 제거
- Feature 1.11 축소: useParamMapSignal/useQueryParamMapSignal 제거 (네이티브 toSignal 1줄 인라인)
- Feature 1.11 요구명세 + 구현계획 완료: 7 Rule, 2 Slice (페이지 코드 시그널 → 뷰 상태+라우터 가드), 설계 결정 1건 (D1: SdActivatedModalProvider 모달 로직 제외→3.2 이관)
- Feature 1.6 요구명세 + 구현계획 완료: 4 Slice (setSafeStyle→Ripple→ShowEffect→Invalid), 설계 결정 5건 (D1~D5), tabbable 의존성 추가 예정
- 주의사항: 커맨드 플러그인(1.5)이 SdModalProvider(3.2) import → 순환 의존. setupModelHook(1.7)이 model.set monkey-patch
- src/index.ts는 @simplysm/core-browser import만 존재
- dist 폴더 미생성 (아직 빌드되지 않음)
- v14 sd-cli에 SCSS 컴파일 파이프라인 없음 → sass CLI + npm script로 대체
- Feature 1.2.1 추가: mobile/compact/kiosk 크기 테마 제거 및 rem/em 전환 요구사항 반영
- Feature 1.2.1 요구명세 + 구현계획 완료: 5 Rule, 2 Slice (SCSS 크기 테마 제거+rem 전환 / SdThemeProvider 단순화), 설계 결정 2건 (D1: 12px 기준, D2: border px 유지)
- Feature 1.7 요구명세 + 구현계획 완료: 5 Rule, 2 Slice (독립 유틸리티 / 라우터 연동), 설계 결정 2건 (D1: SdNavigateWindowProvider 1.9→1.7 이관, D2: querystring→URLSearchParams)
- Feature 1.8 요구명세 + 구현계획 완료: 4 Rule, 3 Slice (독립 프로바이더 / SdAppStructureProvider / 에러 핸들러 연동), 설계 결정 3건 (D1: SdSystemConfigProvider→1.9 이관, D2: void writeAsync() fire-and-forget, D3: clientName만 유지)
- Feature 1.9 범위 축소: SdServiceClientFactoryProvider/SdPrintProvider/SdSharedDataProvider를 Feature 3.5로 이관 (forward dependency). 1.9에는 SdFileDialogProvider, SdLocalStorageProvider, SdSystemConfigProvider, useSdSystemConfigResource만 남음
- Feature 3.5 분리: 3.5 서비스 연동(SdServiceClientFactoryProvider+SdSharedDataProvider) + 3.5.1 인쇄/PDF(SdPrintProvider). Path 기반 관심사 분리
- Feature 1.10 요구명세 + 구현계획 완료: 5 Rule, 1 Slice (provideSdAngular+commons), sdHmrBootstrapAsync 제거됨 (Angular 21 네이티브 HMR 대체), 설계 결정 6건 (D1: Cordova 제거, D2: ~~ɵresetCompiledComponents 유지~~ → 제거됨, D3: 라우터 busy→3.4 이관, D4: SW update 포함, D5: 테마 persistence initializer, D6: console.error 제거)
- Feature 3.4 범위 추가: 라우터 네비게이션 busy (1.10에서 이관)
- Feature 3.2 분리: Path 기반 — 3.2 코어(생성/포커스/닫기/UI/타입, 5 Rules) + 3.2.1 통합(커맨드 필터/뷰 시그널/드롭다운 모바일, 3 Rules). 결정 사항 참조도 3.2→3.2.1 업데이트
- Feature 3.2.1 요구명세 + 구현계획 완료: 5 Rule, 3 Slice (뷰 시그널+가드 모달 통합 → 커맨드 플러그인 모달 필터링 → 드롭다운 모바일 bottom sheet), 설계 결정 4건 (D1: 핸들러 부재 시 소멸, D2: 모바일 기준 max-width:520px, D3: bottom sheet UX, D4: 드롭다운 자체 구현). 순환 의존 회피: DOM 기반 모달 감지(findTopOpenModalEl)
- Feature 3.5.1 요구명세 + 구현계획 완료: 4 Rule, 2 Slice (printAsync+공통 인프라 / getPdfBufferAsync), 설계 결정 1건 (D1: getPdfBufferAsync pageSize 옵션 추가, 기본값 "a4"). v14 필수 치환: Buffer→Uint8Array, requestAnimationFrame→ApplicationRef.tick, 빈 catch→try-finally. 의존성 추가: jspdf, html-to-image
- Feature 4.1 분리: Path 기반 — 4.1 목록·접기 (list+collapse+SdExpandingManager) + 4.1.1 페이지네이션 (SdPaginationControl). 페이지네이션은 list/collapse와 import 관계 없음
- Feature 5.2 요구명세 + 구현계획 완료: 3 Rule, 2 Slice (SdRangeControl+SdNumpadControl / SdDateRangePicker), 설계 결정 2건 (D1: v12 API 유지, D2: 네이티브 Angular API). v14 필수 치환: $signal→signal, $effect→effect+untracked, NumberUtils→num, StringUtils→str. wbs.md 힌트 정정: "범위 슬라이더"→"범위 입력 (dual-textfield from~to)"
- Feature 6.1 요구명세 + 구현계획 완료: 5 Rule, 33 Scenario, 5 Slice (기본 렌더링 → 컬럼 고정/스크롤 → 행 선택/표시자 → 정렬 → 트리/페이지네이션), 설계 결정 6건 (D1: use* 매니저 패턴, D2: 리사이징/설정→6.2, D3: 편집/키보드→6.2, D4: config 로드 6.1 포함, D5: 포커스/선택 표시자 6.1 포함, D6: ARIA 접근성 추가). 신규 파일 10개: useSelectionManager, useSortingManager(core/utils), sd-sheet.control, sd-sheet-column.directive, types, useSheetLayoutEngine, useSheetColumnFixing, useSheetDomAccessor, useSheetFocusIndicator, useSheetSelectRowIndicator(ui/data/sheet)
- Feature 6.2 요구명세 + 구현계획 완료: 7 Rule, 30 Scenario, 4 Slice (config 바+config 저장+이벤트 출력 → 컬럼 리사이징 → 설정 모달 → 셀 편집+키보드 탐색+클립보드), 설계 결정 4건 (D1: Ctrl+C/V 6.2 포함 Clipboard API 직접 구현, D2: rAF→afterNextRender, D3: findParent→Element.closest(), D4: findFocusableFirst 인라인 구현). 신규 파일 2개: useSheetCellAgent, sd-sheet-config.modal(ui/data/sheet). 수정 파일: sd-sheet.control, sd-sheet-column.directive, types, index.ts

## 제외 사항

- sd-cli Angular 빌드(ngc) 지원 — 별도 태스크로 구현 예정
- 패키지 분리 — 단일 패키지로 유지 결정
- @taiga-ui/event-plugins 도입 — strictTemplates 호환성 문제로 미채택
- Angular Signal Forms 자체 도입 — ControlValueAccessor 구현으로 자동 호환
- SdBackbuttonEventPlugin — @deprecated 제거
- 커스텀 시그널 래퍼 ($signal/$computed/$effect/$resource/$afterRender*/$mark/$arr/$obj/$map/$set) — 네이티브 Angular API + core-common으로 완전 대체
- transformBoolean/transformNullableBoolean — 네이티브 booleanAttribute로 대체 (transformNullableBoolean은 데드코드)
- injectElementRef — inject(ElementRef) 1줄 인라인으로 대체
- useParamMapSignal/useQueryParamMapSignal — toSignal() 1줄 인라인으로 대체
