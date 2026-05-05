# CSS Custom Properties

> **읽어야 하는 상황**: 디자인 토큰(색상, 간격, 폰트 등)을 오버라이드할 때.

`:root`에 선언되는 CSS 커스텀 프로퍼티. SCSS `$vars` 맵에서 `mixins.writeVars()`로 생성된다.

## Theme Colors

OKLCH 기반 17+5 색상 팔레트. 각 테마 그룹에 7단계 shade가 존재한다.

**테마 그룹**: gray, blue-gray, primary, secondary, info, success, warning, danger

**Shade 단계**: lightest (+90%), lighter (+75%), light (+60%), default, dark (-10%), darker (-25%), darkest (-40%)

| Property Pattern | Description |
|------------------|-------------|
| `--theme-{group}-lightest` | 가장 밝은 단계 |
| `--theme-{group}-lighter` | 밝은 단계 |
| `--theme-{group}-light` | 약간 밝은 단계 |
| `--theme-{group}-default` | 기본 단계 |
| `--theme-{group}-dark` | 약간 어두운 단계 |
| `--theme-{group}-darker` | 어두운 단계 |
| `--theme-{group}-darkest` | 가장 어두운 단계 |

**기본 색상 매핑** (OKLCH):

| Theme Group | Base Color |
|-------------|------------|
| gray | `oklch(0.707 0.022 261.325)` (gray) |
| blue-gray | `oklch(0.704 0.04 256.788)` (slate) |
| primary | `oklch(0.707 0.165 254.624)` (blue) |
| secondary | `oklch(0.707 0.165 254.624)` (blue) |
| info | `oklch(0.789 0.154 211.53)` (cyan) |
| success | `oklch(0.841 0.238 128.85)` (lime) |
| warning | `oklch(0.75 0.183 55.934)` (orange) |
| danger | `oklch(0.704 0.191 22.216)` (red) |

## Transparency

| Property | Default | Description |
|----------|---------|-------------|
| `--trans-darkest` | `rgba(0, 0, 0, 0.5)` | 가장 어두운 투명 |
| `--trans-darker` | `rgba(0, 0, 0, 0.4)` | |
| `--trans-dark` | `rgba(0, 0, 0, 0.3)` | |
| `--trans-default` | `rgba(0, 0, 0, 0.2)` | |
| `--trans-light` | `rgba(0, 0, 0, 0.1)` | |
| `--trans-lighter` | `rgba(0, 0, 0, 0.05)` | |
| `--trans-lightest` | `rgba(0, 0, 0, 0.03)` | |
| `--trans-rev-default` | `rgba(255, 255, 255, 0.1)` | 역방향 투명 |
| `--trans-rev-light` | `rgba(255, 255, 255, 0.2)` | |
| `--trans-rev-lighter` | `rgba(255, 255, 255, 0.3)` | |
| `--trans-rev-lightest` | `rgba(255, 255, 255, 0.4)` | |

## Text Colors

| Property | Default | Description |
|----------|---------|-------------|
| `--text-trans-dark` | `black` | 강조 텍스트 |
| `--text-trans-default` | `rgba(0, 0, 0, 0.87)` | 기본 텍스트 |
| `--text-trans-light` | `rgba(0, 0, 0, 0.6)` | 보조 텍스트 |
| `--text-trans-lighter` | `rgba(0, 0, 0, 0.38)` | 비활성 텍스트 |
| `--text-trans-lightest` | `rgba(0, 0, 0, 0.2)` | 최소 텍스트 |
| `--text-trans-rev-default` | `white` | 역방향 기본 텍스트 |
| `--text-trans-rev-dark` | `rgba(255, 255, 255, 0.7)` | 역방향 강조 텍스트 |
| `--text-trans-rev-darker` | `rgba(255, 255, 255, 0.5)` | 역방향 더 강조 |

## Font Size

