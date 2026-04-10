# watch 모드에서 반복 리빌드 시 OOM 방지 — 수동 검증

## 전제 조건

- simplysm 모노레포 개발 환경
- sd-cli 또는 의존 패키지의 소스 파일 수정 가능

## 수행 절차

1. `pnpm watch` 실행
2. sd-cli 또는 의존 패키지의 소스 파일을 수정하여 리빌드를 트리거
3. 리빌드 완료 후 2~3회 이상 반복

## 기대 결과

- 3회 이상 리빌드 시에도 `Worker terminated due to reaching memory limit: JS heap out of memory` 에러가 발생하지 않음
- 빌드가 정상적으로 완료됨
