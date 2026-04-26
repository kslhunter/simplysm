# CSS Classes

> **읽어야 하는 상황**: 레이아웃/유틸리티 클래스로 스타일링할 때. 커스텀 프로퍼티 오버라이드는 [variables.md](./variables.md), 테마 전환은 [themes.md](./themes.md) 참조.

전역 유틸리티 CSS 클래스. `@layer base, theme-variant, utilities` 순서로 구성되며, 유틸리티 클래스는 `@layer utilities`에 정의된다.

## Layout

### Flex

| Class | Description |
|-------|-------------|
| `.flex-row` | `display: flex; flex-direction: row` (기본 gap 없음) |
| `.flex-column` | `display: flex; flex-direction: column` (기본 gap 없음) |
| `.flex-row-inline` | `display: inline-flex; flex-direction: row` |
| `.flex-column-inline` | `display: inline-flex; flex-direction: column` |
| `.flex-fill` | `flex: 1 1 auto; overflow: auto` |
| `.flex-auto` | `flex: 1 0 auto` |
| `.flex-min` | `flex: 0 0 0` |

### Grid

| Class | Description |
|-------|-------------|
| `.grid` | `display: grid; grid-template-columns: repeat(12, 1fr)` |
| `.grid-{1..12}` | `grid-column-end: span {n}` |
| `.grid-sm-{1..12}` | `@media (max-width: 1280px)` 반응형 |
| `.grid-xs-{1..12}` | `@media (max-width: 1024px)` 반응형 |
| `.grid-xxs-{1..12}` | `@media (max-width: 800px)` 반응형 |

### Alignment

| Class | Description |
|-------|-------------|
| `.main-align-start` | `justify-content: start` |
| `.main-align-end` | `justify-content: end` |
| `.main-align-center` | `justify-content: center` |
| `.cross-align-start` | `align-items: start` |
| `.cross-align-end` | `align-items: end` |
| `.cross-align-center` | `align-items: center` |

## Spacing

gap 키: `xxs`, `xs`, `sm`, `default`, `lg`, `xl`, `xxl`, `0`, `auto`

| Pattern | Description |
|---------|-------------|
| `.p-{key}` | 전체 padding |
| `.pv-{key}` | 수직 padding (top + bottom) |
| `.ph-{key}` | 수평 padding (left + right) |
| `.pt-{key}`, `.pr-{key}`, `.pb-{key}`, `.pl-{key}` | 방향별 padding |
| `.m-{key}` | 전체 margin |
| `.mv-{key}` | 수직 margin |
| `.mh-{key}` | 수평 margin |
| `.mt-{key}`, `.mr-{key}`, `.mb-{key}`, `.ml-{key}` | 방향별 margin |
| `.gap-{key}` | flex/grid gap |
| `.sw-{key}` | width |
| `.sh-{key}` | height |
| `.p-{key}-{key}` | padding: vertical horizontal |
| `.m-{key}-{key}` | margin: vertical horizontal |
| `.t-{key}`, `.r-{key}`, `.b-{key}`, `.l-{key}` | position offset (top, right, bottom, left) |

## Card

| Class | Description |
|-------|-------------|
| `.card` | 카드 컨테이너 (배경, 그림자, 진입 애니메이션) |

## Form

| Class | Description |
|-------|-------------|
| `.form-box` | 수직 폼 레이아웃 (`flex-direction: column`, gap `default`) |
| `.form-box-inline` | 인라인 폼 레이아웃 (`inline-flex`, `flex-wrap: wrap`, gap `sm`) |
| `.form-table` | 테이블 형태 폼 레이아웃 (`display: table`) |
| `.form-table-header` | form-table 내 섹션 헤더 (`<th class="form-table-header">`) |
| `.form-control` | 기본 폼 컨트롤 스타일 (padding, font, line-height) |

## Table

| Class | Description |
|-------|-------------|
| `.table` | 기본 테이블 스타일 (border, spacing) |
| `.table-inset` | 외곽 border 제거 |
| `.table-inline` | `width: auto` |
| `.table-bd-v` | 수직 border만 제거 |
| `.table-bd-h` | 수평 border만 제거 |

## Display

| Class | Description |
|-------|-------------|
| `.block` | `display: block` |
| `.inline-block` | `display: inline-block` |
| `.inline` | `display: inline` |
| `.fill` | `height: 100%; width: 100%; overflow: auto` |
| `.nowrap` | `white-space: nowrap` |
| `.overflow-auto` | `overflow: auto` |
| `.position-relative` | `position: relative` |
| `.sticky-top` | `position: sticky; top: 0; z-index: 1` |

## Text

| Pattern | Description |
|---------|-------------|
| `.ft-size-{key}` | 폰트 크기 (key: h1, h2, h3, h4, h5, h6, lg, default, sm) |
| `.tx-left`, `.tx-right`, `.tx-center` | text-align |
| `.tx-line-through` | 취소선 |
| `.tx-underline` | 밑줄 |
| `.tx-trans-{key}` | 텍스트 투명도 색상 (key: dark, default, light, lighter, lightest, rev-default, rev-dark, rev-darker) |
| `.tx-theme-{theme}-{shade}` | 테마별 텍스트 색상 |

## Background

| Pattern | Description |
|---------|-------------|
| `.bg-theme-{theme}-{shade}` | 테마별 배경색 |
| `.bg-trans-{key}` | 투명도 배경색 |
| `.bg-default` | 기본 배경색 (`--background-color`) |
| `.bg-control` | 컨트롤 배경색 (`--control-color`) |

## Border

| Pattern | Description |
|---------|-------------|
| `.bd` | `border: 1px solid` |
| `.bd-none` | `border: none` |
| `.bd-transparent` | `border-color: transparent` |
| `.bd-theme-{theme}-{shade}` | 테마별 border 색상 |
| `.bd-trans-{key}` | 투명도 border 색상 |
| `.bd-color-{key}` | border-color 변수 (key: lighter, light, default, dark, darker) |
| `.bd{d}` | 방향별 border (d: t, r, b, l) |
| `.bd{d}-theme-{theme}-{shade}` | 방향별 테마 border 색상 |
| `.bd{d}-trans-{key}` | 방향별 투명도 border 색상 |
| `.bd{d}-color-{key}` | 방향별 border-color 변수 |
| `.bd{d}-none` | 방향별 border 제거 |
| `.bd{d}-transparent` | 방향별 border 투명 |
| `.bd-width-{key}` | border 두께 |
| `.bd{d}-width-{key}` | 방향별 border 두께 |
| `.bd-radius-{key}` | border-radius (key: xs, sm, default, lg, xl, xxl) |
| `.bd{d}-radius-{key}` | 방향별 border-radius (d: t, b, l, r) |

## Special

| Class | Description |
|-------|-------------|
| `.help` | 도움말 스타일 (dotted underline, help cursor) |
| `.control-header` | 컨트롤 헤더 (작은 폰트, 회색) |
| `.page-header` | 페이지 헤더 (작은 폰트, 회색, 하단 여백) |
| `.sh-topbar` | `height: var(--topbar-height)` |
| `.sw-sidebar` | `width: var(--sidebar-width)` |
