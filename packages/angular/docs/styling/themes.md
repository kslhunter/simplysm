# Themes

## `.sd-theme-dark`

다크 모드 테마 클래스. `<body>`에 `SdThemeProvider`가 자동으로 토글한다.

`@layer theme-variant`에 정의되며, `:root`의 CSS 커스텀 프로퍼티를 오버라이드한다.

### 오버라이드 변수

| Category | Description |
|----------|-------------|
| `--theme-{group}-{shade}` | 모든 테마 색상이 반전된다. lightest가 어두운 톤, darkest가 밝은 톤으로 변환 |
| `--trans-*` | 투명도 값이 흰색 기반(`rgba(255,255,255,...)`)으로 변경 |
| `--text-trans-*` | 텍스트 색상이 흰색 기반으로 변경 (`dark: white`, `default: rgba(255,255,255,0.87)` 등) |
| `--border-color-*` | border 색상이 다크 테마 기준으로 변경 |
| `--background-color` | `#000` |
| `--background-rev-color` | `#fff` |
| `--control-color` | `#000` |
| `--busy-overlay-bg` | `rgba(0, 0, 0, 0.6)` |
| `--sheet-bg` | 다크 테마 시트 배경 |

### 이미지 반전

```css
.sd-theme-dark img:not(.no-invert) {
  filter: invert(1) hue-rotate(180deg);
}
```

다크 모드에서 모든 `<img>`가 자동 반전된다. 반전을 원하지 않는 이미지에 `class="no-invert"`를 추가한다.

### 활성화

`SdThemeProvider.dark` signal이 `true`일 때 `<body>`에 `.sd-theme-dark` 클래스가 추가된다. `provideSdAngular`가 localStorage와 자동 동기화한다.
