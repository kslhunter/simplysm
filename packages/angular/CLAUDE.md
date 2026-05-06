# CLAUDE.md — `@simplysm/angular`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

심플리즘 표준 Angular UI 라이브러리. `core-browser` + `service-client` 위에 컨트롤·데이터 위젯·페이지 레이아웃·테마·`provideSdAngular()` 부트스트랩을 얹는다. 빌드 타겟 `browser`.

## 구조

| 경로                | 내용                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `core/`             | 부트스트랩과 횡단 관심사 — `provideSdAngular`, `app-structure`, `routing`, `service-client`(서비스 주입), `modal`, `toast`, `busy`, `error-handler`, `validation`, `selection`, `shared-data`, `show-effect`, `format.pipe`, `ripple`, `print`, `file-dialog`, `commands`, `template`, `directive-input-signals`, `setupModelHook`, `setupBgTheme`, `setSafeStyle`, `mark`, `events`. |
| `controls/`         | 입력·표시 컴포넌트 — `button`, `checkbox`, `collapse`, `dropdown`, `form`, `gap`, `input`, `list`, `pagination`, `select`, `tab`. |
| `data/`             | 데이터 위젯 — `crud`, `kanban`, `permission-table`, `shared-data`, `sheet`, `state-preset`.                          |
| `features/`         | 도메인 확장 — `address`(주소 검색), `editor`(Tiptap), `theme`(다크/색상), `visual`(차트·바코드·PDF·이미지 캡처).     |
| `layout/`           | 페이지 골격 — `dock`, `sidebar`, `topbar`.                                                                           |
| `scss/`             | 글로벌 스타일 — `commons/`, `controls/`, `themes/`, `styles.scss`.                                                   |
| `scss.d.ts`         | `*.scss` import 타입 선언.                                                                                           |

워크스페이스 의존: `@simplysm/core-common`, `@simplysm/core-browser`, `@simplysm/service-common`, `@simplysm/service-client`.
주요 외부: Angular 21, RxJS, Tiptap(에디터), `@ng-icons/tabler-icons`, `echarts`, `bwip-js`(바코드), `html-to-image`, `jspdf`, `tabbable`.

## 작업 시 주의

- 모든 컴포넌트는 **standalone** + signals 기반. NgModule 신규 도입 금지.
- 컨트롤에 적용되는 lint 규칙(자체 `@simplysm/lint`):
  - `ng-no-async-effect` — `effect()` 안에서 `async` 금지.
  - `ng-template-no-strict-null-check` — 템플릿에서 non-null assertion(`!`) 금지.
  - `ng-template-sd-require-binding-attrs` — `sd-` prefix 컴포넌트는 명시 binding 필수.
  - `ts-no-unused-injects`, `ts-no-unused-protected-readonly` — DI 정리 강제.
- 새 컨트롤 위치 기준:
  - 단일 입력/표시 → `controls/`
  - 여러 행/항목을 다루는 데이터 위젯 → `data/`
  - 도메인 특화(에디터·차트 등) → `features/`
- 테스트는 Vitest `angular` 프로젝트(chromium + `sdAngularPlugin` + TestBed). 파일은 `packages/angular/tests` 하위.
- 새 글로벌 SCSS 변수·믹스인은 `scss/commons/` 에. 컨트롤 전용 스타일은 `scss/controls/<name>.scss` 로.
