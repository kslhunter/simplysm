# Styling

`dist/styles.css`로 컴파일되며, `package.json`의 `style` 필드에서 참조된다. CSS Layers: `@layer base, theme-variant, utilities`.

## CSS Classes

### Flexbox

| Class | Description |
|-------|-------------|
| `.flex-row` | `display: flex; flex-direction: row; flex-wrap: nowrap` |
| `.flex-column` | `display: flex; flex-direction: column; flex-wrap: nowrap` |
| `.flex-row-inline` | `display: inline-flex; flex-direction: row` |
| `.flex-column-inline` | `display: inline-flex; flex-direction: column` |
| `.flex-fill` | `flex: 1 1 auto; overflow: auto` (가용 공간 채우기) |
| `.flex-auto` | `flex: 1 0 auto` (컨텐츠 크기 유지하며 확장) |
| `.flex-min` | `flex: 0 0 0` (최소 크기) |

### Grid

| Class | Description |
|-------|-------------|
| `.grid` | `display: grid` |
| `.grid-{1..12}` | `grid-template-columns: repeat(N, 1fr)` |
| `.grid-sm-{1..12}` | `@media (max-width: 1280px)` 반응형 |
| `.grid-xs-{1..12}` | `@media (max-width: 1024px)` 반응형 |
| `.grid-xxs-{1..12}` | `@media (max-width: 800px)` 반응형 |

### Layout

| Class | Description |
|-------|-------------|
| `.card` | 카드 스타일 (배경, 테두리, 라운드, 엘리베이션) |
| `.fill` | `height: 100%; width: 100%; overflow: auto` |
| `.sticky-top` | `position: sticky; top: 0; z-index: 1` |
| `.overflow-auto` | `overflow: auto` |
| `.position-relative` | `position: relative` |
| `.nowrap` | `white-space: nowrap` |

### Form Layout

| Class | Description |
|-------|-------------|
| `.form-box` | 폼 박스 레이아웃 |
| `.form-box-inline` | 인라인 폼 박스 |
| `.form-table` | 테이블 형태 폼 |
| `.form-control` | 기본 폼 컨트롤 스타일 (padding, border, font) |
| `.table` | 테이블 스타일 |
| `.table-inset` | 테두리 없는 테이블 |
| `.table-inline` | 인라인 테이블 |
| `.table-bd-v` | 수직 테두리만 있는 테이블 |
| `.table-bd-h` | 수평 테두리만 있는 테이블 |

### Spacing

키: `xxs`, `xs`, `sm`, `default`, `lg`, `xl`, `xxl`, `0`, `auto`

| Pattern | Description |
|---------|-------------|
| `.p-{key}` | 전체 padding |
| `.pv-{key}`, `.ph-{key}` | 수직/수평 padding |
| `.pt-{key}`, `.pr-{key}`, `.pb-{key}`, `.pl-{key}` | 방향별 padding |
| `.m-{key}` | 전체 margin |
| `.mv-{key}`, `.mh-{key}` | 수직/수평 margin |
| `.mt-{key}`, `.mr-{key}`, `.mb-{key}`, `.ml-{key}` | 방향별 margin |
| `.gap-{key}` | flex/grid gap |
| `.sw-{key}` | width 설정 |
| `.sh-{key}` | height 설정 |
| `.p-{key1}-{key2}` | `padding: {key1} {key2}` 조합 |

### Font Size

| Class | Description |
|-------|-------------|
| `.ft-size-{key}` | 폰트 크기 (h1~h6, sm, default, lg 등) |

### Text

| Class | Description |
|-------|-------------|
| `.tx-left`, `.tx-right`, `.tx-center` | 텍스트 정렬 |
| `.tx-line-through` | 취소선 |
| `.tx-underline` | 밑줄 |
| `.tx-trans-{key}` | 텍스트 투명도 색상 |
| `.tx-theme-{group}-{shade}` | 테마 텍스트 색상 |

### Background

| Class | Description |
|-------|-------------|
| `.bg-theme-{group}-{shade}` | 테마 배경 색상 |
| `.bg-trans-{key}` | 투명도 배경 |
| `.bg-default` | 기본 배경 |
| `.bg-control` | 컨트롤 배경 |

### Border

| Class | Description |
|-------|-------------|
| `.bd` | 전체 테두리 |
| `.bdt`, `.bdr`, `.bdb`, `.bdl` | 방향별 테두리 |
| `.bd-theme-{group}-{shade}` | 테마 테두리 색상 |
| `.bd-trans-{key}` | 투명도 테두리 |
| `.bd-none`, `.bd-transparent` | 테두리 없음/투명 |
| `.bd-radius-{key}` | 테두리 라운드 |
| `.bd-width-{key}` | 테두리 두께 |

### Alignment

