# Plan: angular ide-dark VS Code Dark 2026 — surface 토큰 분리 재설계

## 0. 메타데이터

| 항목      | 내용                                                                                                                                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID   | PLAN-260716205756                                                                                                                                                |
| Plan 상태 | Done (2026-07-16)                                                                                                                                                |
| 생성 시각 | 2026-07-16 20:57:56                                                                                                                                              |
| 제목      | angular ide-dark VS Code Dark 2026 — surface 토큰 분리 재설계                                                                                                    |
| 대상 범위 | `packages/angular` — surface 역할 토큰(scss commons, themes) + surface 를 칠하는 컴포넌트 + 테마 테스트, 문서. 검증은 client-admin dev(`localhost:40080`) 브라우저 |
| 근거 자료 | 사용자 발언(2026-07-16), 2026-dark.json 실값, VS Code 위젯 소스 CSS, 현행 scss, 브라우저 실측(playwright-cli), control 사용처 Grep                                    |
| 작성 원칙 | 근거 없는 항목은 `[OPEN]`. 각 part 는 VS Code 실소스 ↔ 우리 소스 대조 + 브라우저 실측으로 검증. 추측 금지                                                        |
| 실행 규약 | **구현은 별도 세션(sd-dev)** — 이 문서는 plan 전용. TASK 는 §8 순서대로, 각 TASK 는 VS Code 소스 대조 → 구현 → 브라우저 실측 → `Done (yyyy-MM-dd)`               |

## 1. 목표, 문제, 완료 정의

