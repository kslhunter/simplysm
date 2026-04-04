# Angular Linker Transform — 수동 검증

## 전제 조건

- Angular 21 클라이언트 패키지가 `sd.config.ts`에 등록되어 있다
- `pnpm dev` 명령으로 dev 서버를 시작할 수 있다

## 수행 절차

1. `pnpm dev {client-package}` 실행
2. 브라우저에서 dev 서버 URL 접속
3. 브라우저 DevTools Console 탭 확인

## 기대 결과

- `[vite] connected.` 메시지 이후 `JIT compilation failed` 에러가 발생하지 않는다
- `The injectable '_PlatformLocation' needs to be compiled using the JIT compiler` 에러가 발생하지 않는다
- Angular 앱이 정상적으로 bootstrap된다
