# 클라이언트 기본 지침

클라이언트 코드(앱·`@simplysm/angular` 라이브러리 포함) 작성 시 공통으로 따르는 규칙.

## Angular template 규칙

- **`$any` 사용 금지** (lint error). template 에서 타입이 안 풀리면 컴포넌트 클래스의 타입 설계를 바로잡아 해결. `eslint-disable-next-line` 으로 우회 금지.