- 목표: 하나로 뭉친 `--sd-bg-control` 을 **VS Code 가 실제로 구분하는 면(面)별 토큰으로 분리**하고(=control 삭제 + 새 var 신설), 각 컴포넌트가 올바른 면을 칠하게 재배선해 ide-dark 를 VS Code Dark 2026 과 정합시킴.
- 해결할 문제:
  - `--sd-bg-control` 하나가 **성격 다른 면들을 겸직** — 메인 콘텐츠 바탕, 시트셀, 리스트, inset 인풋(콘텐츠 면) + 시트툴바(크롬) + 체크박스(#242526) + 버튼, 노브, 진행(면 아님)을 전부 같은 색으로 칠함(FIND-002, FIND-007). VS Code 는 이들이 전부 다른 면(FIND-001).
  - 그래서 다크에서 면 계층이 안 살고 "전부 같은 검정"으로 보임(사용자 브라우저 실측).
- 완료 정의:
  - `control` 삭제. 사용처마다 실제 역할의 별도 토큰(`content`, `checkbox`, `canvas` 등)을 칠함.
  - ide-dark 면 계층이 VS Code 값대로: 메인/에디터 #121314 < 배경/크롬 #191A1B < floating #202122, 체크박스 #242526.
  - 라이트, 블루프린트 불파괴. 각 컨트롤 VS Code 소스 대조 + 브라우저 실측 검증. 테마 vitest 통과.
- 성공 시 관찰: ide-dark 화면에서 사이드바, 인풋, 카드, 체크박스, 메인이 서로 구분되는 면으로 보임.

## 2. 범위 / 비범위 / 제약

### 2.1 범위

| ID        | 포함 항목                                                                    | 근거                           |
| --------- | ---------------------------------------------------------------------------- | ------------------------------ |
| SCOPE-001 | `control` 삭제 + 사용처별 신설 토큰(`content`, `checkbox` 등) 정의 + 3테마 값 | 사용자 확정, FIND-001, FIND-007 |
| SCOPE-002 | control 사용처를 새 토큰으로 재배선(FIND-007 매핑)                           | FIND-002, FIND-007              |
| SCOPE-003 | 각 컨트롤 VS Code 실소스 ↔ 우리 소스 대조 + 브라우저 실측 검증               | 사용자 확정(방법론)            |
| SCOPE-004 | 관련 테마 테스트(카탈로그, 유틸), sd-tokens.md 갱신                            | TASK 완결성                    |

### 2.2 비범위

| ID           | 제외 항목                                                    | 제외 이유                                                    | 후속 처리       |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | --------------- |
| NONSCOPE-001 | 텍스트/보더/시맨틱색/focus/scrollbar 값                      | 이번은 **surface 면 분리** 집중. 색 오용은 발견 시 국소 반영 | 필요 시 별 plan |
| NONSCOPE-002 | 브랜드 포크(체크박스 solid채움, 탭, toast채움, ripple 등)       | 정체성 결정 — surface 분리와 독립                            | §6.2 OPEN-002   |
| NONSCOPE-003 | 치수, radius, 폰트, 그림자(off)                                 | IDE 컨셉 확정                                                | 해당 없음       |
| NONSCOPE-004 | 팔레트, secondary 제거 + ide-dark 색값(text/border/semantic)  | 별 plan(260716181720) Done                                   | 해당 없음       |
| NONSCOPE-005 | baseline(FIND-004: canvas/control 스왑, chrome 제거)의 재작업 | 이미 반영, 검증됨 — 이 plan 의 출발점                         | 해당 없음       |

### 2.3 제약

| ID             | 제약                                                                                                              | 영향                                                             | 근거                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| CONSTRAINT-001 | 검증은 렌더 실물 기준 — 브라우저 없는 컴포넌트는 VS Code 소스 CSS ↔ 우리 소스 대조로                              | 각 TASK 소스 대조 근거 필수                                      | 사용자 확정                                       |
| CONSTRAINT-002 | surface 토큰은 3테마 공유 — 신설 시 라이트, 블루프린트 값도 정의 필수(불파괴)                                      | 신설마다 3테마 값                                                | 리터럴 자립 규약                                  |
| CONSTRAINT-003 | `bg-*` 유틸 클래스는 공개 — `bg-control` 삭제 시 그 클래스 소비처(`sd-base-container` 등)를 새 클래스로 전환 필요 | control 삭제 = `bg-control` 유틸 소멸 → `bg-content` 등으로 교체 | `sd-base-container.ts:58` `class="...bg-control"` |
| CONSTRAINT-004 | dev(`localhost:40080`, 관리자/1234) 로그인 후 body class `sd-theme-ide-dark` 적용해 실측. HMR 반영 후 reload+eval | 브라우저 검증 절차 고정                                          | playwright-cli 실측 확인                          |

## 3. 조사 요약

| ID       | 확인 내용                                                                                                                                                                                                                                                                                                                                                                        | 근거                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| FIND-001 | VS Code Dark 2026 구분 면: editor.background **#121314**(메인/에디터/시트/리스트),  sideBar/titleBar/statusBar/activityBar/panel/tabs **#191A1B**(크롬),  input.background **#191A1B**(인풋),  dropdown.background **#191A1B**(select),  checkbox.background **#242526**,  editorWidget/menu/quickInput/notifications **#202122**(floating),  list.inactiveSelection **#2C2D2E** | 2026-dark.json 실값                          |
| FIND-002 | `--sd-bg-control` 겸직 소비처 13곳(파일:라인) — FIND-007 표 참조                                                                                                                                                                                                                                                                                                                 | Grep `--sd-bg-control`, `bg-control`          |
| FIND-003 | 과거 ide-dark 가 canvas=#121314, control=#191A1B(거꾸로)라 메인 콘텐츠(control)가 배경(canvas)보다 밝았음                                                                                                                                                                                                                                                                         | 브라우저 실측                                |
| FIND-004 | **baseline(반영, 검증 완료)**: canvas↔control 스왑(ide-dark canvas #191A1B, control #121314), 사이드바, 토프바 `bg-canvas` 칠, chrome/editor 삽질 토큰 제거. 실측 메인 #121314 < 사이드바 #191A1B, 테마 테스트 56 통과. **이 plan 의 출발점**                                                                                                                                       | 브라우저 실측 rgb(18,19,20) vs rgb(25,26,27) |
| FIND-005 | **일반** 인풋은 `--sd-bg-field`(#191A1B) 이미 사용(input.background 정합). control 은 **inset(시트셀 내) disabled** 상태에서만 인풋에 등장                                                                                                                                                                                                                                       | Grep `bg-field`, `bg-control`                 |
| FIND-006 | `elevated`, `overlay`(#202122) 이미 floating 정합. `field`(#191A1B) 인풋면 정합                                                                                                                                                                                                                                                                                                   | 소스 감사, FIND-001                           |
| FIND-007 | **control 사용처 → 실제 역할 분류(§4 DEC-003 근거)**: 아래 표                                                                                                                                                                                                                                                                                                                    | Grep+소스 확인, 사용자 확정                  |

### FIND-007 — `--sd-bg-control` 사용처 분류표

| 사용처 (파일:라인)                                          | 실제 정체              | → 목표 토큰                     | 확정           |
| ----------------------------------------------------------- | ---------------------- | ------------------------------- | -------------- |
| `sd-base-container.ts:58` (메인 콘텐츠, class `bg-control`) | 에디터/본문 면         | **content** (#121314)           | 확정           |
| `sd-sheet.ts:504` tbody td (데이터 셀)                      | 에디터/데이터 면       | **content**                     | 확정           |
| `sd-list.ts:22` (리스트 컨테이너)                           | 콘텐츠 면              | **content**                     | 확정           |
| `sd-textfield.ts:276` inset `._contents`                    | 셀과 같은 콘텐츠 면    | **content**                     | 확정           |
| `sd-textarea.ts:163` inset `._contents`                     | 셀과 같은 콘텐츠 면    | **content**                     | 확정           |
| `sd-select.ts:234` inset disabled `sd-dropdown`             | 셀과 같은 콘텐츠 면    | **content**                     | 확정           |
| `sd-sheet.ts:373` `._tool` (툴바)                           | 크롬/툴바              | **canvas** (#191A1B)            | 확정           |
| `sd-checkbox.ts:138` `._indicator_rect` (theme=white)       | 체크박스 면            | **checkbox** (#242526, 신설)    | 확정           |
| `sd-tiptap-editor.ts:279` `._no-color` 스와치               | 에디터 툴바 요소(모호) | canvas / content 중 소스 대조로 | 미결(TASK-005) |
| `sd-switch.ts:59` 노브                                      | 손잡이(면 아님)        | 개별                            | 미결(TASK-004) |
| `sd-button.ts:40` 기본 버튼 채움                            | 버튼 면                | 개별(브랜드 포크)               | 미결(TASK-005) |
| `sd-select-button.ts:17` 버튼형 트리거                      | 버튼형                 | 개별                            | 미결(TASK-005) |
| `sd-progress.ts:73` inset 트랙                              | 진행 트랙              | 개별                            | 미결(TASK-005) |

## 4. 대안, 결정 로그

| ID      | 결정 상태 | 맥락                                                     | 선택지                                                         | 결정                                                                                                                                        | 근거                                                           |
| ------- | --------- | -------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| DEC-001 | Accepted  | 면 계층 방향                                             | 라이트=콘텐츠 밝게 / 다크=콘텐츠 어둡게                        | 콘텐츠(에디터)=제일 어두움, 배경/크롬=한 톤 밝음(다크). 라이트 역방향 유지                                                                  | FIND-001(editor #121314 < sideBar #191A1B), FIND-004 실측      |
| DEC-002 | Accepted  | canvas/control 값                                        | 스왑                                                           | ide-dark canvas #191A1B, control #121314. chrome 토큰 불필요(baseline)                                                                       | FIND-003, FIND-004, 사용자 확정                                 |
| DEC-003 | Accepted  | `control` 처리                                           | ①좁혀 유지 ②content rename ③**control 삭제 + 사용처별 새 var** | **③** — control 은 사라짐. FIND-007 대로 대다수는 `content`(#121314), 시트툴바는 `canvas`, 체크박스는 `checkbox` 신설, 개별 4개는 각 TASK서 | 사용자 확정("rename 아니고 control 삭제 후 새 vars"), FIND-007 |
| DEC-004 | Accepted  | 콘텐츠 general core 토큰명                               | content / editor / base                                        | **`content`** — control 사용처 중 안 쪼개지고 계속 쓰이는 대다수(메인, 셀, 리스트, inset)의 성격                                               | 사용자 확정("content 적합"), FIND-007                          |
| DEC-005 | Accepted  | 체크박스 면                                              | 신설 `--sd-bg-checkbox`(#242526)                               | 신설 — VS Code checkbox.background 는 별도 면                                                                                               | FIND-001                                                       |
| DEC-006 | Accepted  | 개별 4개(노브, 버튼, select-button, progress)+tiptap swatch | 지금 결정 vs 각 컨트롤 TASK서                                  | 각 TASK(004/005)서 VS Code 소스 대조로 결정. control 삭제는 이들 처리 후(TASK-005 말미)                                                     | 사용자 확정("쪼갠 다음 생각")                                  |

## 5. 영향도 분석

| ID         | 대상                                                                                     | 영향 유형 | 영향 내용                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| IMPACT-001 | `_variables.scss`, `_variables-ide-dark.scss`, `_variables-blueprint.scss`                 | 수정      | `content`, `checkbox` 신설(3테마 값). control 항목은 소비 이관 완료 후 삭제                 |
| IMPACT-002 | `sd-base-container`(class), `sd-sheet`, `sd-list`, `sd-textfield`, `sd-textarea`, `sd-select` | 수정      | 콘텐츠 면 소비 → `bg-content`(class) / `var(--sd-bg-content)`. 시트 `._tool` → `bg-canvas` |
| IMPACT-003 | `sd-checkbox`                                                                            | 수정      | 박스 면 → `--sd-bg-checkbox`                                                               |
| IMPACT-004 | `sd-switch`, `sd-button`, `sd-select-button`, `sd-progress`, `sd-tiptap-editor`              | 수정      | 개별 결정(TASK-004/005) 후 control 참조 제거                                               |
| IMPACT-005 | `sd-tokens.spec`, `sd-utility-classes.spec`, `sd-tokens.md`                                | 수정      | `content`, `checkbox` 카탈로그, 유틸, 문서 반영, control 제거                                 |

## 6. 가정 / OPEN / 리스크

### 6.1 가정

| ID      | 가정                                                                           | 근거 수준           | 구현 차단    |
| ------- | ------------------------------------------------------------------------------ | ------------------- | ------------ |
| ASM-001 | dev 서버(`localhost:40080`)가 검증 내내 떠 있음                                | 확인(사용자 제공)   | Non-blocking |
| ASM-002 | content 값(=현 control #121314, white)과 동일해 콘텐츠 면 이관은 시각 회귀 없음 | 확인(baseline 실측) | Non-blocking |

### 6.2 OPEN

| ID       | 질문                                                                               | 선택지                 | 추천                      | 차단         | 해결 위치    |
| -------- | ---------------------------------------------------------------------------------- | ---------------------- | ------------------------- | ------------ | ------------ |
| OPEN-001 | select **일반** 트리거 면 = field 유지 vs 별도                                     | 유지 / 신설            | field 유지(다크 동값)     | Non-blocking | TASK-003     |
| OPEN-002 | 브랜드 포크(체크박스 solid채움, 탭, toast, ripple 등)                                 | (NONSCOPE-002)         | surface 분리 후 별도 plan | Non-blocking | 별 plan      |
| OPEN-003 | 개별 4개+tiptap swatch 의 최종 토큰(노브, 버튼면, select-button, progress트랙, swatch) | 각 VS Code 소스 대조로 | TASK-004/005서 확정       | Non-blocking | TASK-004/005 |

### 6.3 리스크

| ID       | 리스크                                                | 완화                                                                     |
| -------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| RISK-001 | 콘텐츠 면 이관 중 크롬성 영역까지 잘못 바꿔 계층 깨짐 | FIND-007 표대로만 이관. 브라우저 실측으로 메인 #121314, 헤더 #191A1B 확인 |
| RISK-002 | 신설 토큰 라이트 값 미정의로 라이트 깨짐              | 신설마다 3테마 값 동시 정의(content=white, checkbox=라이트값)             |
| RISK-003 | control 삭제 시 `bg-control` 유틸 클래스 소비처 누락  | 삭제 전 `bg-control`(class), `var(--sd-bg-control)` 전수 Grep 0 확인      |
| RISK-004 | HMR 미반영/캐시로 실측 오판                           | 실측 전 reload + 값 eval 재확인                                          |

## 7. 작업 분해

> 출발점 = baseline(FIND-004). 아래는 그 위 control 분리.

### TASK-001: `content`, `checkbox` 토큰 신설 (3테마)

- TASK 상태: Done (2026-07-16) — `content`, `checkbox`, `knob`(스위치 노브용) 3토큰 신설. knob 은 VS Code 대응 위젯 부재 확인 후 브랜드값(#ededed) 사용자 확정
- 목적: control 을 대체할 신설 토큰을 3테마 값으로 발행.
- 연결 근거: SCOPE-001, DEC-003, DEC-004, DEC-005
- 산출물: `_variables.scss`(라이트), ide-dark, blueprint 에 `--sd-bg-content`, `--sd-bg-checkbox` + 값. 카탈로그, 유틸 테스트, sd-tokens.md 반영.
- 변경 대상:
  - 반드시 변경: 위 3 scss + `sd-tokens.spec`(CATALOG_TOKENS bg), `sd-utility-classes.spec`(BG_CLASSES), `sd-tokens.md`
  - 변경 금지: control 항목(아직 삭제 안 함 — TASK-005 말미), 다른 surface 값
- 값: content = 라이트 white, 블루프린트 white(상속), ide-dark rgb(18,19,20)#121314. checkbox = 라이트 white(또는 라이트 체크박스 관례), ide-dark rgb(36,37,38)#242526.
- 선행: 없음
- 수용 기준: AC-001 / 검증: TEST-001
- 원천 자료 반영: sd-tokens.md bg 표에 content, checkbox 행 추가
- 정지 조건: 라이트 checkbox 값이 소스로 확정 안 되면 OPEN 남기고 사용자 확인

### TASK-002: 콘텐츠 면 이관 (FIND-007 content, canvas 행)

- TASK 상태: Done (2026-07-16) — 메인, 시트셀, 리스트, inset(textfield/textarea/select disabled) → content, 시트툴바 `._tool` → canvas. 실측 `.bg-content` rgb(18,19,20)
- 목적: FIND-007 의 content, canvas 확정분을 새 토큰으로 재배선.
- 연결 근거: SCOPE-002, FIND-007
- 변경 대상(반드시): `sd-base-container.ts:58`(class `bg-control`→`bg-content`), `sd-sheet.ts:504`(td→content), `sd-list.ts:22`(→content), `sd-textfield.ts:276`, `sd-textarea.ts:163`, `sd-select.ts:234`(inset→content), `sd-sheet.ts:373`(`._tool`→`bg-canvas`)
  - 변경 금지: 개별 4개, tiptap swatch(TASK-004/005)
- 작업: VS Code editor/sideBar/panel 소스 대조로 각 영역 역할 확인 → 이관. content 값=control 값이라 콘텐츠는 시각 무변, 시트툴바만 #191A1B 로 밝아짐.
- 선행: TASK-001
- 수용 기준: AC-002 / 검증: GATE-001(브라우저: 메인, 셀 #121314, 시트툴바 #191A1B)

### TASK-003: 인풋/select 면 확인, 정합

- TASK 상태: Done (2026-07-16) — 일반 인풋, select 트리거 이미 `field`(#191A1B), 변경 없음(판정 일치). 실측 field=rgb(25,26,27)
- 목적: **일반** 인풋, select 가 이미 `field`(#191A1B) 임을 소스, 실측 확인(FIND-005). inset 인풋의 content 이관(TASK-002)과 정합.
- 연결 근거: SCOPE-002, SCOPE-003, FIND-005, OPEN-001
- 변경 대상: (일반 인풋은 이미 field — 변경 최소) OPEN-001 결정 반영 시 select 트리거.
- 작업: VS Code inputBox/selectBox 소스 대조 → field 정합 확인 → 브라우저 실측.
- 선행: TASK-001
- 수용 기준: AC-003 / 검증: GATE-001(인풋 내부 #191A1B)

### TASK-004: 체크박스/스위치 면

- TASK 상태: Done (2026-07-16) — 체크박스 박스(theme=white) → checkbox(#242526). 스위치 노브 → knob 신설(#ededed) — VS Code toggle 은 체크박스형뿐이라 슬라이딩 노브 대응물 없음(소스 확인), 브랜드값 사용자 확정
- 목적: 체크박스 박스 → `--sd-bg-checkbox`(#242526). 스위치 노브 최종 토큰 결정(OPEN-003).
- 연결 근거: SCOPE-002, DEC-005, OPEN-003
- 변경 대상: `sd-checkbox.ts:138`(→checkbox), `sd-switch.ts:59`(노브 결정)
- 작업: VS Code toggle.css 소스 대조 → 박스=checkbox, 노브 결정 → 브라우저 실측. (solid채움 존폐는 OPEN-002 별도)
- 선행: TASK-001
- 수용 기준: AC-004 / 검증: GATE-001(체크박스 박스 #242526)

### TASK-005: 개별 잔여 정리 + `control` 삭제

- TASK 상태: Done (2026-07-16) — button, select-button → content(solid 정체는 브랜드포크 별 plan OPEN-002 로 유보), progress inset 트랙 → track(토큰 정의 "채움 뒤 궤도" 부합), tiptap no-color 스와치 → content. control 3테마 scss, 테스트, 문서, 대비쌍에서 완전 삭제, 실사용 Grep 0(부재 단언 2건만 잔존), 런타임 `--sd-bg-control` REMOVED 실측
- 목적: 버튼, select-button, progress, tiptap swatch 를 소스 대조로 결정, 이관하고, **모든 control 참조 제거 후 `control` 토큰, 유틸 삭제**.
- 연결 근거: SCOPE-001, SCOPE-002, DEC-003, DEC-006, RISK-003
- 변경 대상: `sd-button.ts:40`, `sd-select-button.ts:17`, `sd-progress.ts:73`, `sd-tiptap-editor.ts:279` → 각 결정. 그 뒤 3테마 scss 에서 `control` 삭제 + 테스트 카탈로그/유틸/문서에서 제거.
- 작업: VS Code button/progressbar 소스 대조 → 이관 → `bg-control`, `var(--sd-bg-control)` 전수 Grep 0 확인 → control 삭제 → 브라우저 실측.
- 선행: TASK-002, 003, 004(모든 control 소비 이관 후)
- 수용 기준: AC-005 / 검증: GATE-001, GATE-002, TEST-001
- 정지 조건: 버튼 기본 면이 브랜드 포크(OPEN-002)와 얽히면 사용자 확인 후 진행

## 8. 실행 순서 / 의존관계

| 순서 | 작업     | 병렬 가능            | 순서 근거                         |
| ---- | -------- | -------------------- | --------------------------------- |
| 1    | TASK-001 | 불가                 | 신설 토큰이 있어야 이관 대상 존재 |
| 2    | TASK-002 | TASK-003, 004 와 병렬 | 콘텐츠 면(최대 영향)              |
| 3    | TASK-003 | TASK-002, 004 와 병렬 | 인풋 확인                         |
| 4    | TASK-004 | TASK-002, 003 와 병렬 | 체크박스/스위치                   |
| 5    | TASK-005 | 불가(선행 전부 후)   | control 삭제는 모든 소비 이관 후  |

## 9. 수용 기준 / 테스트 전략 / 검증 게이트

### 9.1 수용 기준

| ID     | 연결 작업 | 조건                              | 관찰 가능한 결과                                                      |
| ------ | --------- | --------------------------------- | --------------------------------------------------------------------- |
| AC-001 | TASK-001  | content, checkbox 3테마 발행       | 카탈로그 테스트 통과, `--sd-bg-content`, `--sd-bg-checkbox` :root 발행 |
| AC-002 | TASK-002  | FIND-007 content, canvas 이관 완료 | 실측 메인, 셀 #121314, 시트툴바 #191A1B                                |
| AC-003 | TASK-003  | 인풋, select 내부 #191A1B(field)   | 실측 인풋 내부 rgb(25,26,27)                                          |
| AC-004 | TASK-004  | 체크박스 박스 #242526             | 실측 rgb(36,37,38)                                                    |
| AC-005 | TASK-005  | control 참조 0 + 토큰 삭제        | Grep `bg-control`, `--sd-bg-control` 0, 테마 테스트 통과               |

### 9.2 테스트 전략

| ID       | 연결 작업    | 수준         | 파일, 명령                                          | 통과 기준 |
| -------- | ------------ | ------------ | -------------------------------------------------- | --------- |
| TEST-001 | TASK-001, 005 | unit(vitest) | `pnpm test --project angular tests/features/theme` | 통과      |

### 9.3 검증 게이트

| ID       | 시점         | 방법                                                                                                         | 통과 조건             |
| -------- | ------------ | ------------------------------------------------------------------------------------------------------------ | --------------------- |
| GATE-001 | 각 TASK 완료 | playwright-cli 로 해당 화면(로그인→메뉴 진입) 캡처 + eval 로 대상 요소 backgroundColor 실측, VS Code 값 대조 | 실측 = VS Code 목표값 |
| GATE-002 | 전체 완료    | `pnpm check --fix -t angular`                                                                                | 0 에러                |

## 10. Rollout / Rollback

- Rollout 불필요(라이브러리 빌드). Rollback: 파일 git 원복.

## 11. Traceability

- SCOPE-001→TASK-001, 005 / SCOPE-002→TASK-002~005 / SCOPE-003→GATE-001 / SCOPE-004→TASK-001, 005.
- 각 TASK: FIND/DEC 근거 + AC + TEST/GATE 보유.

## 12. 구현 전 차단 조건

| ID  | 차단 조건                                                              | 관련 | 필요한 결정 |
| --- | ---------------------------------------------------------------------- | ---- | ----------- |
| —   | 없음 (BLOCK-001 해소: DEC-003 control 삭제+content/checkbox 신설 확정) | —    | —           |
