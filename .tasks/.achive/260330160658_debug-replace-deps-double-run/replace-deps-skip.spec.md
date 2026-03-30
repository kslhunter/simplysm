# replace-deps 중복 실행 방지 — 수동 검증

## 전제 조건
- sd.config.ts에 replaceDeps 설정이 있는 프로젝트
- sd-cli가 빌드된 상태 (프로덕션 모드)

## 수행 절차
1. `sd-cli replace-deps` 실행

## 기대 결과
- "replace-deps 설정 중..." / "replace-deps 설정 완료" 로그가 1회만 출력된다
- postinstall이 있다면 1회만 실행된다
