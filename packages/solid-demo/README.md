# @simplysm/solid-demo

`@simplysm/solid` 패키지의 SolidJS UI 컴포넌트 데모 애플리케이션이다.

## 개요

이 패키지는 `@simplysm/solid` 패키지에서 제공하는 컴포넌트들의 다양한 사용 예시를 시연한다.
실제 사용 환경에서의 동작과 스타일을 확인할 수 있다.

## 실행 방법

프로젝트 루트에서 다음 명령어를 실행한다:

```bash
pnpm dev --filter @simplysm/solid-demo
```

개발 서버가 시작되면 브라우저에서 자동으로 열린다.

## 시연 기능

### SdButton 컴포넌트

- **Theme Variants**: 9가지 filled 테마 변형 (default, primary, secondary, info, success, warning, danger, gray, slate)
- **Link Variants**: 8가지 link 테마 변형 (link-primary, link-secondary, link-info, link-success, link-warning, link-danger, link-gray, link-slate)
- **Size Variants**: 3가지 크기 변형 (sm, default, lg)
- **Disabled State**: 비활성화 상태 표시
- **Inset Style**: 부모 요소에 삽입되는 형태

### 테마 시스템

- **Light/Dark Mode**: 테마 토글 버튼을 통한 실시간 테마 전환
- **Ripple Effect**: 버튼 클릭 시 물결 애니메이션 효과

## 라이선스

Apache-2.0
