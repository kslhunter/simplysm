# Plan: angular 테마 역할 토큰 전면화

## 0. 메타데이터

| 항목      | 내용                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Plan ID   | PLAN-260715202329                                                                                                                                                                          |
| Plan 상태 | Ready                                                                                                                                                                                      |
| 생성 시각 | 2026-07-15 20:23:29                                                                                                                                                                        |
| 제목      | angular 테마 역할 토큰 전면화                                                                                                                                                              |
| 대상 범위 | packages/angular (scss 전체·src 컴포넌트 스타일·theme provider/selector), plugins/sd/references/simplysm14 문서                                                                            |
| 근거 자료 | 사용자 발언(2026-07-15 대화 — VS Code webview 방식 vars 전면화·역할 토큰·브레이킹+alias 단일 파일·커스텀 테마 포함·`--sd-` 접두사), 코드 조사(§3)                                          |
| 작성 원칙 | 근거 없는 항목은 `[OPEN]`, 구현은 별도 지시 전까지 보류                                                                                                                                    |
| 실행 규약 | TASK 는 §8 의 순서·의존대로 실행함. 선행 의존 TASK 가 Done 되기 전 후속 착수 금지, §8 `병렬 가능` 인 무의존 TASK 는 동시 진행 가능. 각 TASK 완료 즉시 상태를 `Done (yyyy-MM-dd)` 로 갱신함 |

## 1. 목표·문제·완료 정의

- 목표: 테마(내장·커스텀)가 **CSS 변수 값 맵만으로** 완성되게 토큰 체계를 역할(role) 기반으로 전면 재설계함.
- 해결할 문제:
  - 테마 하나 만들려면 `_ide-dark-surfaces.scss` 처럼 컴포넌트 스타일을 하나하나 찾아 셀렉터 오버라이드를 쌓아야 함(테마 자유도 낮음).
  - 명도 스케일 이름(`lightest..darkest`)이 다크 테마에서 의미가 뒤집혀 거짓이 됨.
  - 외부 앱이 커스텀 테마를 추가할 공식 경로가 없음(TS union·selector 배열·SCSS 셀렉터 3중 하드코딩).
- 완료 정의:
  - 전 컴포넌트 스타일이 `--sd-*` 역할 토큰만 소비함(팔레트·스케일 직접 소비 0).
  - ide-dark·블루프린트 테마가 역할 토큰 값 맵으로 재구성되고 `_ide-dark-surfaces.scss`·`_blueprint-surfaces.scss` 둘 다 삭제됨(오버라이드 0 — DEC-006).
  - 구 토큰·유틸 어휘는 발행·소비 모두 소멸함(전면 브레이킹 — DEC-002 재결정).
  - 외부 앱이 테마 이름 등록 + CSS 변수 맵만으로 커스텀 테마를 추가 가능함.
  - references/simplysm14 문서가 새 어휘 기준으로 갱신됨.
  - 원격 위키에 "simplysm@14.2 스타일 어휘 규칙 + 구(14.1) 어휘 대응표" 페이지가 존재함(소비앱 전환 안내 — 절차형 아닌 상태 규칙 형식으로 위키 내규 관문 4 준수).
- 성공 시 관찰 가능한 변화: 새 테마 추가 작업 = "역할 카탈로그 값 채우기 + 테마 이름 등록" 2단계로 끝남. 컴포넌트 스타일 파일을 열 필요 없음.

## 2. 범위 / 비범위 / 제약

### 2.1 범위

| ID        | 포함 항목                                                                                                   | 근거                       |
| --------- | ----------------------------------------------------------------------------------------------------------- | -------------------------- |
| SCOPE-001 | `--sd-` 접두사 역할 토큰 카탈로그 신설(표면·시맨틱 슬롯·상태·보더·그림자·타이포·간격 등 전 어휘)            | DEC-001·DEC-004            |
| SCOPE-002 | packages/angular 전 컴포넌트 스타일·scss/controls·scss/commons 를 역할 토큰 소비로 재작성(리터럴 4곳 포함)  | DEC-001, FIND-002·FIND-003 |
| SCOPE-003 | 유틸 클래스(`.bg-*`·`.tx-*`·`.bd-*` 등) 역할 기반 재생성                                                    | DEC-002                    |
| SCOPE-004 | 라이트(기본)·ide-dark·블루프린트 테마를 역할 토큰 값 맵으로 재구성, `_ide-dark-surfaces.scss` 삭제          | DEC-001, FIND-004          |
| SCOPE-005 | 구 어휘 발행 제거(구 토큰 `$vars`·`--color-*` 발행부 삭제 — 전면 브레이킹)                                  | DEC-002(재결정 2026-07-16) |
| SCOPE-006 | 라이브러리 내부 테마 추가 용이화(내장 `SD_THEMES` 단일 목록 → `SdThemeName` 파생·selector 렌더·토글 일반화) | DEC-003(재결정 2026-07-16) |
| SCOPE-007 | references/simplysm14 관련 문서 갱신(9개 파일 — §3 FIND-007)                                                | 사용자 지시                |
| SCOPE-008 | 밀도 독립 축(`density` signal·`sd-density-compact`·치수 토큰 그룹 분리)                                     | DEC-007                    |
| SCOPE-009 | 원격 위키 소비앱 안내 페이지("14.2 어휘 규칙 + 14.1 대응표")                                                | 사용자 지시(2026-07-16)    |

### 2.2 비범위