| Class | Description |
|-------|-------------|
| `.main-align-start`, `.main-align-end`, `.main-align-center` | justify-content |
| `.cross-align-start`, `.cross-align-end`, `.cross-align-center` | align-items |

### Special

| Class | Description |
|-------|-------------|
| `.sh-topbar` | 탑바 높이 |
| `.sw-sidebar` | 사이드바 너비 |
| `.help` | 도움말 스타일 (점선 밑줄, 도움말 커서) |
| `.control-header` | 컨트롤 헤더 텍스트 |
| `.page-header` | 페이지 헤더 텍스트 |

## CSS Custom Properties

### Theme Colors

OKLCH 기반 색상 팔레트. 각 그룹에 7단계 shade가 있다.

테마 그룹: `gray`, `blue-gray`, `primary`, `secondary`, `info`, `success`, `warning`, `danger`

| Property | Description |
|----------|-------------|
| `--theme-{group}-lightest` | 가장 밝은 색조 |
| `--theme-{group}-lighter` | 더 밝은 색조 |
| `--theme-{group}-light` | 밝은 색조 |
| `--theme-{group}-default` | 기본 색조 |
| `--theme-{group}-dark` | 어두운 색조 |
| `--theme-{group}-darker` | 더 어두운 색조 |
| `--theme-{group}-darkest` | 가장 어두운 색조 |

### Layout

| Property | Description |
|----------|-------------|
| `--background-color` | body 배경 색상 |
| `--control-color` | 컨트롤 배경 색상 |
| `--font-family` | 기본 폰트 패밀리 |
| `--font-family-monospace` | 고정폭 폰트 패밀리 |
| `--font-size-default` | 기본 폰트 크기 |
| `--line-height` | 기본 줄 높이 |
| `--border-radius-default` | 기본 테두리 라운드 |
| `--topbar-height` | 탑바 높이 |
| `--sidebar-width` | 사이드바 너비 |
| `--elevation-size` | 그림자 기본 크기 |
| `--animation-duration` | 애니메이션 지속 시간 |

### Gap (Spacing)

| Property | Description |
|----------|-------------|
| `--gap-xxs` | 가장 작은 간격 |
| `--gap-xs` | 매우 작은 간격 |
| `--gap-sm` | 작은 간격 |
| `--gap-default` | 기본 간격 |
| `--gap-lg` | 큰 간격 |
| `--gap-xl` | 매우 큰 간격 |
| `--gap-xxl` | 가장 큰 간격 |

### Transparency

| Property | Description |
|----------|-------------|
| `--trans-lightest` | 가장 투명한 반투명 |
| `--trans-lighter` | 더 투명한 반투명 |
| `--trans-light` | 투명한 반투명 |
| `--trans-default` | 기본 반투명 |
| `--trans-dark` | 불투명한 반투명 |
| `--trans-darker` | 더 불투명한 반투명 |
| `--trans-darkest` | 가장 불투명한 반투명 |

### Text Transparency

| Property | Description |
|----------|-------------|
| `--text-trans-default` | 기본 텍스트 색상 |
| `--text-trans-light` | 밝은 텍스트 색상 |
| `--text-trans-lighter` | 더 밝은 텍스트 색상 |
| `--text-trans-dark` | 어두운 텍스트 색상 |

## Themes

### `.sd-theme-dark`

다크 모드 테마. `SdThemeProvider.dark` signal로 body에 토글된다. `themes/_variables-dark.scss`에서 색상 팔레트를 반전한다.

- 배경: 어두운 색상으로 전환
- 텍스트: 밝은 색상으로 전환
- `img:not(.no-invert)`: 이미지 자동 반전

### Responsive Breakpoints

SCSS 변수로 정의되어 media query에서 사용된다:

| Variable | Value | Description |
|----------|-------|-------------|
| `$breakpoint-mobile` | `520px` | 모바일 |
| `$breakpoint-xxs` | `800px` | 매우 작은 화면 |
| `$breakpoint-xs` | `1024px` | 작은 화면 |
| `$breakpoint-sm` | `1280px` | 중간 화면 |

## Mixins / Functions

| Name | Signature | Description |
|------|-----------|-------------|
| `writeVars` | `@mixin writeVars($value, $prevKey)` | 맵을 재귀 순회하여 CSS custom properties 생성 |
| `elevation` | `@mixin elevation($value)` | box-shadow 기반 엘리베이션 효과. 양수=외부, 음수=내부, 0/none=없음 |
| `form-control-base` | `@mixin form-control-base()` | 폼 컨트롤 기본 스타일 (display, padding, border, font) |
| `help` | `@mixin help()` | 도움말 스타일 (점선 밑줄, 커서) |
| `border-direction-variants` | `@mixin border-direction-variants($dir, $d)` | 방향별 테두리 유틸리티 클래스 생성 |
| `flex-direction` | `@mixin flex-direction($direction, $defaultGap?)` | flex-direction 설정 + Chrome 61 gap 폴백 |
