# Worker 경로 변환 Angular 빌드 통합 검증

## 전제 조건
- Angular 클라이언트 패키지가 `sd-service-client`를 의존하고 있다
- 서버가 실행 중이며 WebSocket 통신이 가능하다

## 수행 절차

### 1. Angular 클라이언트 빌드
1. `yarn build --packages {angular-client-package}` 실행
2. 빌드 출력 디렉토리에서 chunk 파일 검색

### 2. 번들 출력 검증
1. 빌드된 chunk 파일에서 `import_meta.resolve` 또는 `import.meta.resolve` 검색
2. 해당 패턴이 없어야 한다
3. `./workers/client-protocol.worker-` 패턴이 string literal로 존재해야 한다
4. `dist/workers/` 하위에 `client-protocol.worker-{hash}.js` 파일이 생성되어야 한다

### 3. 런타임 검증
1. Angular 앱을 브라우저(Chrome)에서 실행
2. 서버로부터 30KB 이상의 WebSocket 응답을 발생시키는 작업 수행
3. 콘솔에 `TypeError: import_meta.resolve is not a function` 에러가 발생하지 않아야 한다
4. 응답이 정상적으로 디코딩되어 화면에 표시되어야 한다

## 기대 결과
- 빌드 출력에 `import.meta.resolve` 런타임 호출이 없다
- 워커 파일이 별도 빌드되어 `workers/` 하위에 존재한다
- 30KB 이상 응답에서 Worker가 정상 동작한다
