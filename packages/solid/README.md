# @simplysm/solid

심플리즘 프레임워크의 SolidJS UI 컴포넌트 패키지이다.

## 설치

```bash
npm install @simplysm/solid
# 또는
pnpm add @simplysm/solid
```

## 설정

### 스타일 import

애플리케이션 엔트리 포인트에서 스타일 파일을 import한다:

```typescript
import "@simplysm/solid/styles.css";
```

### Tailwind CSS 설정 (v4)

프로젝트의 CSS 파일에서 `@source` 지시문을 사용하여 이 패키지의 컴포넌트를 포함한다:

```css
@source "./node_modules/@simplysm/solid/dist/**/*.js";
```

## 사용법

```tsx
import { SdButton } from "@simplysm/solid";

function App() {
  return (
    <div>
      <SdButton>기본 버튼</SdButton>
      <SdButton theme="primary">Primary 버튼</SdButton>
      <SdButton theme="link-primary">Link Primary 버튼</SdButton>
      <SdButton size="sm">작은 버튼</SdButton>
      <SdButton inset>Inset 버튼</SdButton>
    </div>
  );
}
```

## 컴포넌트

### SdButton

버튼 컴포넌트이다.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `theme` | `"default"` | 색상 테마. filled: `"default"` \| `"primary"` \| `"secondary"` \| `"info"` \| `"success"` \| `"warning"` \| `"danger"` \| `"gray"` \| `"blue-gray"`, link: `"link-primary"` \| `"link-secondary"` \| `"link-info"` \| `"link-success"` \| `"link-warning"` \| `"link-danger"` \| `"link-gray"` \| `"link-blue-gray"` |
| `size` | `"default"` | 크기. `"default"` \| `"sm"` \| `"lg"` |
| `inset` | `false` | 부모 요소에 삽입되는 형태. 테두리와 라운드를 제거한다. theme이 미지정이거나 'default'인 경우 link-primary가 자동 적용된다. |

HTML `<button>` 요소의 모든 표준 속성을 지원한다.

## 테마

### ThemeProvider

테마 컨텍스트를 제공하는 Provider 컴포넌트이다.

```tsx
import { ThemeProvider } from "@simplysm/solid";

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <MyApp />
    </ThemeProvider>
  );
}
```

| Prop | 기본값 | 설명 |
|------|--------|------|
| `defaultTheme` | 시스템 설정 또는 `"light"` | 초기 테마. `"light"` \| `"dark"` |

### useTheme

테마 상태에 접근하는 hook이다. ThemeProvider 내부에서만 사용 가능하다.

```tsx
import { useTheme } from "@simplysm/solid";

function ThemeToggle() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      현재: {theme()}
    </button>
  );
}
```

| 반환값 | 타입 | 설명 |
|--------|------|------|
| `theme` | `Accessor<"light" \| "dark">` | 현재 테마 값 |
| `setTheme` | `(theme: Theme) => void` | 테마 설정 함수 |
| `toggleTheme` | `() => void` | 테마 토글 함수 |

## 디렉티브

### ripple

요소 클릭 시 물결 애니메이션 효과를 추가하는 directive이다.

```tsx
import { ripple } from "@simplysm/solid";

// directive 등록 (tree-shaking 방지를 위해 명시적 참조 필요)
void ripple;

function Button() {
  return <button use:ripple={true}>Click me</button>;
}
```

| 값 | 설명 |
|----|------|
| `true` | ripple 효과 활성화 |
| `false` | ripple 효과 비활성화 |

ripple 색상은 CSS 변수 `--color-ripple`로 지정한다.

## 라이선스

Apache-2.0
