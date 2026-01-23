# @simplysm/solid

## 의존성

### tailwind-merge

- `tailwind-variants`에서 클래스 충돌 방지를 위해 필요한 의존성이다.
- WebStorm의 Tailwind CSS 플러그인이 `twJoin()` 내부의 클래스만 인식하므로, `tv()` 내부에서 클래스 배열 대신 `twJoin()`을 사용한다.

## ThemeContext

- localStorage 키: `sd-theme` (값: `"light"` | `"dark"`)
