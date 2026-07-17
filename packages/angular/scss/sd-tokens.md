# `--sd-*` 역할 토큰 카탈로그

테마는 이 카탈로그의 **값 맵만으로** 완성함 — 컴포넌트 셀렉터 오버라이드 금지.
정의·발행: `commons/_variables.scss` 의 `$sd` 맵 → `writeVars($sd, "sd")` 로 `:root`(base 레이어) 발행. 테마는 theme-variant 레이어에서 같은 이름을 재정의함.

## 규칙

- **어휘(DEC-013)**: 색 어휘는 `--sd-{bg|tx|bd}-…` 속성 우선. 유틸 클래스명 = 토큰명에서 `--sd-` 만 뗀 것(`--sd-bg-primary-solid` ↔ `.bg-primary-solid`). hover 변형은 `-hover` 접미. 비색상·컴포넌트 전용 그룹(focus-ring·scrollbar·shadow·타이포·치수·z)은 그룹 구조 유지.
- **체이닝 금지**: 테마가 덮는 토큰끼리 `var()` 체인 금지 — 재정의 스코프에서 하위가 안 따라옴(확정값 상속). 색 값은 리터럴 rgb 로 자립. 파생 calc 는 소비 지점에서 계산함.
- **색 원천**: 리터럴 rgb + 흰/검 알파(rgba white/black). 팔레트(`--sd-color-*`) 배타 모델은 폐기됨(값 자립).
- **그룹 소유권**: 색·폰트·형태(radius·그림자·표면 패턴)와 치수(간격·행높이·시트 패딩·topbar 높이) 모두 테마 맵 소유. 치수는 라이트/블루프린트가 기본값(넉넉), IDE 다크가 오밀조밀로 덮음.
- **소비 규약**: 컴포넌트는 `background` 단축 금지(`background-color:` 사용 — `--sd-bg-canvas-image` 패턴 보존). 컴포넌트 config 의 인라인 var 지정 금지.
- 구 스케일 어휘(`--theme-*-{lightest..darkest}`·`--trans-*`·`--text-trans-*`·`--sd-color-*` 팔레트·rev 계열)는 카탈로그에 없고 발행도 종료됨(브레이킹). 구 어휘를 소비하던 앱은 이 카탈로그 어휘로 전환해야 함.

## 토큰 표 (라이트 기본값 = 구 어휘 시각 등가)

### 배경(bg)

| 토큰                                    | 역할                                              | 기본값                 |
| --------------------------------------- | ------------------------------------------------- | ---------------------- |
| `--sd-bg-canvas`                        | 앱 배경                                           | zinc-50                |
| `--sd-bg-canvas-image`                  | 배경 패턴(블루프린트 모눈 등)                     | none                   |
| `--sd-bg-content`                       | 콘텐츠(에디터/본문) 면 — 메인·시트셀·리스트·inset | white                  |
| `--sd-bg-elevated`                      | 카드·모달 승격 면                                 | white                  |
| `--sd-bg-overlay`                       | 드롭다운·팝업 면                                  | white                  |
| `--sd-bg-sheet`                         | 시트 컨테이너 면                                  | zinc-50                |
| `--sd-bg-sheet-image`                   | 시트 컨테이너 배경 패턴                           | none                   |
| `--sd-bg-inverse`                       | 반전 면                                           | black                  |
| `--sd-bg-field`                         | 인풋류 필드 면                                    | blue-50                |
| `--sd-bg-track`                         | 트랙 면(스위치 off 트랙 등)                       | zinc-100               |
| `--sd-bg-knob`                          | 스위치 노브(손잡이) 면                            | white                  |
| `--sd-bg-checkbox`                      | 체크박스 박스 면(VS Code checkbox.background)     | white                  |
| `--sd-bg-state-{hover,active,selected}` | 상태 오버레이(알파) — 전 컨트롤 공통              | rgba(0,0,0,.05/.1/.07) |
| `--sd-bg-disabled`                      | 비활성 면(색 치환 규약)                           | zinc-100               |
| `--sd-bg-busy-overlay`                  | busy 오버레이 면                                  | rgba(255,255,255,.6)   |
| `--sd-bg-busy-indicator`                | busy 인디케이터 그래픽 면(큐브 등)                | rgba(0,0,0,.1)         |
| `--sd-bg-backdrop`                      | 모달 뒤 스크림(배경 어둡히기)                     | rgba(0,0,0,.2)         |

