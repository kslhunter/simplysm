# Mixins / Functions

공개 SCSS mixin과 function. `scss/commons/_mixins.scss`에 정의된다.

## Mixins

### `writeVars($value, $prevKey)`

SCSS 맵을 CSS 커스텀 프로퍼티로 변환하여 출력한다. 중첩 맵은 키를 `-`로 연결한다.

```scss
@include mixins.writeVars(variables.$vars, "");
// 출력: --theme-gray-lightest: ...; --theme-gray-lighter: ...; ...
```

| Param | Type | Description |
|-------|------|-------------|
| `$value` | `map \| value` | 변환할 SCSS 맵 또는 값 |
| `$prevKey` | `string` | 키 접두사 (루트 호출 시 `""`) |

### `elevation($value)`

Material Design 스타일 box-shadow를 적용한다.

```scss
@include mixins.elevation(4);  // 양수: 외부 그림자
@include mixins.elevation(-2); // 음수: 내부(inset) 그림자
@include mixins.elevation(0);  // 그림자 제거
```

| Param | Type | Description |
|-------|------|-------------|
| `$value` | `number` | 그림자 강도. 양수: 외부, 음수: 내부, 0/none: 제거 |

### `form-control-base()`

��본 폼 컨트롤 스타일. padding, font, line-height, color를 설정한다. 매개변수 없음.

```scss
@include mixins.form-control-base();
// display: block; padding: var(--gap-sm) var(--gap-default);
// font-size, font-family, font-variant-numeric, line-height, color
```

### `help()`

도움말 스타일 (점선 밑줄 + help 커서). 매개변수 없음.

```scss
@include mixins.help();
// text-decoration-line: underline; text-decoration-style: dotted; cursor: help;
```

### `border-direction-variants($dir, $d)`

특정 방향의 border 유틸리티 클래스를 일괄 생성한다. 내부적으로 `_styles.scss`에서 4방향에 대해 호출된다.

| Param | Type | Description |
|-------|------|-------------|
| `$dir` | `string` | CSS 방향 (`top`, `right`, `bottom`, `left`) |
| `$d` | `string` | 약어 (`t`, `r`, `b`, `l`) |

### `flex-direction($direction, $defaultGap?)`

flex-direction과 gap을 설정한다. Chrome 84 이하(flex gap 미지원)를 위한 margin 폴백을 포함한다.

```scss
@include mixins.flex-direction(row, var(--gap-sm));
// flex-direction: row; gap: var(--gap-sm);
// + @supports not (appearance: auto) { gap: 0; > * + * { margin-left: ... } }
```

| Param | Type | Description |
|-------|------|-------------|
| `$direction` | `row \| column` | flex 방향 |
| `$defaultGap` | `value \| null` | 기본 gap 값 (선택) |

## Functions

### `to-rgb($oklch-color)`

OKLCH 색상을 RGB 색상 공간으로 변환한다. `_variables.scss`에 정의된다.

```scss
$blue: to-rgb(oklch(0.707 0.165 254.624));
```

### `color-map($base, $offset?)`

기본 색상에서 7단계(lightest~darkest) shade 맵을 생성한다. `_variables.scss`에 정의된다.

```scss
$primary: color-map(map.get($colors, blue));
// (lightest: ..., lighter: ..., light: ..., default: ..., dark: ..., darker: ..., darkest: ...)
```

| Param | Type | Description |
|-------|------|-------------|
| `$base` | `color` | 기본 색상 |
| `$offset` | `percentage` | lightness 오프셋 (기본 `0%`) |