| Property | Default | Description |
|----------|---------|-------------|
| `--font-size-h1` | `2rem` | h1 |
| `--font-size-h2` | `1.5rem` | h2 |
| `--font-size-h3` | `1.3333rem` | h3 |
| `--font-size-h4` | `1.1667rem` | h4 |
| `--font-size-h5` | `1rem` | h5 |
| `--font-size-h6` | `0.9167rem` | h6 |
| `--font-size-lg` | `1.1667rem` | 큰 폰트 |
| `--font-size-default` | `1rem` | 기본 폰트 |
| `--font-size-sm` | `0.9167rem` | 작은 폰트 |

## Gap (Spacing)

| Property | Default | Description |
|----------|---------|-------------|
| `--gap-xxs` | `0.0833rem` | 초소형 |
| `--gap-xs` | `0.1667rem` | 소형 |
| `--gap-sm` | `0.3333rem` | 중소형 |
| `--gap-default` | `0.5rem` | 기본 |
| `--gap-lg` | `0.6667rem` | 중대형 |
| `--gap-xl` | `1rem` | 대형 |
| `--gap-xxl` | `1.5rem` | 초대형 |
| `--gap-0` | `0` | 없음 |
| `--gap-auto` | `auto` | 자동 |

## Border

| Property | Default | Description |
|----------|---------|-------------|
| `--border-color-lighter` | `var(--theme-gray-lightest)` | 가장 밝은 border |
| `--border-color-light` | `var(--theme-gray-lighter)` | 밝은 border |
| `--border-color-default` | `var(--theme-gray-light)` | 기본 border |
| `--border-color-dark` | `var(--theme-gray-default)` | 어두운 border |
| `--border-color-darker` | `var(--theme-gray-dark)` | 가장 어두운 border |
| `--border-radius-xs` | `var(--gap-xxs)` | |
| `--border-radius-sm` | `var(--gap-xs)` | |
| `--border-radius-default` | `var(--gap-sm)` | |
| `--border-radius-lg` | `var(--gap-default)` | |
| `--border-radius-xl` | `var(--gap-lg)` | |
| `--border-radius-xxl` | `var(--gap-xl)` | |

## Layout & Z-Index

| Property | Default | Description |
|----------|---------|-------------|
| `--line-height` | `1.5em` | 기본 line-height |
| `--font-family` | `sans-serif` | 기본 폰트 패밀리 |
| `--font-family-monospace` | `monospace` | 코드 폰트 패밀리 |
| `--background-color` | `white` | 페이지 배경색 |
| `--background-rev-color` | `black` | 역방향 배경색 |
| `--control-color` | `white` | 컨트롤 배경색 |
| `--busy-overlay-bg` | `rgba(255, 255, 255, 0.6)` | busy 오버레이 배경 |
| `--animation-duration` | `0.2s` | 애니메이션 지속 시간 |
| `--elevation-size` | `0.0833rem` | elevation 단위 |
| `--sidebar-width` | `15em` | 사이드바 너비 |
| `--topbar-height` | `3em` | 탑바 높이 |
| `--z-index-toast` | `9999` | 토스트 z-index |
| `--z-index-busy` | `9998` | busy z-index |
| `--z-index-dropdown` | `5000` | 드롭다운 z-index |
| `--z-index-modal` | `4000` | 모달 z-index |
| `--z-index-sidebar` | `3000` | 사이드바 z-index |

## Sheet

| Property | Default | Description |
|----------|---------|-------------|
| `--sheet-pv` | `var(--gap-xs)` | 시트 셀 수직 padding |
| `--sheet-ph` | `var(--gap-sm)` | 시트 셀 수평 padding |
| `--sheet-bg` | `var(--theme-gray-lightest)` | 시트 배경색 |

## Breakpoints (SCSS 전용)

CSS 커스텀 프로퍼티가 아닌 SCSS 변수. media query에서 사용된다.

| Variable | Value | Description |
|----------|-------|-------------|
| `$breakpoint-mobile` | `520px` | 모바일 |
| `$breakpoint-xxs` | `800px` | 초소형 |
| `$breakpoint-xs` | `1024px` | 소형 |
| `$breakpoint-sm` | `1280px` | 중소형 |