### 텍스트(tx)

| 토큰                                   | 역할                          | 기본값                             |
| -------------------------------------- | ----------------------------- | ---------------------------------- |
| `--sd-tx-{strong,default,muted,faint}` | 무채 텍스트(표면색과 독립 축) | black / rgba(0,0,0,.87) / .6 / .38 |
| `--sd-tx-on-inverse`                   | 반전 면 위 텍스트             | white                              |
| `--sd-tx-on-inverse-muted`             | 반전 면 위 보조 텍스트(hover) | rgba(255,255,255,.7)               |
| `--sd-tx-on-inverse-disabled`          | 반전 면 위 비활성 텍스트      | rgba(255,255,255,.5)               |
| `--sd-tx-disabled`                     | 비활성 텍스트(색 치환 규약)   | rgba(0,0,0,.38)                    |

### 보더(bd)

| 토큰                                              | 역할                      | 기본값                   |
| ------------------------------------------------- | ------------------------- | ------------------------ |
| `--sd-bd-{hairline,soft,default,strong,emphasis}` | 무채 보더 강도 스케일     | zinc-100/200/300/400/500 |
| `--sd-bd-field`                                   | 인풋류 필드 보더          | zinc-300                 |
| `--sd-bd-disabled`                                | 비활성 보더(색 치환 규약) | zinc-200                 |

### 시맨틱 슬롯 (키: gray·blue-gray·primary·info·success·warning·danger)

| 토큰                               | 역할                    | 기본값(일반 키 / gray·blue-gray) |
| ---------------------------------- | ----------------------- | -------------------------------- |
| `--sd-bg-{key}-solid` (+`-hover`)  | solid 면                | 500→600 / 400→500                |
| `--sd-bg-{key}-subtle` (+`-hover`) | 옅은 면                 | 50→100                           |
| `--sd-tx-{key}` (+`-hover`)        | 텍스트·아이콘·링크 단독 | 500→600 / 400→500                |
| `--sd-tx-{key}-solid`              | solid 면 위 텍스트      | white                            |
| `--sd-tx-{key}-subtle`             | subtle 면 위 텍스트     | 700 / 600                        |
| `--sd-bd-{key}-solid` (+`-hover`)  | solid 보더              | bg 동일                          |
| `--sd-bd-{key}-subtle`             | 옅은 보더               | 200 / 300                        |

### 포커스·스크롤바

| 토큰                                                           | 기본값                           |
| -------------------------------------------------------------- | -------------------------------- |
| `--sd-focus-ring-{color,width,offset}` (`:focus-visible` 규약) | blue-500 / 0.1667rem / 0.0833rem |
| `--sd-scrollbar-{thumb,thumb-hover,track}`                     | rgba(0,0,0,.05/.1/.03)           |

### 컴포넌트 장식 (방침 1, 2026-07-16 확정 — FIND-003 ③ 해소)

테마 오버라이드가 값 맵으로 못 잡던 컴포넌트 장식의 소비 지점. 기본값은 현행 시각 등가.