| ID           | 제외 항목                                       | 제외 이유                                                                                                                                               | 후속 처리                                                         |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| NONSCOPE-001 | ~~블루프린트 모눈 패턴 토큰화 제외~~ (해소)     | DEC-006 으로 범위 편입 — `background` 단축 금지 + `--sd-bg-canvas-image` 로 값 맵화                                                                     | SCOPE-004·TASK-002·003 에서 수행                                  |
| NONSCOPE-002 | 팔레트 원색(`--color-*-{50..950}`)의 값 변경    | 색 값 자체는 이번 대상 아님(이름만 `--sd-color-*` 로)                                                                                                   | 없음                                                              |
| NONSCOPE-003 | 신규 테마(다크·블루프린트 외) 추가              | 요청 없음                                                                                                                                               | 커스텀 테마 API 로 앱이 수행                                      |
| NONSCOPE-004 | tests/* 워크스페이스·타 패키지의 스타일 변경    | angular 패키지 밖                                                                                                                                       | 위키 대응표로 소비처 직접 전환(사내 opus 는 2026-07-16 전환 완료) |
| NONSCOPE-005 | `system` 테마 옵션(`prefers-color-scheme` 자동) | 사용자 유보(2026-07-15) — 테마가 컨셉×명암 매트릭스(라이트/다크·블루프린트 라이트/다크·IDE 라이트/다크)로 확장돼 전 컨셉이 라이트/다크를 갖춘 뒤에 도입 | 매트릭스 완성 시 재검토                                           |

### 2.3 제약

| ID             | 제약                                                                                                                                                                                          | 영향                                                                                | 근거                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| CONSTRAINT-001 | ~~alias 호환 유지~~ → 폐지(DEC-002 재결정). 구 어휘는 발행·문서에서 완전 제거하고 잔존 0건을 게이트로 보증함                                                                                  | 카탈로그·코드에 구 어휘 잔재 금지                                                   | 사용자 확정(2026-07-16)                             |
| CONSTRAINT-002 | `@layer base, theme-variant, utilities` 캐스케이드 구조 유지 — 테마 변수는 theme-variant 레이어에서 덮음                                                                                      | 카탈로그·테마 맵 발행 위치 고정                                                     | `_theme-variables.scss:7`                           |
| CONSTRAINT-003 | oklch 미지원 브라우저 대응 — 팔레트는 rgb 리터럴 유지                                                                                                                                         | 카탈로그 기본값도 rgb/var 참조로만 구성                                             | `_colors.scss:1-3` 주석                             |
| CONSTRAINT-004 | SSR(프리렌더) 가드 유지 — document 접근은 브라우저 전용                                                                                                                                       | 커스텀 테마 API 도 동일 가드 필요                                                   | `sd-theme-provider.ts:17`, `provideSdAngular.ts:51` |
| CONSTRAINT-005 | 소비자타입 >> 내부타입 원칙 — 테마 API 개방 시에도 잘못된 입력은 컴파일 에러 유도                                                                                                             | `SdThemeName` 완화 방식 설계에 영향(§6.2 OPEN-002)                                  | CLAUDE.md 라이브러리 타입 설계 원칙                 |
| CONSTRAINT-006 | 파생(체이닝) 토큰은 재정의 스코프 문제를 설계로 회피 — 테마가 덮는 대상은 **역할 토큰 자체**여야 하며, `:root` 발행 토큰이 다른 토큰을 var() 참조하는 체인은 테마 스코프에서 하위가 안 따라옴 | 카탈로그에서 토큰 간 var() 체인 금지 또는 테마 맵에 체인 토큰 필수 재선언 규칙 필요 | FIND-012(실측)                                      |
| CONSTRAINT-007 | 테마 값의 색 원천은 팔레트(`--sd-color-*` 이관 후 기준) + 흰/검 알파만 — 커스텀 rgb 리터럴 금지                                                                                               | 카탈로그 기본값·내장 테마 맵 작성 규칙                                              | FIND-014(사용자 확정)                               |

## 3. 조사 요약

| ID       | 조사 관점          | 확인 내용                                                                                                                                                                                                                                      | 근거                                                                   | plan 반영                              |
| -------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| FIND-001 | 토큰 발행 구조     | `$vars` 맵 → `writeVars` 재귀로 `:root`(base 레이어) 발행, 테마는 theme-variant 레이어에서 같은 이름 재정의                                                                                                                                    | `_theme-variables.scss:7-26`, `_mixins.scss:5-17`                      | SCOPE-001, TASK-001                    |
| FIND-002 | 하드코딩 리터럴    | src 내 테마 취약 리터럴 4곳: `sd-select-item.ts:49,55,61`(hover 등 `rgba(0,0,0,0.07)` — 다크에서 비가시), `sd-sheet.ts:527`(포커스행). 그 외 `sd-busy-container.ts:139` 그림자                                                                 | grep rgba 전수                                                         | TASK-002                               |
| FIND-003 | 오버라이드 원인    | 셀렉터 오버라이드 근본 원인 3종: ①표면 토큰 부재(`--control-color` 를 input·card·modal·dropdown 공유) ②시맨틱 슬롯 미분해(버튼 bg/fg/border 가 `--theme-{key}-default` 하나에서 파생) ③컴포넌트 장식 토큰 부재(카드 보더·모달 헤더·그림자 색)  | `_ide-dark-surfaces.scss` 블록별 원본 대조(조사 보고)                  | TASK-001 카탈로그                      |
| FIND-004 | 다크 스케일 역전   | ide-dark 테마가 `lightest` 슬롯에 어두운 색을 넣어 명도 이름 의미가 뒤집힘                                                                                                                                                                     | `_variables-ide-dark.scss`(gray 스케일 역전)                           | 역할 이름 채택 근거                    |
| FIND-010 | 세션 중 리네임     | 워킹트리에서 다크 테마가 `dark`→`ide-dark` 로 리네임됨(파일·`SdThemeName`·클래스명). 계획은 `ide-dark` 기준                                                                                                                                    | `sd-theme-provider.ts:4`, `scss/themes/` glob 실측                     | 전 TASK 대상 경로                      |
| FIND-005 | 컴포넌트 로컬 var  | `--sd-*` 등 컴포넌트 스코프 var 정의 0건 — 명명 규칙 신설 필요                                                                                                                                                                                 | src 전체 grep 무매치                                                   | DEC-004                                |
| FIND-006 | 테마 3중 하드코딩  | 테마 이름이 `SdThemeName` union + selector `themeItems` + SCSS `.sd-theme-*` 3곳에 중복. 외부 등록 API·exports 부재                                                                                                                            | `sd-theme-provider.ts:4`, `sd-theme-selector.ts:76-80`                 | TASK-005                               |
| FIND-007 | 문서 영향          | references/simplysm14 에서 테마·유틸 어휘 언급 9파일 64건. `apis/angular/features.md` 는 이미 구 API(boolean signal) 기준으로 stale                                                                                                            | grep count                                                             | TASK-006                               |
| FIND-008 | 유틸 클래스 생성   | `.bg-*`·`.tx-*`·`.bd-*` 등이 `$vars` 순회로 자동 생성(utilities 레이어) — 토큰 어휘 변경이 클래스명에 직결                                                                                                                                     | `_styles.scss:115-430`, `_mixins.scss:62-94`                           | SCOPE-003                              |
| FIND-009 | 테마 영속화        | localStorage `sd-theme` 키로 테마명 저장·복원 — 커스텀 테마명도 문자열이라 그대로 통과 가능                                                                                                                                                    | `provideSdAngular.ts:56-68`                                            | TASK-005                               |
| FIND-011 | 필드 배경 관례     | 인풋류 배경이 `--theme-secondary-lightest` 관례로 7곳(sd-textfield·textarea·select·checkbox·markdown/tiptap editor) 공유 — 시맨틱 색(secondary)이 표면 역할을 겸직. ide-dark 에서 secondary-lightest 를 표면색으로 왜곡 정의해 우회한 상태     | `sd-textfield.ts:89` 외 grep 7건, `_variables-ide-dark.scss:40`        | TASK-001(필드 표면 역할 신설)          |
| FIND-012 | 토큰 체이닝 함정   | 커스텀 프로퍼티는 **정의된 스코프에서 var() 가 확정(computed)된 값으로 상속**됨 — `:root` 에서 `--sheet-pv: var(--gap-xs)` 로 발행하면 테마(body)가 `--gap-xs` 를 덮어도 `--sheet-pv` 는 base 값 유지. ide-dark 는 sheet.pv/ph 재선언으로 우회 | ide-dark 세션 실측(계산값 검증), `_variables-ide-dark.scss` sheet 주석 | CONSTRAINT-006, TASK-001               |
| FIND-013 | 인라인 var 함정    | `provideNgIconsConfig({size})` 가 각 ng-icon 에 인라인 스타일로 `--ng-icon__size` 를 박아 스타일시트 정의를 무력화 — size 옵션 제거 후 styles.scss 의 `calc(var(--line-height) - 0.2em)` 로 일원화됨(아이콘+시프트 ≤ 라인박스 구조 보장)       | `provideSdAngular.ts`(size 제거 주석), `styles.scss` ng-icon 블록      | TASK-001(타이포 토큰), TASK-002        |
| FIND-014 | 테마 색 원천 규칙  | 사용자 확정 규칙: 테마 값은 팔레트(`--color-*`)만 사용, 예외는 흰/검 알파(rgba white/black)뿐 — ide-dark 가 이 규칙으로 정규화 완료(계층 zinc-950/900/800, 보더·텍스트 흰 알파)                                                                | 사용자 발언(2026-07-15), `_variables-ide-dark.scss` 머리 주석          | CONSTRAINT-007                         |
| FIND-015 | ide-dark 확정 상태 | 레퍼런스 = VSCode Dark 2026(microsoft/vscode `2026-dark.json`, v1.113 기본). 확정치: gap 기본대비 약 2/3·line-height 1.35em·radius 1-6px·그림자 전무(`elevation-size: 0`)·시맨틱 solid = bg 600+백색 fg·링크 fg 600·Sarasa Fixed K·topbar 2rem | `_variables-ide-dark.scss`·`_ide-dark-surfaces.scss` 현행              | TASK-003(값 맵 이전 기준)              |
| FIND-016 | 테마 확장 방향     | 사용자 로드맵: 테마를 컨셉×명암 매트릭스로 확장 예정(라이트/다크·블루프린트 라이트/다크·IDE 라이트/다크) — 테마명 규약·커스텀 테마 API 가 `{컨셉}-{명암}` 조합형 이름을 자연 수용해야 함(현 `ide-dark` 가 그 첫 사례)                          | 사용자 발언(2026-07-15)                                                | TASK-001(명명 규약)·TASK-005(API 설계) |

## 4. 대안·결정 로그

| ID      | 결정 상태 | 맥락                                      | 선택지                                                                                        | 결정                                                                                                                                                                                                                                                                                                                                                           | 근거                                                                                                                                             | 결과·트레이드오프                                                                  | 재검토 조건                           |
| ------- | --------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------- |
| DEC-001 | Accepted  | 변수화 방식                               | ①역할 토큰 전면화(하이브리드) ②컴포넌트별 토큰 전면화 ③갭 기반 최소                           | ① — 역할 카탈로그 신설, 전 컴포넌트가 역할 토큰만 소비. 역할로 못 잡는 극소수만 준역할 토큰, 모눈 패턴만 오버라이드 잔존                                                                                                                                                                                                                                       | 사용자 확정(2026-07-15)                                                                                                                          | 토큰 수십 개로 전면 커버. 특정 컴포넌트 1개만 다르게는 못 함(준역할 토큰으로 보완) | 준역할 토큰이 다수 필요해지면 ②재검토 |
| DEC-002 | Accepted  | 명도 스케일·공개 API                      | ①내부만 역할화 ②전면 브레이킹 ③브레이킹+deprecated alias                                      | ② — **재결정(2026-07-16)**: alias 폐지, 전면 브레이킹. 구 어휘(토큰·유틸 클래스)는 14.2 에서 발행 자체를 제거. 소비앱은 위키 대응표(TASK-007)로 직접 전환(사내 소비앱 opus 는 전환 완료). ~~③ alias 격리(2026-07-15 확정)~~                                                                                                                                    | 사용자 확정(2026-07-16) — "마이그레이션 wiki 올리는 대신 구버전 지원은 없애버리자"                                                               | 이중 어휘 기간 소멸·유지비 0. 14.2 는 스타일 브레이킹 릴리스                       | 외부 소비앱 등장 시                   |
| DEC-003 | Accepted  | 커스텀 테마                               | ①외부 앱 등록 1급 지원 ②비범위 ③라이브러리 내부 추가 용이화                                   | ③ — **재결정(2026-07-16)**: 외부 앱 주입 API 폐지. 사용자 의도는 라이브러리에 테마를 쉽게 추가하는 것(앱 커스텀은 테마 선택 후 style 파일 var 재정의로 충분). 내장 테마를 `SD_THEMES` 단일 목록으로 정의해 union·selector·provider 토글 중복 제거. ~~① 외부 등록 개방(2026-07-15)~~                                                                            | 사용자 확정(2026-07-16) — "커스텀을 열려는 게 아니라 라이브러리에 테마 쉽게 넣을 방법"                                                           | 외부 개방 없이 내부 중복만 해소. `SdThemeName` 개방형·주입 옵션 불필요             | 외부 소비앱이 테마 주입을 요구할 때   |
| DEC-004 | Accepted  | 토큰 명명                                 | ①무접두사 ②`--sd-` 전 토큰 통일 ③역할만 접두사                                                | ② — 팔레트 포함 전 토큰 `--sd-` 접두사, 구 이름은 alias 파일                                                                                                                                                                                                                                                                                                   | 사용자 확정(2026-07-15)                                                                                                                          | 충돌 원천 차단·소유권 명시. 이름 4자 증가                                          | 없음                                  |
| DEC-005 | Accepted  | 역할 카탈로그 상세(토큰 목록·이름·기본값) | TASK-001 산출물로 설계안 제시                                                                 | 사용자 확정(2026-07-15) — 카탈로그는 `scss/sd-tokens.md` 문서 및 `_variables.scss` `$sd` 맵 기준                                                                                                                                                                                                                                                               | 사용자 확정(2026-07-15)                                                                                                                          | 카탈로그 확정·발행 완료 → DEC-013 으로 어휘 구조 재편(TASK-001 재작업)             | 없음                                  |
| DEC-006 | Accepted  | 표면 패턴(모눈 등) 토큰화 가능성          | ①`background` 단축 유지+오버라이드 잔존 ②단축 금지 규약+패턴 토큰                             | ② — 전 컴포넌트 `background-color:` 통일, `--sd-bg-canvas-image`(기본 none) 신설, `_blueprint-surfaces.scss` 완전 삭제                                                                                                                                                                                                                                         | 사용자 확정(2026-07-15). 단축이 background-image 를 리셋하는 것이 오버라이드 잔존의 근본 원인                                                    | 테마 100% 값 맵 달성. 의도적 이미지 리셋 지점은 TASK-002 에서 개별 확인            | 단축 의존 리셋 다수 발견 시           |
| DEC-007 | Accepted  | 밀도(density)와 테마의 결합               | ①밀도를 테마 맵 소유(현행 ide-dark) ②fontSize 식 독립 축                                      | ② — `SdThemeProvider.density` signal(`"normal"\|"compact"`) + body `sd-density-compact` 토글 + localStorage 영속 + selector UI. 치수 토큰(gap·line-height·sheet pv/ph 등)은 밀도 그룹으로 분리, 테마 맵은 색·폰트 전용                                                                                                                                         | 사용자 확정(2026-07-15). 세션에서 밀도 요구가 색과 별개로 반복 조정된 실증                                                                       | 테마×밀도 조합 자유. 시각 검증 면이 3테마×2밀도로 증가                             | 밀도 단계 추가 요구 시                |
| DEC-008 | Accepted  | `rev-*`(반전) 어휘                        | ①rev 이름 유지+`--sd-` 이관 ②폐기 후 역할 대체                                                | ② — solid 면 위 텍스트는 `--sd-tx-{key}-solid`, 반전면은 `--sd-bg-inverse`+`--sd-tx-on-inverse` 급. 구 rev 는 alias 파일에만                                                                                                                                                                                                                                   | 사용자 확정(2026-07-15). "반전"은 테마에 따라 뒤집히는 상대 개념 — 명도 스케일 역전(FIND-004)과 동종. ide-dark 에서 rev-default 재정의 충돌 실증 | rev 소비처 분류는 기계 치환 불가 — TASK-002 에서 수동 판단                         | 없음                                  |
| DEC-009 | Accepted  | 상태(hover·active·selected·disabled) 표현 | ①컨트롤별 현행 혼재 유지 ②상태 토큰 통일+disabled 색 치환 단일 규약                           | ② — `--sd-bg-state-{hover,active,selected}`(오버레이 알파) 전 컨트롤 소비 + disabled 는 `--sd-{bg,tx,bd}-disabled` 색 치환으로 단일화(opacity 방식 폐기 — 자식 요소 이중 감쇠 부작용)                                                                                                                                                                          | 사용자 확정(2026-07-15). hover 원천 3종 혼재·select-item 리터럴 다크 비가시(FIND-002)·disabled 이원(anchor opacity vs button 색) 실증            | anchor disabled 시각 미세 변경 — 시각 등가 원칙(RISK-001)의 유일한 의도적 예외     | 없음                                  |
| DEC-010 | Accepted  | 포커스 표시                               | ①현행(`*:focus{outline:none}`+컴포넌트 재량) ②focus-ring 토큰+`:focus-visible` 전 컨트롤 규약 | ② — `--sd-focus-ring-{color,width,offset}` 신설, 전 컨트롤 `:focus-visible` 단일 규약(키보드 포커스만 링 표시). 컴포넌트 고유 포커스 표현은 색만 이 토큰에서 파생                                                                                                                                                                                              | 사용자 확정(2026-07-15). 현행은 포커스 시각이 컨트롤 재량이라 무표시 구간 존재. VSCode `focusBorder` 단일 토큰 선례                              | 키보드 접근성 개선. anchor 등 기존 무링 컨트롤에 링 생김(의도적 변경)              | 없음                                  |
| DEC-011 | Accepted  | 스크롤바 색 원천                          | ①`--sd-state-*` 재사용 ②전용 토큰                                                             | ② — `--sd-scrollbar-{thumb,thumb-hover,track}` 신설(기본값 현행 trans 등가, ide-dark 는 Dark 2026 `scrollbarSlider.*` 근사)                                                                                                                                                                                                                                    | 사용자 확정(2026-07-15). state 재사용 시 리스트 hover 톤과 스크롤바가 의도치 않게 결합                                                           | 카탈로그 +3 토큰. styles.scss 스크롤바 블록만 소비처                               | 없음                                  |
| DEC-012 | Accepted  | 테마 값 대비 검증 방식                    | ①육안 검증만 ②핵심 쌍 WCAG 대비 자동 테스트                                                   | ② — 테마별 핵심 fg/bg 쌍(10± — text/surface·solid-fg/bg·focus-ring/surface 등)의 대비율 unit 테스트(본문 4.5:1·대형/보조 3:1), 알파는 표면 합성 후 계산, 의도적 저대비는 명시 예외 목록. 검사 유틸 export 로 커스텀 테마도 검증 가능                                                                                                                           | 사용자 확정(2026-07-15). 세션의 비가시·과채도 실패가 전부 사후 육안 발견이었음 — 역할 토큰화로 쌍이 명시되어 기계 검산 가능해짐                  | 쌍·예외 목록 관리 필요(핵심만 유지해 형식화 방지)                                  | 예외 목록 비대 시                     |
| DEC-013 | Accepted  | 토큰·유틸 어휘 구조(1차 발행분 재편)      | ①키 우선 토큰 + 유틸 별도 어휘 ②키 우선 토큰 + 클래스=토큰명 ③속성 우선 단일 어휘             | ③ — 색 어휘(표면·필드·시맨틱·텍스트·보더·상태·disabled·busy 오버레이)를 `--sd-{bg\|tx\|bd}-…` 속성 우선으로 재편, 유틸 클래스명 = 토큰명에서 `--sd-` 만 뗀 것(`--sd-bg-primary-solid` ↔ `.bg-primary-solid`). 속성 세그먼트는 구 유틸 접두사 관례(bg·tx·bd) 승계. 비색상·컴포넌트 전용 그룹(팔레트·focus-ring·scrollbar·shadow·타이포·치수·z)은 그룹 구조 유지 | 사용자 확정(2026-07-15) — 어휘 이원화 거부, `--sd-` 는 소유 표식일 뿐 클래스와 토큰은 한 어휘여야 함                                             | 1차 발행 카탈로그(키 우선) 재작업 — 값 불변·이름만 재편. 클래스↔토큰 완전 1:1      | 없음                                  |

## 5. 영향도 분석

| ID         | 대상                                                                                                        | 영향 유형 | 영향 내용                                                                         | 위험도 | 연결 TASK        |
| ---------- | ----------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------- | ------ | ---------------- |
| IMPACT-001 | `scss/commons/_variables.scss`·`_colors.scss`·`_theme-variables.scss`·`_mixins.scss`                        | 수정      | 역할 카탈로그로 재편, `--sd-` 발행                                                | High   | TASK-001         |
| IMPACT-002 | `src/**/*.ts` 인라인 스타일(약 134파일 중 스타일 보유분)·`scss/controls/*.scss`·`scss/commons/_styles.scss` | 수정      | 소비 토큰 전면 교체 + 유틸 클래스 재생성                                          | High   | TASK-002         |
| IMPACT-003 | `scss/themes/*`                                                                                             | 수정/삭제 | 테마 값 맵 재구성, surfaces 오버라이드 2파일 삭제(DEC-006)                        | Medium | TASK-003         |
| IMPACT-004 | `scss/commons/_variables.scss`·`_colors.scss`·`_theme-variables.scss` 구 어휘 발행부                        | 삭제      | 구 토큰 발행 종료(브레이킹)                                                       | Medium | TASK-004         |
| IMPACT-005 | `sd-theme-provider.ts`·`sd-theme-selector.ts`·`provideSdAngular.ts`·`setupBgTheme.ts`                       | 수정      | 테마 개방형·목록 주입·`--background-color` 참조 갱신                              | Medium | TASK-005         |
| IMPACT-006 | `tests/features/theme/*.spec.ts` 외 스타일 검증 테스트                                                      | 테스트    | 클래스 토글·목록 주입 동작으로 갱신                                               | Medium | TASK-002·003·005 |
| IMPACT-007 | `plugins/sd/references/simplysm14` 9개 문서                                                                 | 수정      | 새 어휘·커스텀 테마 방법 반영                                                     | Low    | TASK-006         |
| IMPACT-008 | 외부 소비 앱                                                                                                | 설정      | 14.2 부터 구 어휘 미동작(브레이킹) — 위키 대응표로 전수 치환. 사내 opus 전환 완료 | High   | TASK-004·007     |

## 6. 가정 / OPEN / 리스크

### 6.1 가정

| ID      | 가정                                                               | 근거 수준                                                           | 틀렸을 때 영향                                 | 확인 방법                                  | 구현 차단 여부   |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------ | ---------------- |
| ASM-001 | 조사된 갭 3종(FIND-003)이 현행 테마 2종의 오버라이드 전부를 설명함 | 확인됨(`_ide-dark-surfaces`·`_blueprint-surfaces` 블록별 전수 대조) | 카탈로그에 역할 누락 → 준역할 토큰 추가로 흡수 | TASK-003 에서 오버라이드 삭제 후 시각 검증 | Non-blocking     |
| ASM-002 | ~~alias 재생성 가능~~ — DEC-002 재결정(alias 폐지)으로 소멸        | —                                                                   | —                                              | —                                          | 해소(2026-07-16) |

### 6.2 OPEN

| ID       | 질문·미정 사항                                                                                                                    | 선택지                           | 추천안                                                      | 차단 여부                                 | 해결 후 반영 위치 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------- | ----------------------------------------- | ----------------- |
| OPEN-001 | 역할 카탈로그 상세(토큰 목록·이름·라이트 기본값) — 설계 산출물 자체                                                               | TASK-001 에서 안 제시            | 표면 5·시맨틱 슬롯 3분해·상태·보더·그림자 골격(§7 TASK-001) | Non-blocking(TASK-001 정지 조건으로 확정) | DEC-005           |
| OPEN-002 | ~~`SdThemeName` 개방 방식~~ — DEC-003 재결정(외부 개방 폐지)으로 소멸. `SdThemeName` 은 내장 `SD_THEMES` 목록에서 파생(개방 없음) | —                                | —                                                           | 해소(2026-07-16)                          | DEC-003           |
| OPEN-003 | ~~`_blueprint-surfaces.scss` 의 `sd-crud-detail ... .main-align-end` 국소 패치 처리~~                                             | ③삭제로 확정(사용자, 2026-07-16) | —                                                           | 해소(2026-07-16)                          | TASK-003          |
| OPEN-004 | ~~alias 배포 방식~~ — DEC-002 재결정(alias 폐지)으로 소멸                                                                         | —                                | —                                                           | 해소(2026-07-16)                          | DEC-002           |

### 6.3 리스크

| ID       | 리스크                                                 | 가능성 | 영향   | 예방·완화                                                                          | 조기 경고 신호               | 대응                  |
| -------- | ------------------------------------------------------ | ------ | ------ | ---------------------------------------------------------------------------------- | ---------------------------- | --------------------- |
| RISK-001 | 전 컴포넌트 재작성 중 시각 회귀(색·계층 미세 차이)     | High   | Medium | 토큰 기본값을 현행 값과 1:1 등가로 정의(값 불변·이름만 교체) 후 테마 재구성과 분리 | 데모 화면 대조에서 차이 발견 | 해당 토큰 기본값 수정 |
| RISK-002 | 역할로 안 잡히는 케이스 누적 → 준역할 토큰 남발        | Medium | Medium | 준역할 토큰 추가 시 카탈로그 문서에 근거 기록, 다수 발생 시 DEC-001 재검토         | 준역할 토큰 5개 초과         | 사용자와 방식 재논의  |
| RISK-003 | 소비앱의 구 어휘 잔존 상태로 14.2 적용 → 무스타일 파손 | Medium | High   | 위키 대응표(TASK-007) 선행 + 배포 게이트(BLOCK-005). 사내 opus 는 전수 전환 완료   | 소비앱 grep 에 구 어휘 매치  | 대응표로 전수 치환    |
| RISK-004 | 문서 갱신 누락으로 LLM/개발자가 구 어휘 계속 사용      | Medium | Low    | FIND-007 의 9파일 전수 갱신 + grep 재검                                            | 문서 내 구 어휘 grep 매치    | 추가 갱신             |

## 7. 작업 분해

### TASK-001: 역할 토큰 카탈로그 설계·발행

- TASK 상태: Done (2026-07-15) (DEC-013 속성 우선 어휘 재편 반영)
- 목적: 테마 작성의 단일 진입점이 되는 `--sd-*` 역할 토큰 어휘 확정·발행.
- 연결 근거: DEC-001·DEC-004·DEC-013·FIND-001·FIND-003·FIND-011·FIND-012·FIND-013·FIND-014·CONSTRAINT-006·CONSTRAINT-007·SCOPE-001
- 산출물: 카탈로그 정의(scss 맵 + 발행 mixin) + 카탈로그 문서(토큰·역할·기본값 표) + 발행 spec 갱신.
- 변경 대상:
  - 반드시 변경: `scss/commons/_variables.scss`·`_colors.scss`·`_theme-variables.scss`·`_mixins.scss`, `scss/sd-tokens.md`, `tests/features/theme/sd-tokens.spec.ts`
  - 변경 가능: `scss/styles.scss`
  - 변경 금지: `src/**`(다음 TASK), `scss/themes/**`(TASK-003)
- 현재 상태: 1차 카탈로그가 키 우선 어휘(`--sd-primary-solid-bg`·`--sd-surface-canvas`·`--sd-text-muted` 등)로 발행됨 — DEC-013 속성 우선으로 재편 필요. 구 스케일 어휘(`--theme-*` 등)는 병행 발행 중.
- 작업 내용:
  - **어휘 규약(DEC-013)**: 색 어휘는 `--sd-{bg|tx|bd}-…` 속성 우선. 유틸 클래스명 = 토큰명에서 `--sd-` 만 뗀 것. hover 변형은 `-hover` 접미.
  - 역할군 골격: `--sd-bg-{canvas,canvas-image,control,elevated,overlay,sheet,inverse}` / 시맨틱 `--sd-bg-{key}-{solid,subtle}`(+`-hover`)·`--sd-tx-{key}-{solid,subtle}`·`--sd-bd-{key}-{solid,subtle}`(+solid `-hover`)·`--sd-tx-{key}`(+`-hover`) / `--sd-tx-{strong,default,muted,faint,on-inverse}` / `--sd-bd-{hairline,soft,default,strong,emphasis}` / `--sd-bg-state-{hover,active,selected}` / `--sd-{bg,tx,bd}-disabled` / `--sd-bg-busy-overlay` / `--sd-shadow-*` / 타이포·간격·radius·z-index 등 비색상 토큰은 그룹 구조 유지로 `--sd-` 이관.
  - **필드 표면 역할 신설**: `--sd-bg-field`·`--sd-bd-field` — `--theme-secondary-lightest` 겸직 관례(FIND-011) 해체. secondary 는 순수 시맨틱 색으로 복귀.
  - **fg/bg 원천 이원화 규칙**: 배경·표면 = 팔레트, 텍스트·보더 = 흰/검 알파 허용(CONSTRAINT-007) — 다크·라이트 양방향에서 표면 위 텍스트가 표면색과 독립 축으로 동작(ide-dark 정규화에서 검증된 방식).
  - **rev 어휘 폐기**(DEC-008): `--sd-tx-{key}-solid`·`--sd-bg-inverse`·`--sd-tx-on-inverse` 로 대체 — rev 계열 이름은 카탈로그에 넣지 않음(alias 전용).
  - **상태 토큰 확정**(DEC-009): `--sd-bg-state-{hover,active,selected}` 오버레이 + `--sd-{bg,tx,bd}-disabled` — disabled 는 색 치환 단일 규약(opacity 폐기).
  - **포커스 링 토큰**(DEC-010): `--sd-focus-ring-{color,width,offset}` — 골격의 `--sd-focus-accent` 를 이 3토큰으로 대체.
  - **스크롤바 토큰**(DEC-011): `--sd-scrollbar-{thumb,thumb-hover,track}` — styles.scss 스크롤바 블록 전용.
  - **체이닝 금지/재선언 규칙 명문화**(CONSTRAINT-006): 카탈로그 토큰 간 var() 참조 체인을 두지 않거나, 두면 테마 맵이 체인 토큰을 필수 재선언(sheet.pv/ph 사례 일반화).
  - **타이포 파생 토큰**: 아이콘 크기 `calc(line-height − shift)` 구조(FIND-013)를 카탈로그 규약으로 수용(`--sd-icon-*`), 컴포넌트 config 의 인라인 var 지정 금지 원칙 포함.
  - **표면 패턴 토큰**: `--sd-bg-canvas-image`(기본 none) — blueprint 모눈 등 배경 패턴의 값 맵화(DEC-006).
  - **밀도 토큰 그룹 분리**(DEC-007): gap·line-height·sheet pv/ph 등 치수 토큰을 밀도 그룹으로 — `sd-density-compact` 가 이 그룹만 덮고 테마 맵엔 치수 없음(FIND-012 재선언 규칙 함께 적용).
  - 라이트 기본값은 현행 값과 시각 등가로 정의(RISK-001 완화).
  - 재작업 범위: 1차 발행분의 **이름 재편·값 불변**(`$sd` 맵 구조·`sd-tokens.md`·`sd-tokens.spec.ts` 동시 갱신). 어휘 구조는 DEC-013 로 확정 — 추가 사용자 확정 없이 진행.
- 선행 작업: 없음
- 수용 기준: AC-001
- 테스트·검증: TEST-001, GATE-001
- 원천 자료 반영: 카탈로그 문서 신규 작성(TASK-006 에서 references 로 정식 편입).
- 롤백 영향: 신규 발행뿐 — 구 토큰 미제거 시점이라 무해.
- 구현 시 주의: alias 관련 코드 혼입 금지(CONSTRAINT-001).
- 정지 조건: 재작업 중 역할 신설·삭제·값 변경이 필요해지면 중단·확정(이름 재편 범위 밖).

### TASK-002: 내부 소비 전면 전환 + 유틸 재생성

- TASK 상태: Done (2026-07-16) (준역할 4건 사용자 확정·카탈로그 편입: `--sd-bg-backdrop`·`--sd-bg-track`·`--sd-bg-busy-indicator`·`--sd-tx-on-inverse-{muted,disabled}`. 소비 순도·유틸 어휘 spec 신설. 소비 앱 simplysm-opus 구 어휘 55곳 병행 전환. 내부 화면 시각 대조는 TASK-003 의 3테마 전 화면 대조에서 수행)
- 목적: 전 컴포넌트·공통 SCSS 가 역할 토큰만 소비하게 재작성.
- 연결 근거: DEC-001·DEC-002·FIND-002·FIND-008·SCOPE-002·SCOPE-003
- 산출물: src 인라인 스타일·`scss/controls/*`·`scss/commons/_styles.scss` 전환분, 역할 기반 유틸 클래스.
- 변경 대상:
  - 반드시 변경: `src/**` 스타일 보유 컴포넌트, `scss/controls/*.scss`, `scss/commons/_styles.scss`, 리터럴 4곳(FIND-002)
  - 변경 가능: 관련 컴포넌트 테스트
  - 변경 금지: `scss/themes/**`, 컴포넌트 템플릿·로직(스타일 소비 어휘 외 의미 변경 금지)
- 현재 상태: 전역 스케일 토큰 직접 소비 + 리터럴 4곳.
- 작업 내용: 소비 토큰 교체(스케일→역할), select-item·sheet·busy 리터럴을 역할 토큰으로 편입, 유틸 클래스 재생성(DEC-013 — 클래스명 = 토큰명에서 `--sd-` 뗀 것, bg/tx/bd 색 토큰 전수 기계 생성하되 `-hover` 변형·`bg-canvas-image` 는 미생성, 방향 보더 변형은 `.bd{t,r,b,l}-…` 로 동일 어휘 재생성. gap·radius·폰트 등 비색상 유틸은 클래스명 유지·참조만 `--sd-*` 교체). **`background` 단축 금지 규약 적용(DEC-006)** — 전 컴포넌트 `background-color:` 통일, 의도적 이미지 리셋 지점은 개별 확인·명시 처리. **rev 소비처 분류 전환(DEC-008)** — rev 사용처를 grep 전수 추출해 `--sd-tx-{key}-solid` / `--sd-tx-on-inverse` 로 수동 분류(기계 치환 금지). **상태 스타일 통일(DEC-009)** — hover/active/selected 를 `--sd-bg-state-*` 소비로, disabled 를 색 치환 규약으로 전환(anchor opacity 폐기 — 의도적 시각 변경으로 기록). **포커스 규약(DEC-010)** — `*:focus{outline:none}` 를 `:focus-visible` 링 규약으로 대체, 전 컨트롤 적용.
- 선행 작업: TASK-001
- 수용 기준: AC-002
- 테스트·검증: TEST-002, GATE-002
- 원천 자료 반영: 이연(TASK-006 에서 어휘 확정본 기준 일괄 — 중복 갱신 방지. BLOCK-004 로 완료 선언 차단).
- 롤백 영향: 컴포넌트 단위 revert 가능(토큰 발행은 TASK-001 산출로 독립).
- 구현 시 주의: 시각 등가 유지(RISK-001) — 값 변경 없이 참조만 교체. 역할 미부합 발견 시 임의 준역할 토큰 신설 말고 목록화 후 확정.
- 정지 조건: 역할로 못 잡는 케이스 5개 초과 시 중단·보고(RISK-002).

### TASK-003: 테마 값 맵 재구성·오버라이드 철거

- TASK 상태: Done (2026-07-16) (장식 토큰 13종 사용자 확정·카탈로그 편입: `--sd-card-{bd,bd-active,shadow,shadow-hover}`·`--sd-modal-{bd,header-bg,header-tx,header-tx-muted}`·`--sd-dropdown-bd`·`--sd-bg-sheet-image`·`--sd-sheet-shadow`·`--sd-permission-group-{bg,tx}` + 소비 지점 추가(FIND-003 ③ 해소, src 변경 금지 예외 확정). OPEN-003 삭제 확정. 블루프린트 틴트는 blue-900 근사 리터럴 rgb(28,57,142) 확정. 밀도 compact 값 맵(`_density.scss`·`.sd-density-compact`) 발행 — 치수는 테마 맵에서 제거. DEC-012 대비 게이트 신설(`getWcagContrastRatio` export + `theme-contrast.spec.ts`, danger-solid 2건 명시 예외). 3테마×2밀도 데모 시연 통과)
- 목적: ide-dark·블루프린트를 역할 토큰 값 맵만으로 재구성, 셀렉터 오버라이드 철거.
- 연결 근거: DEC-001·DEC-006·FIND-003·FIND-004·FIND-010·FIND-015·SCOPE-004
- 산출물: `_variables-ide-dark.scss`·`_variables-blueprint.scss` 역할 맵 재작성(모눈은 `--sd-bg-canvas-image` 값으로), `_ide-dark-surfaces.scss`·`_blueprint-surfaces.scss` 삭제(DEC-006, OPEN-003 판단 포함).
- 변경 대상:
  - 반드시 변경: `scss/themes/*`, `scss/styles.scss`(surfaces import 정리)
  - 변경 가능: `scss/commons/_theme-variables.scss`(테마 맵 발행부)
  - 변경 금지: `src/**` 컴포넌트 스타일(TASK-002 완료본 불변)
- 현재 상태: 테마 = 스케일 재정의 + 언레이어드 셀렉터 오버라이드 2파일.
- 작업 내용: 오버라이드 각 블록을 역할 토큰 값으로 이전(예: ide-dark modal/dropdown → `--sd-bg-{elevated,overlay}`, 시맨틱 solid 버튼 → `--sd-bg-{key}-solid` 계열 재매핑), OPEN-003 원본 확인·처리. ide-dark 값 이전 기준은 FIND-015 확정 상태(현행 `_variables-ide-dark.scss`·`_ide-dark-surfaces.scss`). ide-dark 맵의 치수 항목(gap·line-height·sheet pv/ph·topbar height)은 테마에서 제거하고 밀도 compact 값으로 이관(DEC-007). **대비 자동 게이트 신설(DEC-012)** — 대비 계산 유틸 + 테마별 핵심 쌍 spec 작성, 3테마 전건 통과.
- 선행 작업: TASK-002
- 수용 기준: AC-003
- 테스트·검증: TEST-003, GATE-002
- 원천 자료 반영: 이연(TASK-006 일괄 — 사유 동일. BLOCK-004).
- 롤백 영향: 삭제 파일 revert 로 복구 가능.
- 구현 시 주의: 3테마 × 주요 컴포넌트 시각 대조 필수(ASM-001 검증 지점).
- 정지 조건: 역할 맵으로 재현 불가한 오버라이드 발견 시 중단·보고.

### TASK-004: 구 어휘 발행 제거 (전면 브레이킹)

- TASK 상태: Done (2026-07-16) (`$vars` 맵·구 `--color-*` 발행·`writeVars($vars)` 호출 제거. 구 어휘 발행 부재 단언 spec 추가, 워크스페이스 소비 잔존 0건 확인)
- 목적: 구 어휘(스케일 토큰·구 팔레트명)의 발행을 완전 제거해 14.2 를 단일 어휘로 확정.
- 연결 근거: DEC-002(재결정)·CONSTRAINT-001·SCOPE-005
- 산출물: `_variables.scss` 의 `$vars` 맵 삭제, `_colors.scss` 의 구 `--color-*` 발행 제거(`--sd-color-*` 만 유지), `_theme-variables.scss` 의 구 어휘 발행 호출 제거.
- 변경 대상:
  - 반드시 변경: `scss/commons/_variables.scss`·`_colors.scss`·`_theme-variables.scss`
  - 변경 가능: `tests/features/theme/*.spec.ts`(발행 제거 검증 보강)
  - 변경 금지: `src/**`(이미 신 어휘만 소비), `scss/themes/**`(TASK-003 완료본 — 신 어휘만 사용 상태여야 함)
- 현재 상태: 구 어휘 병행 발행 중(`$vars`·`--color-*`), 소비는 0건(TASK-002 완료).
- 작업 내용: 발행부 삭제 → 전 워크스페이스 grep 으로 구 어휘 참조 잔존 0건 확인(GATE-003 선행 수행) → 발행 CSS 에 구 토큰 부재 단언 spec 추가.
- 선행 작업: TASK-003(테마가 구 스케일 재정의를 쓰는 동안은 발행 제거 불가)
- 수용 기준: AC-004
- 테스트·검증: TEST-004, GATE-002, GATE-003
- 원천 자료 반영: 카탈로그 문서(sd-tokens.md)의 "구 스케일 어휘는 alias 전용" 문구를 "발행 종료(14.2 브레이킹)"로 정정.
- 롤백 영향: 발행부 revert 로 복구 가능.
- 구현 시 주의: `--sd-color-*` 팔레트는 유지(카탈로그 정본). 브레이크포인트 등 비토큰 scss 변수는 대상 아님.
- 정지 조건: 구 어휘 참조 잔존 발견 시 삭제 전 중단·전환 먼저.

### TASK-005: 라이브러리 내부 테마 추가 용이화 + 밀도 축

- TASK 상태: Done (2026-07-16) (DEC-003 재결정 — 외부 개방 API 폐지, 내장 테마 단일 목록화로 전환. 밀도 축·setupBgTheme 역할 토큰 전환 포함)
- 목적: 라이브러리에 새 테마를 쉽게 추가하도록 TS 측 테마 이름 중복(union·selector 배열·provider 토글)을 단일 목록으로 통합. 외부 앱 주입 API 는 도입 안 함.
- 연결 근거: DEC-003(재결정)·DEC-007·FIND-006·FIND-009·CONSTRAINT-004·SCOPE-006·SCOPE-008
- 산출물: 내장 테마 단일 정의(`SD_THEMES`) → `SdThemeName` 목록 파생, provider 클래스 토글을 목록 순회로 일반화(`sd-theme-{value}`), selector 가 목록 렌더, `setupBgTheme` 를 `--sd-bg-canvas` 역할 토큰 override 로 전환(`lightness` 인자 제거), **밀도 축**(`density` signal + `sd-density-compact` 토글 + localStorage 영속 + selector `compact` 스위치 — DEC-007).
- 변경 대상:
  - 반드시 변경: `sd-theme-provider.ts`·`sd-theme-selector.ts`·`provideSdAngular.ts`·`setupBgTheme.ts`
  - 변경 금지: scss(테마 값 맵은 TASK-003)
- 현재 상태: union 3종 고정·selector 배열 하드코딩·provider 토글 개별 하드코딩(FIND-006).
- 작업 내용: `SD_THEMES` 단일 정의 → `SdThemeName` 파생 → provider 가 목록 순회로 `sd-theme-{value}` 토글(light 은 :root 기본이라 클래스가 붙어도 무효) → selector 가 목록 렌더 + `compact` 스위치 → localStorage 복원 시 미등록 테마명은 경고 후 기본 유지(silent skip 금지), 비유효 density 값 무시. `setupBgTheme` 는 `--sd-bg-canvas` 를 `--sd-bg-{theme}-subtle` 로 override.
- 선행 작업: TASK-003
- 수용 기준: AC-005·AC-007
- 테스트·검증: TEST-005, GATE-002
- 원천 자료 반영: 이연(TASK-006 일괄. BLOCK-004).
- 롤백 영향: TS 4파일 revert 로 복구.
- 구현 시 주의: 내장 3테마 무설정 동작 유지. SSR 가드 유지.
- 정지 조건: —(OPEN-002 해소 — 외부 개방 폐지로 무의미).

### TASK-006: references/simplysm14 문서 갱신

- TASK 상태: Done (2026-07-16) (features.md SdThemeProvider/Selector 구 API(dark/blueprint boolean) → theme/density/fontSize·SD_THEMES 파생으로 정정, 역할 토큰 카탈로그·테마 커스터마이즈/추가 가이드 편입. Label/Note/Progress·switch·checkbox·setupBgTheme·provideSdAngular 등록 서술을 `--sd-*` 최종 어휘로 치환. client-component·client-shared-data 유틸 예시(tx-theme-_/bg-_-lightest/bd-trans-*) 새 어휘 치환. 5+1파일 구 어휘 grep 0건. sd-verify 독립 대조 통과(README 개요 gloss 테마명 1건 정정 반영))
- 목적: LLM/개발자 참조 문서를 새 어휘·새 API 기준으로 정합화.
- 연결 근거: 사용자 지시·FIND-007·RISK-004·SCOPE-007
- 산출물: 영향 9파일 갱신 + 카탈로그 문서 정식 편입 + 커스텀 테마 작성 가이드.
- 변경 대상:
  - 반드시 변경: `apis/angular/features.md`(stale 정정 포함)·`controls.md`·`README.md`, `manuals/client-component.md`(유틸 클래스 다수)·`client-shared-data.md`(`tx-theme-*` 1건)
  - 변경 가능: `apis/angular/overlay.md`, `manuals/client-crud.md`·`client-demo.md`(실측상 컴포넌트 `theme` 입력값·레이아웃 유틸만 언급 — 최종 어휘 기준 grep 후 판단). `apis/sd-cli/sd-config-types.md` 는 PWA `theme_color` 만 언급이라 대상 아님(실측)
  - 변경 금지: 타 주제 문서
- 현재 상태: 구 어휘 64건 + features.md 는 구 API(boolean signal) 서술.
- 작업 내용: 구 어휘·구 API 전수 치환, 역할 카탈로그 표·테마 작성 절차(값 맵 + 등록) 수록, 14.2 브레이킹(구 어휘 발행 종료) 명시.
- 선행 작업: TASK-004·TASK-005
- 수용 기준: AC-006
- 테스트·검증: TEST-006
- 원천 자료 반영: 이 TASK 자체가 문서 반영.
- 롤백 영향: 문서 revert 무해.
- 구현 시 주의: sd-docs·sd-manual 스킬 형식 준수(해당 스킬 트리거 시).
- 정지 조건: 코드 최종형과 불일치 발견 시 코드 확인 후 문서 작성(문서 선행 금지).

### TASK-007: 원격 위키 소비앱 안내 페이지

- TASK 상태: Done (2026-07-16) (원격 위키 신규 루트 페이지 `simplysm14-style-vocabulary` 기록 — 14.2 어휘 규칙(상태형)+구(14.1)→새 대응표. 구 어휘 정의는 사용자 승인 하에 HEAD `_variables.scss` `$vars`(14.1 As-Is)에서 팔레트 단계·rgba 알파로 확보해 카탈로그와 정확 대조: A접두사·B시맨틱스케일·C무채텍스트알파·D무채보더zinc·E반투명오버레이(용도별 역할분해)·F단발·G유틸 7군. 절차형 아닌 상태 규칙 형식(관문4)·버전범위 명시(관문2). 페이지 조회로 어휘 정합 확인)
- 목적: 소비앱이 14.1→14.2 를 올릴 때 할 일을 원격 공용 위키에서 얻게 함.
- 연결 근거: 사용자 지시(2026-07-16)·DEC-002(재결정)·SCOPE-009
- 산출물: 원격 위키 페이지 1건 — "simplysm@14.2 스타일 어휘 규칙 + 구(14.1) 어휘 대응표". 형식은 절차형이 아닌 **상태 규칙**(위키 내규 관문 4 준수): 새 `--sd-*` 토큰·유틸 어휘 규칙, 구→새 전수 대응표(토큰·유틸 클래스), "구 어휘는 14.2 에서 발행 종료(브레이킹) — 대응표로 전수 치환" 경계, 커스텀 테마 등록 방법 요약.
- 변경 대상:
  - 반드시 변경: 원격 위키(신규 topic, 적절한 hub 하위 편입)
  - 변경 가능: 없음
  - 변경 금지: 코드
- 현재 상태: 위키에 simplysm 버전 안내 페이지 부재(전수 확인 2026-07-16).
- 작업 내용: TASK-006 완료본(references 문서·카탈로그)을 원천으로 대응표 작성 → 위키 기록(버전 범위 `simplysm@14.2` 명시 — 관문 2).
- 선행 작업: TASK-006(어휘 최종형·문서 확정 후)
- 수용 기준: AC-008
- 테스트·검증: TEST-007
- 원천 자료 반영: [N/A] — 이 TASK 산출물이 위키 자체.
- 롤백 영향: 위키 페이지 delete 로 원상.
- 구현 시 주의: 요약은 라우팅 전용, 본문에 근거·버전 전제 명시. 절차 서술("1. 올린다 2. 바꾼다")로 쓰지 않음.
- 정지 조건: 대응표가 코드 최종형과 불일치하면 중단·코드 재확인.

## 8. 실행 순서 / 의존관계

| 순서 | 작업     | 병렬 가능             | 순서 근거                                                        | 피해야 할 순서                                  |
| ---- | -------- | --------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| 1    | TASK-001 | 불가(전체 선행)       | 카탈로그가 모든 후속의 어휘 원천                                 | 카탈로그 미확정 상태로 소비 전환 착수           |
| 2    | TASK-002 | 불가                  | 컴포넌트가 역할 토큰을 소비해야 테마 맵이 효력 가짐              | TASK-003 을 먼저 하면 오버라이드 삭제 검증 불가 |
| 3    | TASK-003 | 불가                  | 오버라이드 철거는 소비 전환 완료가 전제                          | —                                               |
| 4    | TASK-004 | TASK-005 와 병렬 가능 | 테마가 구 스케일 재정의를 벗어난(TASK-003) 뒤에만 발행 제거 가능 | TASK-003 이전 발행 제거(테마 참조 파손)         |
| 5    | TASK-005 | TASK-004 와 병렬 가능 | 커스텀 테마는 역할 맵 체계(TASK-003) 완성 후 의미 있음           | —                                               |
| 6    | TASK-006 | 불가                  | 문서는 코드 최종형 기준                                          | 코드 확정 전 문서 선행                          |
| 7    | TASK-007 | 불가(최후)            | 위키 대응표는 문서·어휘 최종형(TASK-006) 기준                    | 어휘 확정 전 위키 선행(틀린 표 배포)            |

## 9. 수용 기준 / 테스트 전략 / 검증 게이트

### 9.1 수용 기준

| ID     | 연결 작업 | 조건                       | 관찰 가능한 결과                                                                                                                             | 예외·오류 케이스                                                           |
| ------ | --------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| AC-001 | TASK-001  | 카탈로그 확정·발행         | `:root` 에 `--sd-*` 전 역할 토큰 발행, 라이트 기본값이 현행 시각 등가                                                                        | 사용자 미확정 상태로 발행 시 실패                                          |
| AC-002 | TASK-002  | 내부 소비 100% 역할 토큰   | src·scss/controls·commons 에서 구 토큰·색 리터럴 grep 0건(허용 예외 제외)                                                                    | 다크에서 select-item hover 가시화(리터럴 결함 해소)                        |
| AC-003 | TASK-003  | 테마 = 값 맵               | `_ide-dark-surfaces.scss`·`_blueprint-surfaces.scss` 부재, 3테마 시각 재현(모눈 포함, 현행 디자인 의도 유지)                                 | 역할 맵으로 재현 불가 발견 시 중단·보고                                    |
| AC-004 | TASK-004  | 구 어휘 발행 0건           | 발행 CSS(`:root`·theme-variant)에 구 토큰(`--theme-*`·`--trans-*`·`--text-trans-*`·`--color-*`·무접두 치수) 부재, 워크스페이스 참조 잔존 0건 | 잔존 참조 발견 시 삭제 전 중단                                             |
| AC-005 | TASK-005  | 내장 테마 단일 목록화 동작 | 내장 테마가 `SD_THEMES` 한 곳에 정의되고 `SdThemeName`·selector 렌더·body 클래스 토글이 모두 그 목록에서 파생·구동                           | 미등록 저장 테마명 복원 시 명시 처리(경고 후 기본 유지 — silent skip 금지) |
| AC-007 | TASK-005  | 밀도 독립 동작             | 어떤 테마에서든 밀도 compact/normal 전환·영속화, 테마 맵에 치수 항목 0건                                                                     | 3테마×2밀도 대표 화면 시각 검증(TEST-003 에 면 추가)                       |
| AC-006 | TASK-006  | 문서 정합                  | 9파일 내 구 어휘·구 API 잔존 0건, 커스텀 테마 가이드 존재                                                                                    | —                                                                          |
| AC-008 | TASK-007  | 위키 안내 페이지 존재      | "14.2 어휘 규칙 + 14.1 대응표" 페이지가 위키에서 검색·조회되고, 대응표가 최종 코드 어휘와 일치                                               | 코드와 대응표 불일치 시 실패                                               |

### 9.2 테스트 전략

| ID       | 연결 작업 | 수준             | 케이스                                                                                                           | 파일·명령                                              | 통과 기준                         |
| -------- | --------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------- |
| TEST-001 | TASK-001  | unit + typecheck | writeVars 접두사 발행·카탈로그 키 전수                                                                           | `pnpm test --project angular`, `pnpm check -t angular` | 전건 통과                         |
| TEST-002 | TASK-002  | unit + manual    | 컴포넌트 spec 갱신분 + 라이트 데모 시각 대조                                                                     | `pnpm test --project angular` + 데모 화면(사용자 실행) | 통과 + 시각 등가                  |
| TEST-003 | TASK-003  | manual + unit    | 3테마 × 2밀도 × 주요 컴포넌트(버튼·모달·드롭다운·카드·시트·권한표) 대조 + 테마별 핵심 쌍 WCAG 대비 spec(DEC-012) | 데모 화면(사용자 실행) + `pnpm test --project angular` | 디자인 의도 재현 + 대비 전건 통과 |
| TEST-004 | TASK-004  | unit             | 발행 CSS 에 구 토큰 선언 부재 단언(spec) + angular 전체 테스트 회귀 없음                                         | `packages/angular/tests/features/theme/*.spec.ts`      | 전건 통과                         |
| TEST-005 | TASK-005  | unit             | 커스텀 테마 등록·토글·selector 렌더·localStorage 복원·미등록명 처리                                              | `packages/angular/tests/features/theme/*.spec.ts` 갱신 | 전건 통과                         |
| TEST-006 | TASK-006  | manual           | 문서 내 구 어휘 grep                                                                                             | grep 구 토큰·구 클래스명                               | 0건                               |
| TEST-007 | TASK-007  | manual           | 위키 페이지 조회 + 대응표 ↔ 카탈로그(sd-tokens.md)·유틸 spec 어휘 대조                                           | wiki CLI read + 대조                                   | 전항 일치                         |

### 9.3 검증 게이트

| ID       | 시점             | 검사 항목                           | 명령·방법                                                    | 통과 조건 | 실패 시 행동      |
| -------- | ---------------- | ----------------------------------- | ------------------------------------------------------------ | --------- | ----------------- |
| GATE-001 | TASK-001 완료 시 | 카탈로그 사용자 확정 여부           | 대화 확인                                                    | 확정됨    | 발행 보류·재제안  |
| GATE-002 | 각 TASK 완료 시  | typecheck+lint+angular 테스트       | `pnpm check --fix -t angular`, `pnpm test --project angular` | 무오류    | 원인 규명 후 수정 |
| GATE-003 | 전체 완료 전     | 구 어휘 잔존 전수 grep(발행부 포함) | grep 구 토큰명·구 클래스명                                   | 0건       | 잔존분 전환       |

## 10. Rollout / Rollback

- Rollout 필요 여부: 필요 — npm 배포 패키지. **14.2.0 스타일 브레이킹 릴리스**(구 어휘 발행 종료, 완충 없음 — DEC-002 재결정).
- Rollout 절차: plan 전체 완료 후 루트 버전 14.2.0 배포(`pnpm pub`, 사용자 수행). 릴리스 노트에 브레이킹 고지 + 위키 안내 페이지(TASK-007) 링크.
- Rollback 가능 여부: 가능.
- Rollback 절차: TASK 단위 git revert(§7 각 TASK 롤백 영향 참조). 배포 후엔 이전 버전 재설치.
- Rollback 불가 지점: 없음(데이터 마이그레이션 없음. localStorage `sd-theme` 값은 문자열 그대로 호환 — FIND-009).
- 관측 지표: 소비 앱 빌드·시각 회귀 리포트.
- 중단 조건: RISK-002 신호(준역할 토큰 5개 초과) 또는 TASK-003 재현 불가 발견.

## 11. Traceability 규칙

- 모든 `SCOPE` 는 최소 1개 `TASK` 와 연결함. (001→T1, 002·003→T2, 004→T3, 005→T4, 006→T5, 007→T6, 008→T5, 009→T7)
- 모든 `TASK` 는 최소 1개 근거(`FIND`/`DEC`/`SCOPE`)와 연결함.
- 모든 `TASK` 는 최소 1개 `AC` 와 1개 검증 방법(`TEST` 또는 `GATE`)을 가짐.
- 연결되지 않은 작업은 삭제하거나 근거를 추가함.

## 12. 구현 전 차단 조건

| ID        | 차단 조건                                                          | 관련 OPEN/ASM/RISK | 필요한 결정                        | 해결 담당 | 해결 후 갱신 위치 |
| --------- | ------------------------------------------------------------------ | ------------------ | ---------------------------------- | --------- | ----------------- |
| BLOCK-001 | 카탈로그 설계안 미확정 상태의 TASK-001 발행                        | OPEN-001/DEC-005   | 토큰 목록·이름·기본값 승인         | 사용자    | DEC-005→Accepted  |
| BLOCK-002 | ~~OPEN-002 미확정 상태의 TASK-005 착수~~ — DEC-003 재결정으로 해소 | OPEN-002           | 없음                               | —         | 해소(2026-07-16)  |
| BLOCK-003 | ~~OPEN-004(alias 방식)~~ — DEC-002 재결정으로 해소                 | OPEN-004           | 없음                               | —         | 해소(2026-07-16)  |
| BLOCK-004 | TASK-006 미완료 상태의 전체 완료 선언                              | RISK-004           | 없음(이연 문서 반영의 완결 게이트) | 구현자    | TASK-006 Done     |
| BLOCK-005 | TASK-007(위키 대응표) 미완료 상태의 14.2.0 배포                    | IMPACT-008         | 없음(브레이킹 안내 선행 게이트)    | 구현자    | TASK-007 Done     |
