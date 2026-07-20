# Plan: angular ide-dark Dark 2026 정합 및 팔레트, secondary 제거

## 0. 메타데이터

| 항목      | 내용                                                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Plan ID   | PLAN-260716181720                                                                                                                                                                                                                    |
| Plan 상태 | Done (2026-07-16)                                                                                                                                                                                                                    |
| 생성 시각 | 2026-07-16 18:17:20                                                                                                                                                                                                                  |
| 제목      | angular ide-dark Dark 2026 정합 및 팔레트, secondary 제거                                                                                                                                                                             |
| 대상 범위 | `packages/angular` — scss 테마(commons, themes), 역할토큰 카탈로그, 시맨틱 키를 소비하는 컴포넌트, 테마 테스트, sd-tokens.md                                                                                                              |
| 근거 자료 | 사용자 발언(2026-07-16 대화), deep-research 리포트(VS Code Dark 2026), `2026-dark.json`(1차), 현행 scss(`_colors.scss`, `_variables.scss`, `_variables-ide-dark.scss`, `_variables-blueprint.scss`, `_theme-variables.scss`, `_mixins.scss`) |
| 작성 원칙 | 근거 없는 항목은 `[OPEN]`, 구현은 별도 지시 전까지 보류                                                                                                                                                                              |
| 실행 규약 | TASK 는 §8 순서, 의존대로 실행. 선행 의존 TASK 가 Done 되기 전 후속 착수 금지. 각 TASK 완료 즉시 상태를 `Done (yyyy-MM-dd)` 로 갱신                                                                                                   |

## 1. 목표, 문제, 완료 정의

- 목표: `ide-dark` 테마를 VS Code "Dark 2026"(v1.113 기본, `2026-dark.json`)의 **설계 의도**대로 정합시키고, 그 과정에서 걸림돌인 팔레트 배타 모델과 오작업으로 남은 `secondary` 키를 제거함.
- 해결할 문제:
  - ide-dark 가 실제 Dark 2026 과 눈에 띄게 어긋남 — 원인은 CONSTRAINT-007(테마 값=팔레트 스텝+흰/검알파 배타)이 Dark 2026 의 ① 초근접 3단 near-black surface ② 죽인 teal 액센트 를 구조적으로 표현 못 함(FIND-001, FIND-002).
  - `secondary` 시맨틱 키는 제거하기로 한 결정이 지난 세션에서 잘못 유지됨(FIND-006, 사용자 확정).
- 완료 정의:
  - 팔레트 `--sd-color-*` :root 발행 중단 + `$palette` 맵, `colors.vars` 삭제, 3테마 색이 리터럴 rgb 로 자립.
  - `secondary` 키가 컴포넌트, 토큰, 테스트, 테마, 문서에서 전무.
  - ide-dark 값이 Dark 2026 surface 3단, solid 텍스트/보더, 흰알파 상태, teal 시맨틱으로 재매핑됨.
  - `pnpm typecheck` + 테마 vitest 통과.