| 토큰                               | 역할                                     | 기본값                       |
| ---------------------------------- | ---------------------------------------- | ---------------------------- |
| `--sd-card-bd`                     | 카드 보더 색                             | transparent                  |
| `--sd-card-bd-active`              | 카드 focus-within 상단 보더 색           | transparent                  |
| `--sd-card-shadow` (+`-hover`)     | 카드 box-shadow(전체 값)                 | elevation(2)/(4) 등가 리터럴 |
| `--sd-modal-bd`                    | 모달 다이얼로그 보더 색                  | transparent                  |
| `--sd-modal-header-bg`             | 모달 헤더 배경                           | zinc-50                      |
| `--sd-modal-header-tx` (+`-muted`) | 모달 헤더 글자·닫기(muted=기본/tx=hover) | rgba(0,0,0,.87) / zinc-400   |
| `--sd-dropdown-bd`                 | 드롭다운 보더 색                         | zinc-300                     |
| `--sd-sheet-shadow`                | 시트 테이블 box-shadow                   | none                         |
| `--sd-permission-group-{bg,tx}`    | 권한표 그룹 첫 행 배경·글자              | cyan-500 / white             |

- `--sd-card-bd` 를 덮는 테마는 `--sd-card-bd-active` 도 함께 정의함(미정의 시 focus 에서 상단 보더만 transparent 로 뚫림).

### 그림자·기타

| 토큰                                         | 기본값                          |
| -------------------------------------------- | ------------------------------- |
| `--sd-shadow-{color,size,blur-mult}`         | rgba(0,0,0,.05) / 0.0833rem / 1 |
| `--sd-z-{toast,busy,dropdown,modal,sidebar}` | 9999/9998/5000/4000/3000        |
| `--sd-animation-duration`                    | 0.2s                            |

### 타이포·형태(테마 소유)

| 토큰                                                        | 기본값                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `--sd-font-size-{sm,default,lg,h1..h6}`                     | 0.9167 / 1 / 1.1667 / 2 / 1.5 / 1.3333 / 1.1667 / 1 / 0.9167 rem |
| `--sd-font-family{,-field,-monospace}` / `--sd-font-weight` | sans-serif / ui-sans-serif… / ui-monospace… / 400                |
| `--sd-radius-{xs,sm,default,lg,xl,xxl}`                     | 0.0833 / 0.1667 / 0.3333 / 0.5 / 0.6667 / 1 rem                  |

### 치수 그룹 (라이트/블루프린트 기본값 — IDE 다크가 오밀조밀로 덮음)

| 토큰                                               | 기본값                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `--sd-gap-{xxs,xs,sm,default,lg,xl,xxl,0,auto}`    | 0.0833 / 0.1667 / 0.3333 / 0.5 / 0.6667 / 1 / 1.5 rem / 0 / auto |
| `--sd-line-height` / `--sd-line-height-strip-unit` | 1.5em / 1.5                                                      |
| `--sd-sheet-{pv,ph}`                               | 0.1667 / 0.3333 rem                                              |
| `--sd-topbar-height` / `--sd-sidebar-width`        | 2.5rem / 14rem                                                   |

## 테마 값 맵

- 테마 = `--sd-*` 값 맵만(`scss/themes/_variables-*.scss` → theme-variant 레이어 발행). 셀렉터 오버라이드 금지 — surfaces 파일 없음.
- 치수(간격·행높이·시트 패딩·topbar 높이)도 테마 소유 — IDE 다크(`_variables-ide-dark.scss`)가 오밀조밀 치수를 값 맵으로 덮음.
- 값 맵은 라이트 기본값과의 차이만 기술함(같은 항목 생략).

## 검증

- 발행 전수·체이닝 금지 spec: `packages/angular/tests/features/theme/sd-tokens.spec.ts` — 카탈로그 키 추가 시 이 spec 의 목록도 함께 갱신함.
- 테마 핵심 쌍 WCAG 대비 게이트(DEC-012): `theme-contrast.spec.ts` — 본문 4.5:1·보조/UI 3:1, 의도적 저대비는 예외 목록 명시. 검사 유틸 `getWcagContrastRatio` 는 패키지 export(커스텀 테마 검증용).
