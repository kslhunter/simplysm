# @simplysm/solid

## Props Interface 컨벤션

### 컨테이너 컴포넌트 (children 있음)

```typescript
extends ParentProps, Omit<JSX.*>, VariantProps<>, 커스텀Props
```

### 필드 컴포넌트 (input 기반)

```typescript
extends Omit<JSX.InputHTMLAttributes>, BaseFieldProps
```

### 단순 컴포넌트

```typescript
extends ParentProps 또는 단순 객체
```

## Context 에러 처리

모든 Context hook은 Provider 외부에서 호출 시 SdError를 throw한다.

## 의존성

### tailwind-merge

- `tailwind-variants`에서 클래스 충돌 방지를 위해 필요한 의존성이다.
- WebStorm의 Tailwind CSS 플러그인이 `twJoin()` 내부의 클래스만 인식하므로, `tv()` 내부에서 클래스 배열 대신 `twJoin()`을 사용한다.

## ThemeContext

- localStorage 키: `theme` (값: `"light"` | `"dark"`)

## Tailwind CSS v4 다크 모드 설정

클래스 기반 다크 모드(`.dark` 클래스)를 사용하려면 `@custom-variant`를 정의해야 한다.

```css
@custom-variant dark (&:where(.dark, .dark *));
```

## Tailwind CSS v4 동적 테마 패턴

다크 모드 등 런타임에 변경되는 테마 값을 사용하려면 순환 참조를 피해야 한다.

```css
/* 잘못된 패턴 - 순환 참조 */
@theme {
  --color-bg-elevated: var(--color-bg-elevated);
}

/* 올바른 패턴 - 별도 CSS 변수 사용 */
:root {
  --sd-bg-elevated: var(--color-gray-50);
}
:root.dark {
  --sd-bg-elevated: var(--color-gray-800);
}
@theme inline {
  --color-bg-elevated: var(--sd-bg-elevated);
}
```

- `:root`와 `:root.dark`에서 `--sd-*` 접두사를 사용하는 CSS 변수를 정의한다.
- `@theme inline`에서 Tailwind 테마 변수가 `--sd-*` 변수를 참조하도록 설정한다.