- 성공 시 관찰 가능한 변화: ide-dark 적용 화면이 VS Code Dark 2026 톤(near-black 3단 배경, #bfbfbf 텍스트, teal 버튼)에 근접. secondary 변형이 사라짐. 소비 앱은 역할 토큰만 쓰므로 무영향(팔레트 직접 사용처만 브레이킹).

## 2. 범위 / 비범위 / 제약

### 2.1 범위

| ID        | 포함 항목                                                                                      | 근거                                                                   |
| --------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| SCOPE-001 | 팔레트 발행 중단 + `$palette`/`colors.vars` 삭제 + 3테마 `var(--sd-color-*)` → 리터럴 rgb 이관 | 사용자 확정(배타모델 폐기, 발행 중단, 맵 삭제), FIND-003, FIND-004        |
| SCOPE-002 | `secondary` 시맨틱 키 완전 제거(컴포넌트 type union, `$theme-keys`, 테마 맵, 테스트, 문서)         | 사용자 확정(FIND-006)                                                  |
| SCOPE-003 | ide-dark 값 Dark 2026 재매핑(surface, text, border, state, focus, scrollbar, 시맨틱 7키)             | 사용자 확정(text/border solid, 시맨틱 이식), FIND-001, FIND-002, FIND-005 |
| SCOPE-004 | 관련 테스트(`sd-tokens.spec`, `sd-utility-classes.spec`) 및 `sd-tokens.md` 갱신                 | TASK 완결성(원천 자료 반영)                                            |

### 2.2 비범위

| ID           | 제외 항목                                    | 제외 이유                                                                      | 후속 처리                    |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| NONSCOPE-001 | 테마 토큰 값의 TS 이관(런타임 주입)          | SSR, FOUC, 성능 트레이드오프 얽힌 독립 과제, 색 충실도와 직교(사용자 확정 4/약6) | 별도 계획 — SCSS 탈피 로드맵 |
| NONSCOPE-002 | syntax 색(string, keyword, function 등)        | `--sd-*` 는 UI 토큰이지 코드 에디터 신택스 아님                                | 해당 없음                    |
| NONSCOPE-003 | 치수, 타이포, radius, 폰트(Sarasa, compact) 변경 | 이미 IDE 컨셉으로 확정된 상태(FIND-007), 이번은 색 작업                        | 해당 없음                    |
| NONSCOPE-004 | light 기본, blueprint 의 **색 의미** 변경     | 이번 팔레트 이관은 값 불변, 표기만 리터럴화. Dark 2026 정합은 ide-dark 한정     | 해당 없음                    |
| NONSCOPE-005 | 새 팔레트 hue(`ink` 등) 신설                 | 사용자 기각 — Tailwind 표준 팔레트 오염(대화 반증)                             | 해당 없음                    |

### 2.3 제약

| ID             | 제약                                                                                                                 | 영향                                                                                                        | 근거                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| CONSTRAINT-001 | 폐기 대상은 CONSTRAINT-007(팔레트 배타)임. 팔레트 삭제 후 테마 값은 리터럴 rgb 로 자립                               | 3테마 전 색값을 팔레트 스텝의 현재 rgb(`_colors.scss` 표)로 인라인                                          | 사용자 확정, `_colors.scss`             |
| CONSTRAINT-002 | `writeVars` 는 값을 `#{$value}` interpolate — Sass 컬러, `rgba()`가 컴파일타임 리터럴로 출력됨                        | 리터럴 rgb, `rgba(r,g,b,a)` 직접 기입 가능. focus-ring 반투명(#3994BCB3)도 리터럴로 정확 재현                | `_mixins.scss:16` 실측                  |
| CONSTRAINT-003 | 소비자는 역할 토큰(`--sd-bg/tx/bd-*`)만 사용 — repo 내 `--sd-color-*` 직접 사용은 4개 테마 파일뿐(.ts 는 테스트 1개) | 발행 중단이 repo 내부엔 무영향. 외부 앱이 `--sd-color-*` 직접 쓰면 브레이킹(사용성 거의 없음 — 사용자 전언) | Grep(`--sd-color-` scss 4파일, ts 1파일) |
| CONSTRAINT-004 | SSR 가드 유지 — 이번 작업은 scss, type 만 건드리므로 TS 런타임 무변경                                                 | provideSdAngular, SdThemeProvider 불변                                                                       | 현행 코드                               |
| CONSTRAINT-005 | `2026-dark.json` main 브랜치는 라이브 파일 — 값 드리프트 가능                                                        | 확보한 값은 조회 시점 기준. 재확인 시 태그 커밋 대조 권장                                                   | deep-research caveat                    |

## 3. 조사 요약

| ID       | 조사 관점       | 확인 내용                                                                                                                                                                                                                                                                | 근거                                                                  | plan 반영                 |
| -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------- |
| FIND-001 | 리스크, 외부근거 | Dark 2026 surface 는 **3단** near-black: canvas #121314 < chrome #191A1B < widget/popup #202122. 팔레트 스텝(Δ13-15)은 이 초근접 단(Δ7)을 못 얹음                                                                                                                        | `2026-dark.json`, deep-research 3-0                                    | SCOPE-003, TASK-002       |
| FIND-002 | 외부근거        | 액센트는 **죽인 teal**(button #297AA0→hover #2B7DA3, link #48A0C7, badge #307E9F). 팔레트 sky/cyan/teal 600-700 은 R=0 완전채도라 재현 불가                                                                                                                              | `2026-dark.json`, deep-research 3-0                                    | SCOPE-003, TASK-002       |
| FIND-003 | 코드패턴        | `--sd-color-*` 소비처는 테마 4파일(`_colors`, `_variables`, `_variables-ide-dark`, `_variables-blueprint`)뿐. 컴포넌트 scss, 유틸클래스 미사용                                                                                                                               | Grep                                                                  | SCOPE-001, CONSTRAINT-003 |
| FIND-004 | 코드패턴        | 팔레트는 `_theme-variables.scss:11 @include colors.vars` 로 :root base 발행. sd-tokens.md 카탈로그에 공개로 등재                                                                                                                                                         | `_theme-variables.scss`, `sd-tokens.md`                                | TASK-003                  |
| FIND-005 | 외부근거        | text, border 는 solid 그레이(foreground #bfbfbf, widget.border #2A2B2C, input.border #333536, checkbox #707070). 상태(hover/focus/active)만 흰알파(#FFFFFF14/22), inactive-selection 은 solid #2C2D2E — **하이브리드**(현재 파일은 text, border 를 전부 흰알파로 해 드리프트) | `2026-dark.json`, deep-research 3-0(단, "전부 알파" 일반화는 0-3 반증) | SCOPE-003, TASK-002       |
| FIND-006 | 요구, 자료       | `secondary` 는 8키 중 하나로 컴포넌트 11개 type union, `$theme-keys`, 3테마, 테스트, 문서에 배선됨. 사용자: 제거 결정이 지난 세션에서 잘못 유지됨. 지난 정비가 없앤 건 secondary 의 "필드배경 겸직"(FIND-011 구계획)이지 키 자체 아님                                        | Grep, 사용자 발언                                                      | SCOPE-002, TASK-001       |
| FIND-007 | 코드패턴        | ide-dark 치수, 폰트(gap compact, radius 1-6px, Sarasa, font-weight 300, topbar 2rem, 그림자 off)는 확정 상태. Dark 2026 dark JSON 은 widget.shadow **부재** → 그림자 off 가 정합                                                                                               | `_variables-ide-dark.scss`, `2026-dark.json`                           | NONSCOPE-003, TASK-002    |
| FIND-008 | 외부근거        | danger 는 Dark 2026 에 **버튼 채움색 부재**. error 색은 errorForeground #f48771(텍스트), inputValidation.errorBorder #BE1100(검증보더) 둘뿐                                                                                                                               | `2026-dark.json`                                                      | DEC-006                   |
| FIND-009 | 코드패턴        | 관련 테스트: `sd-tokens.spec` 이 팔레트 전수 발행, "테마값=팔레트계산값", "var() 참조=--sd-color-* 만(체이닝)", SEMANTIC_KEYS(secondary 포함)을 검증. `sd-utility-classes.spec` 도 secondary 포함                                                                           | `sd-tokens.spec.ts`, `sd-utility-classes.spec.ts`                      | TASK-001, TASK-003         |

## 4. 대안, 결정 로그

| ID      | 결정 상태 | 맥락                                                | 선택지                                                        | 결정                                                                                                                                                      | 근거                                                                        | 결과, 트레이드오프                      | 재검토 조건 |
| ------- | --------- | --------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------- | ----------- |
| DEC-001 | Accepted  | 팔레트 배타(CONSTRAINT-007)가 Dark 2026 충실도 상한 | ①기존스텝 best-fit ②테마맵 리터럴 허용 ③팔레트 세밀화(새 hue) | ②배타모델 폐기, 테마맵이 값 직접 정의                                                                                                                     | ①은 초근접단/죽인teal 원리상 미달, ③은 Tailwind 표준 팔레트 오염            | 팔레트를 공개 표준 유지 요구 재발생 시 |
| DEC-002 | Accepted  | 팔레트 :root 발행 존폐                              | ①발행유지(공개 라이브러리) ②발행중단, 삭제                     | ②발행중단 + `$palette`/`colors.vars` 삭제                                                                                                                 | 소비 사용성 거의 없음(사용자 전언), 배타폐기 후 존재의의 소멸               | 외부 앱의 `--sd-color-*` 의존 발견 시  |
| DEC-003 | Accepted  | 테마 값 매체(SCSS vs TS)                            | ①현 SCSS 맵 리터럴 ②TS 런타임 주입                            | ①SCSS 맵 유지                                                                                                                                             | 색 충실도와 매체 직교, TS 이관은 SSR/FOUC 얽힌 독립 과제                    | SCSS 탈피 로드맵 별도 착수 시          |
| DEC-004 | Accepted  | text, border 렌더 방식                               | ①solid 그레이(VS Code 정확) ②흰알파 유지                      | ①solid 그레이(상태 오버레이만 알파)                                                                                                                       | 1차 출처가 solid 하이브리드임을 검증(FIND-005), 현 all-알파가 드리프트 원인 | —                                      |
| DEC-005 | Accepted  | 시맨틱 색 이식 원칙                                 | 복붙 vs 의도 파생                                             | tx-{key}=VS Code 라이트 foreground / bg-solid=뮤트 중암(파생) / bg-subtle=어두운 틴트 / solid-hover=더 밝게(다크 hover 밝힘, button #297AA0→#2B7DA3 검증) | VS Code 는 기능색을 채움 아닌 foreground 로 씀 → 우리 solid 는 파생 불가피  | —                                      |
| DEC-006 | Accepted  | danger solid(원본 부재, FIND-008)                   | ①#f48771(살몬) ②#BE1100(검증 레드)                            | ②#BE1100(파괴적 액션 가독), tx-danger=#f48771                                                                                                             | 둘 다 VS Code 실값 — 지어낸 값 아님. 살몬은 파괴 버튼엔 약함                | 사용자 이견 시                         |
| DEC-007 | Accepted  | secondary 존폐                                      | ①유지 ②제거                                                   | ②완전 제거                                                                                                                                                | 사용자 확정(지난 세션 오작업 정정)                                          | —                                      |

## 5. 영향도 분석

| ID         | 대상                                                                                                                                                                                   | 영향 유형 | 영향 내용                                                                                                          | 위험도                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| IMPACT-001 | `scss/commons/_colors.scss`                                                                                                                                                            | 삭제      | `$palette` 맵, `vars` 믹스인 파일 제거                                                                              | Medium                    |
| IMPACT-002 | `scss/commons/_theme-variables.scss`                                                                                                                                                   | 수정      | `@use "colors"`, `@include colors.vars` 제거                                                                        | Low                       |
| IMPACT-003 | `scss/commons/_variables.scss`                                                                                                                                                         | 수정      | `$sd` 의 모든 `var(--sd-color-*)` → 리터럴 rgb. `$theme-keys` 에서 secondary 제거. bg/tx/bd 의 secondary 블록 삭제 | High                      |
| IMPACT-004 | `scss/themes/_variables-blueprint.scss`                                                                                                                                                | 수정      | `$paper` 의 모든 `var(--sd-color-*)` → 리터럴 rgb(값 불변)                                                         | Medium                    |
| IMPACT-005 | `scss/themes/_variables-ide-dark.scss`                                                                                                                                                 | 수정      | `$dark` 전면 재작성 — Dark 2026 리터럴, 7키(secondary 제거)                                                        | High                      |
| IMPACT-006 | 컴포넌트 11개(`sd-button`〔+link-secondary〕, `sd-anchor`, `sd-checkbox`, `sd-switch`, `sd-textfield`, `sd-textarea`, `sd-label`, `sd-progress`, `sd-note`, `setupBgTheme`, `sd-toast.provider`) | 수정      | theme type union 에서 `secondary`, `link-secondary` 제거                                                            | Medium(공개 API 브레이킹) |
| IMPACT-007 | `tests/features/theme/sd-tokens.spec.ts`                                                                                                                                               | 수정      | 팔레트 발행 테스트 제거, "테마값=팔레트계산" 재작성, 체이닝 테스트 제거/재작성, SEMANTIC_KEYS 에서 secondary 제거  | Medium                    |
| IMPACT-008 | `tests/features/theme/sd-utility-classes.spec.ts`                                                                                                                                      | 수정      | secondary 제거                                                                                                     | Low                       |
| IMPACT-009 | `scss/sd-tokens.md`                                                                                                                                                                    | 수정      | 팔레트 섹션, 색원천 규칙, secondary 키 표기 갱신                                                                     | Low                       |

## 6. 가정 / OPEN / 리스크

### 6.1 가정

| ID      | 가정                                                                             | 근거 수준           | 틀렸을 때 영향                     | 확인 방법                                               | 구현 차단 여부 |
| ------- | -------------------------------------------------------------------------------- | ------------------- | ---------------------------------- | ------------------------------------------------------- | -------------- |
| ASM-001 | 컴포넌트가 secondary 를 type union 외(템플릿 하드코딩, 기본값 등)로 참조하지 않음 | 미확인              | 잔여 참조 시 typecheck/런타임 오류 | TASK-001 착수 시 각 컴포넌트에서 secondary 전 출현 확인 | Non-blocking   |
| ASM-002 | 외부 소비 앱이 `--sd-color-*` 를 직접 쓰지 않음(거의 없음)                       | 미확인(사용자 전언) | 외부 앱 스타일 깨짐                | 사용자 판단(수용)                                       | Non-blocking   |
| ASM-003 | `2026-dark.json` 조회값이 현재 릴리스와 일치                                     | 확인됨(1차 fetch)   | 미세 톤 차                         | 필요 시 v1.113 태그 대조                                | Non-blocking   |

### 6.2 OPEN

| ID       | 질문, 미정 사항                                                                                                                                                           | 선택지                                                                                                                               | 추천안                                                                                                                                                                   | 차단 여부    | 해결 후 반영 위치                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ----------------------------------------------------------------- |
| OPEN-001 | ide-dark 시맨틱 파생값(success solid, gray/blue-gray solid, 각 subtle 틴트)의 정확 rgb                                                                                     | TASK-002 값표의 파생 규칙대로 확정                                                                                                   | 값표 참조                                                                                                                                                                | Non-blocking | TASK-002 값표                                                     |
| OPEN-002 | **선행 red(색 무관)**: `sd-tokens.spec.ts:231` 이 ide-dark line-height=1.35em 기대하나 `_variables-ide-dark.scss:221-222` 가 주석처리로 base 1.5em 상속 → 현재 이미 실패 | ①line-height 1.35em 복원(치수 변경 — NONSCOPE-003 위반) ②테스트 기대치를 1.5em 으로 정정 ③기존 red 로 두고 이 색작업 게이트에서 제외 | **최종(사용자 2026-07-16)**: line-height 는 1.5em 유지(ide-dark 가 base 상속). 1.35em 단언 테스트는 삭제 — 스타일 "값" 스냅샷 테스트는 불변식 아니라 쓰레기(사용자 방침) | 해소됨       | sd-tokens.spec 값스냅샷 테스트(#테마값맵 rgb, #치수 rem) 삭제 완료 |

### 6.3 리스크

| ID       | 리스크                                                                              | 가능성 | 영향   | 예방, 완화                                                                                                            | 조기 경고 신호             | 대응                                     |
| -------- | ----------------------------------------------------------------------------------- | ------ | ------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------- |
| RISK-001 | 팔레트 발행 중단이 원자적이지 않으면 중간에 `var(--sd-color-*)` 미해결로 3테마 깨짐 | Medium | High   | §8 순서 — ide-dark 리터럴화(TASK-002) 완료 후, default, blueprint 리터럴화+발행중단을 한 TASK(TASK-003)에서 원자 수행 | 컴파일 후 배경 투명/미적용 | TASK 내 커밋 전 전 테마 육안, 테스트 확인 |
| RISK-002 | 리터럴 이관 중 팔레트 스텝 rgb 오전사(default/blueprint 값 변질)                    | Medium | Medium | `_colors.scss` 현재 표를 유일 출처로 1:1 대조. default/blueprint 는 값 불변이 목표                                   | 라이트/블루프린트 색 변화  | 변환 표 대조 재검                        |
| RISK-003 | secondary 제거로 다른 major 브랜치, 소비앱 타입 깨짐                                 | Medium | Medium | 공개 API 브레이킹임을 보고. 버전 정책은 사용자 재량                                                                  | 소비앱 typecheck 실패      | 릴리스 노트 명시(사용자)                 |

## 7. 작업 분해

### TASK-001: secondary 시맨틱 키 완전 제거

- TASK 상태: Done (2026-07-16)
- 목적: 8키→7키. 오작업으로 남은 secondary 를 컴포넌트, 토큰, 테스트, 문서에서 전무화.
- 연결 근거: SCOPE-002, FIND-006, DEC-007
- 산출물: secondary 참조 0(dist, styles.css 등 빌드산출 제외)인 워킹 트리.
- 변경 대상:
  - 반드시 변경: 컴포넌트 11개(IMPACT-006) type union, `_variables.scss` `$theme-keys`+bg/tx/bd secondary 블록, `_variables-ide-dark.scss` bg/tx/bd 의 secondary 블록(5회 — GATE-001 scss 0건 충족), `sd-tokens.spec.ts`, `sd-utility-classes.spec.ts` SEMANTIC_KEYS, `sd-tokens.md` 시맨틱 키 표기.
  - 변경 가능: [N/A]
  - 변경 금지: light/blueprint 의 다른 시맨틱 키 값, 팔레트.
- 현재 상태: secondary 가 8키 중 하나로 전 배선.
- 작업 내용:
  1. 각 컴포넌트 `theme` input type union 에서 `"secondary"`, (sd-button) `"link-secondary"` 제거.
  2. `$theme-keys` 에서 secondary 제거. `_variables.scss` bg/tx/bd 의 secondary 블록 삭제.
     2.5. `_variables-ide-dark.scss` bg/tx/bd 의 secondary 블록(38-43, 99-101, 139-143 등 5회) 삭제 — GATE-001 scss 0건 충족.
  3. 테스트 SEMANTIC_KEYS, utility 목록에서 secondary 제거.
  4. sd-tokens.md 시맨틱 키 나열(gray, blue-gray, primary, info, success, warning, danger)로 갱신.
- 선행 작업: 없음.
- 수용 기준: AC-001
- 테스트, 검증: TEST-001, GATE-001
- 원천 자료 반영: sd-tokens.md 시맨틱 키 표기 갱신(이 TASK 내 완결).
- 롤백 영향: type union 복원 시 원복.
- 구현 시 주의: ASM-001 — 템플릿, 기본값 하드코딩 여부 각 파일에서 확인. 잔여 참조 남기면 silent 아님(typecheck throw).
- 정지 조건: secondary 가 로직 분기(if theme==='secondary')로 쓰여 단순 제거가 동작을 바꾸면 멈추고 제안.

### TASK-002: ide-dark Dark 2026 재매핑(리터럴)

- TASK 상태: Done (2026-07-16)
- 목적: `$dark` 를 Dark 2026 의도대로 재작성 — surface 3단, solid text/border, 흰알파 상태, teal 시맨틱. 이 시점엔 팔레트가 아직 존재하므로 워킹 상태 유지.
- 연결 근거: SCOPE-003, FIND-001, FIND-002, FIND-005, FIND-007, FIND-008, DEC-004, DEC-005, DEC-006
- 산출물: 7키, 리터럴 rgb 로 구성된 `$dark` — `var(--sd-color-*)` 참조 0.
- 변경 대상:
  - 반드시 변경: `scss/themes/_variables-ide-dark.scss`(전면).
  - 변경 금지: 치수, radius, 폰트, 그림자(off), gap(FIND-007) — 색 외 항목 불변. 팔레트 파일(TASK-003 소관).
- 현재 상태: zinc-950/900/800 surface, 흰알파 text/border, sky/cyan 시맨틱(드리프트).
- 작업 내용 — 아래 값표로 재작성:
  - **surface**: canvas rgb(18,19,20) / control rgb(25,26,27) / elevated rgb(32,33,34) / overlay rgb(32,33,34) / sheet rgb(18,19,20) / field rgb(25,26,27) / track rgb(44,45,46) / inverse white / disabled rgb(32,33,34).
  - **text(solid)**: strong rgb(237,237,237) / default rgb(191,191,191) / muted rgb(140,140,140) / faint rgb(85,85,85) / disabled rgb(85,85,85). on-inverse 계열 현행 유지.
  - **border(solid)**: hairline rgb(36,37,38) / soft rgb(42,43,44) / default rgb(42,43,44) / strong rgb(51,53,54) / field rgb(51,53,54) / emphasis rgb(112,112,112) / disabled rgb(42,43,44).
  - **state(알파)**: hover rgba(255,255,255,.08) / active rgba(255,255,255,.13) / selected rgba(255,255,255,.13).
  - **focus-ring**: color rgba(57,148,188,.7).
  - **scrollbar**: thumb rgba(168,169,170,.52) / thumb-hover rgba(168,169,170,.565) / track rgba(255,255,255,.03).
  - **시맨틱 7키**(bg solid/solid-hover/subtle/subtle-hover,  tx/-hover/-solid/-subtle,  bd solid/solid-hover/subtle):
    - primary(teal, 1차): solid rgb(41,122,160)→hover rgb(43,125,163) / subtle rgb(20,50,63)→rgb(26,63,78) / tx rgb(72,160,199)→hover rgb(83,165,202), solid white, subtle rgb(130,197,224) / bd solid rgb(41,122,160)→rgb(43,125,163), subtle rgb(38,90,110).
    - info(blue, 1차): solid rgb(57,148,188)→hover rgb(66,158,200) / subtle rgb(16,45,60)→rgb(22,58,76) / tx rgb(87,163,248), solid white, subtle rgb(130,190,250) / bd 매칭.
    - success(green): tx rgb(134,207,134)(1차 charts.green) / solid rgb(56,125,86)→hover rgb(64,140,97)(파생 뮤트) / subtle rgb(16,45,30)→rgb(22,58,40) / tx-solid white, subtle rgb(150,215,150) / bd 매칭.
    - warning(gold, 1차): solid rgb(184,149,0)→hover rgb(200,163,10) / subtle rgb(48,40,4)→rgb(60,50,6) / tx rgb(224,185,127), solid white, subtle rgb(232,205,160) / bd 매칭.
    - danger(red): solid rgb(190,17,0)→hover rgb(215,25,5)(DEC-006 #BE1100) / subtle rgb(58,14,8)→rgb(74,18,10) / tx rgb(244,135,113)(1차 errorForeground), solid white, subtle rgb(248,170,152) / bd 매칭.
    - gray(중성): solid rgb(135,136,137)→hover rgb(160,161,162) / subtle rgb(32,33,34)→rgb(42,43,44) / tx rgb(140,140,140)→hover rgb(191,191,191), solid white, subtle rgb(191,191,191) / bd solid rgb(135,136,137), subtle rgb(51,53,54).
    - blue-gray(slate 틴트, 파생): solid rgb(100,116,139)→hover rgb(120,136,159) / subtle rgb(28,34,44)→rgb(38,46,58) / tx rgb(148,163,184)→hover rgb(170,183,200), solid white, subtle rgb(170,183,200) / bd 매칭.
  - **컴포넌트 장식 — 잔여 팔레트 참조 전수 리터럴화**(발견3): modal.header-bg rgb(32,33,34)(elevated) / modal.header-tx-muted rgb(140,140,140)(muted) / permission-group.bg rgb(32,33,34)(elevated) / permission-group.tx rgba(255,255,255,.75) 현행 / modal.bd, dropdown.bd, card.bd 현행 흰알파 유지 / card.bd-active teal rgb(43,125,163). → ide-dark 내 `var(--sd-color-*)` 참조가 **0** 이 되도록 전수 확인(TASK-003 발행 중단 후 미해결 var 방지, RISK-001).
- 선행 작업: TASK-001(secondary 제거된 7키 전제).
- 수용 기준: AC-002
- 테스트, 검증: TEST-002, GATE-002
- 원천 자료 반영: 파일 머리 주석의 레퍼런스, 색규칙 문구를 새 방식(리터럴, 팔레트 미참조)으로 갱신.
- 롤백 영향: 파일 단위 원복.
- 구현 시 주의: 파생값(OPEN-001)은 위 규칙 일관 적용. 상태만 알파, text/border 는 solid(DEC-004).
- 정지 조건: 값표로 못 채우는 역할 토큰 발견 시 멈추고 제안.

### TASK-003: 팔레트 발행 중단 + default, blueprint 리터럴 이관 + 팔레트 삭제

- TASK 상태: Done (2026-07-16)
- 목적: `--sd-color-*` :root 발행 중단, `$palette`/`colors.vars` 삭제, default, blueprint 색을 값 불변으로 리터럴화. 원자 수행으로 워킹 상태 유지(RISK-001).
- 연결 근거: SCOPE-001, SCOPE-004, FIND-003, FIND-004, FIND-009, DEC-001, DEC-002, DEC-003
- 산출물: 팔레트 없는 트리 — 3테마 전부 리터럴 rgb, `var(--sd-color-*)` 참조 0.
- 변경 대상:
  - 반드시 변경: `_variables.scss`($sd 전 `var(--sd-color-*)`→리터럴), `_variables-blueprint.scss`($paper, $grid 전 팔레트 참조→리터럴), `_theme-variables.scss`(colors use/vars 제거), `_colors.scss`(삭제), `sd-tokens.spec.ts`(팔레트발행, 테마값=팔레트계산, 체이닝 테스트 정리), `sd-tokens.md`(팔레트 섹션, 색원천 규칙).
  - 변경 금지: default, blueprint 의 색 **의미**(값 시각 등가 유지, 표기만 리터럴).
- 현재 상태: `var(--sd-color-*)` 참조 + colors.vars 발행.
- 작업 내용:
  1. `_variables.scss`, `_variables-blueprint.scss` 의 모든 `var(--sd-color-{hue}-{step})` 를 `_colors.scss` 현재 표의 rgb 리터럴로 1:1 치환(RISK-002 — 표 유일출처 대조). blueprint 는 이미 리터럴인 grid/그림자 유지.
  2. `_theme-variables.scss` 의 `@use "colors"`, `@include colors.vars` 제거.
  3. `_colors.scss` 삭제.
  4. `sd-tokens.spec.ts`: "팔레트 전수 발행" 테스트 제거, "테마값=팔레트계산값" 을 리터럴 기대값으로 재작성(또는 제거), "var() 참조=--sd-color-* 만(체이닝)" 테스트는 팔레트 소멸로 무의미 → 제거. 역할토큰 카탈로그 발행 테스트는 유지.
  5. `sd-tokens.md`: 팔레트 섹션, "색 원천=팔레트+흰검알파" 규칙, 체이닝 규칙을 새 실상(테마맵 리터럴 자립)으로 갱신.
- 선행 작업: TASK-002(ide-dark 가 리터럴이어야 발행 중단 시 안 깨짐).
- 수용 기준: AC-003, AC-004
- 테스트, 검증: TEST-003, GATE-003
- 원천 자료 반영: sd-tokens.md 팔레트, 색원천 규칙 갱신(이 TASK 내 완결).
- 롤백 영향: `_colors.scss` 복원 + 참조 원복.
- 구현 시 주의: 원자성 — 이 TASK 종료 시 3테마 모두 리터럴이어야 함. 부분 적용 상태로 종료 금지(RISK-001).
- 정지 조건: 팔레트 참조가 예상 4파일 밖(컴포넌트 등)에서 발견되면 멈추고 제안.

## 8. 실행 순서 / 의존관계

| 순서 | 작업     | 병렬 가능 | 순서 근거                                                                     | 피해야 할 순서                                        |
| ---- | -------- | --------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1    | TASK-001 | 불가      | secondary 제거로 7키 확정 → 이후 ide-dark 재작성, 테스트가 7키 전제            | ide-dark 재작성 후 secondary 제거(재작성 재수정 유발) |
| 2    | TASK-002 | 불가      | ide-dark 를 리터럴로 먼저 자립시켜야, TASK-003 발행 중단 시 안 깨짐(RISK-001) | 발행 중단 후 ide-dark 리터럴화(중간 깨짐)             |
| 3    | TASK-003 | 불가      | 3테마 리터럴 완비 후에만 팔레트 발행 원자 중단 가능                           | default/blueprint 미변환 상태로 발행 중단             |

## 9. 수용 기준 / 테스트 전략 / 검증 게이트

### 9.1 수용 기준

| ID     | 연결 작업 | 조건                                                                  | 관찰 가능한 결과                                                                                                          | 예외, 오류 케이스                     |
| ------ | --------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| AC-001 | TASK-001  | secondary, link-secondary 가 src, 테스트, 문서에서 전무                  | Grep secondary(src/tests/scss/md) 0건, typecheck 통과                                                                     | 로직 분기 사용 발견 시 정지          |
| AC-002 | TASK-002  | ide-dark 가 Dark 2026 값표대로, 7키, 리터럴, `var(--sd-color-*)` 참조 0 | 카탈로그 발행 테스트 통과, ide-dark 적용 시 canvas #121314, teal 버튼, #bfbfbf 텍스트, ide-dark 파일 grep `--sd-color-` 0건 | 값표 미해당 토큰 발견 시 정지        |
| AC-003 | TASK-003  | `var(--sd-color-*)` 참조 0, `_colors.scss` 삭제, colors.vars 미발행   | Grep `--sd-color-` 0건(주석 제외), 빌드 시 미해결 var 없음                                                                | 4파일 밖 참조 발견 시 정지           |
| AC-004 | TASK-003  | default, blueprint 색 의미 불변(값 시각 등가)                          | 라이트/블루프린트 렌더 색 변화 없음                                                                                       | 스텝 rgb 오전사 발견 시 표 대조 재검 |

### 9.2 테스트 전략

| ID       | 연결 작업 | 수준         | 케이스                                          | 파일, 명령                                                    | 통과 기준                                                     |
| -------- | --------- | ------------ | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| TEST-001 | TASK-001  | typecheck    | secondary 제거 후 컴포넌트 타입 정합            | `pnpm typecheck -t angular`                                  | 오류 0                                                        |
| TEST-002 | TASK-002  | unit(vitest) | 역할토큰 카탈로그 전수 발행, ide-dark 값 맵 덮기 | `pnpm test --project angular sd-tokens.spec`                 | 색 관련 케이스 통과(선행 line-height red 는 OPEN-002 로 제외) |
| TEST-003 | TASK-003  | unit(vitest) | 팔레트 소멸 반영한 재작성 테스트, 구어휘 미발행  | `pnpm test --project angular` (sd-tokens, sd-utility-classes) | 색, 팔레트, secondary 케이스 통과(선행 line-height red 제외)    |

### 9.3 검증 게이트

| ID       | 시점             | 검사 항목                               | 명령, 방법                                                     | 통과 조건                                                                      | 실패 시 행동      |
| -------- | ---------------- | --------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------- |
| GATE-001 | TASK-001 완료 시 | secondary 잔여 참조                     | Grep `secondary`(src, tests, scss, md)                           | 0건                                                                            | 잔여 제거         |
| GATE-002 | TASK-002 완료 시 | ide-dark 카탈로그 정합, 팔레트 아직 정상 | `pnpm test --project angular sd-tokens.spec`                  | 색 케이스 통과(OPEN-002 line-height red 제외 — 이 작업이 신규 실패 유발 안 함) | 값 수정           |
| GATE-003 | 전체 완료 전     | 미해결 var, 전체 테스트, 타입, 신규 회귀   | `pnpm check --fix -t angular` + `pnpm test --project angular` | 색, 팔레트, secondary 케이스 통과 + 선행 대비 신규 red 0(OPEN-002 제외)          | 원인 규명 후 수정 |

## 10. Rollout / Rollback

- Rollout 필요 여부: 불필요(라이브러리 빌드 산출 — 소비앱 재빌드로 반영).
- Rollout 절차: [N/A] — 배포는 사용자 재량(pub).
- Rollback 가능 여부: 가능(파일 단위 git 원복).
- Rollback 절차: 변경 파일, `_colors.scss` 복원.
- Rollback 불가 지점: 없음.
- 관측 지표: typecheck, vitest 결과, ide-dark 육안 대조.
- 중단 조건: 팔레트, secondary 참조가 예상 밖 위치에서 대량 발견 시.

## 11. Traceability 규칙

- SCOPE-001→TASK-003 / SCOPE-002→TASK-001 / SCOPE-003→TASK-002 / SCOPE-004→TASK-001, TASK-003.
- 모든 TASK 는 FIND/DEC/SCOPE 근거 연결됨(각 TASK "연결 근거").
- 각 TASK 는 AC 1+ 및 TEST/GATE 1+ 보유.

## 12. 구현 전 차단 조건

| ID  | 차단 조건                                      | 관련 OPEN/ASM/RISK | 필요한 결정 | 해결 담당 | 해결 후 갱신 위치 |
| --- | ---------------------------------------------- | ------------------ | ----------- | --------- | ----------------- |
| —   | 없음(Blocking OPEN, ASM 없음 — Plan 상태 Ready) | —                  | —           | —         | —                 |
