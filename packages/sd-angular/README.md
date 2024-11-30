# @simplysm/sd-angular

심플리즘 패키지 - Angular 모듈 (browser)

## 설치

```bash
npm install @simplysm/sd-angular
```

## 주요 기능

### 컴포넌트

- controls/: 다양한 UI 컨트롤 컴포넌트
- modals/: 모달 관련 컴포넌트
- bases/: 기본 컴포넌트

### 유틸리티

- directives/: Angular 디렉티브
- pipes/: Angular 파이프
- utils/: 유틸리티 함수
- providers/: Angular 프로바이더
- plugins/: 플러그인

## 의존성
ㅉ
### 주요 의존성
- Angular 18.x
- @fortawesome/fontawesome-svg-core
- echarts
- quill
- rxjs
- zone.js

### 스타일
- SCSS 기반 스타일링
- Pretendard 폰트 통합

## 사용법

1. 모듈 설정

```typescript
import { provideSdAngular } from '@simplysm/sd-angular';

@NgModule({
  imports: [
    // ...
  ],
  providers: [
    provideSdAngular()
  ]
})
export class AppModule { }
```

2. 스타일 적용

```scss
@import "@simplysm/sd-angular/styles.css";
```

## 라이선스

MIT

## 작성자

김석래
