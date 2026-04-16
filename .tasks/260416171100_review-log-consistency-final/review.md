# 코드 리뷰: sd-cli 로그 일관성 개선 최종 심층 리뷰

## 리뷰 결과: 이슈 없음

15개 대상 파일 및 관련 테스트 파일을 4가지 관점(로직 버그, 일관성, 성능, 설계)으로 심층 분석한 결과, **로그 일관성 변경에서 이슈가 발견되지 않았습니다.**

## 검증 항목별 확인 결과

### Feature 1.1: CLI 진입점 및 공통 유틸리티

| 파일 | 변경 | 검증 |
|------|------|------|
| `sd-cli.ts:19` | `consola.withTag("sd:cli")` 모듈-레벨 로거 | 수동 `[sd-cli]` prefix 제거, `console.warn` → `logger.warn`, 한국어 메시지 적용 확인 |
| `sd-cli-entry.ts:21` | `consola.withTag("sd:cli:entry")` 모듈-레벨 로거 | `.fail()` 핸들러에서 `logger.error(msg)` 사용 확인 |
| `output-utils.ts:5` | `consola.withTag("sd:cli:output")` 모듈-레벨 로거 | `printDiagnostics` error/warn, `printServers` info 전환 확인 |
| `worker-utils.ts:50` | 한국어 에러 메시지 | `"Worker당 한 번만 호출할 수 있습니다: ${label}"` 적용 확인 |

**테스트:** `output-utils.spec.ts` — `vi.mock("consola")` + `withTag` → `orig` 패턴으로 기존 스파이 호환. `worker-utils.spec.ts:43,49` — 한국어 매칭 문자열 업데이트 확인.

### Feature 1.2: 커맨드·오케스트레이터

| 파일 | 변경 | 검증 |
|------|------|------|
| `check.ts:144-153` | `formatSection` 제거, severity 분리 | success/error 분리, 요약 success/error 분리 확인 |
| `replace-deps.ts:5` | `consola.withTag("sd:cli:replace-deps")` | `consola.warn` → `logger.warn` 확인 |
| `BaseOrchestrator.ts:105-107` | `process.stdout.write` → consola | `start("종료 중...")` / `success("종료 완료")` 쌍 확인 |
| `BuildOrchestrator.ts:173` | `process.stdout.write` → `logger.info` | 빈 패키지 메시지 확인 |
| `BuildOrchestrator.ts:248,477` | start/success 쌍 정상화 | 중복 `success("빌드 실행 완료")` 제거, `info("빌드 완료")` → `success("빌드 완료")` 확인 |
| `WatchOrchestrator.ts:69` | `process.stdout.write` → `logger.warn` | 빈 패키지 경고 확인 |
| `publish-command.ts:121` | `process.stdout.write` → `logger.info` | 빈 배포 패키지 메시지 확인 |
| `deployment-phase.ts:66-80` | DRY-RUN `debug` → `info` | if/else 분리로 비-DRY `debug` 유지 확인 |
| `deployment-phase.ts:102` | `fail` → `error` | severity 통일 확인 |

**테스트:** `check.spec.ts` — `mockLogger` 기반으로 전면 재작성, success/error 호출 인자 검증으로 전환 확인.

### Feature 1.3: 하위 모듈

| 파일 | 변경 | 검증 |
|------|------|------|
| `lint-core.ts:133-160` | 세부 단계 `start/success` → `debug` | 6곳 모두 debug 확인 |
| `lint-core.ts:183` | 전체 완료 `info` → `success` | `success("린트 완료", ...)` 확인 |
| `electron.ts:63,86` | initialize `start/success` | 공개 메서드 쌍 확인 |
| `electron.ts:90,184` | run `start/success` | 공개 메서드 쌍 확인 |
| `electron.ts:188,208` | build `start/success` | 공개 메서드 쌍 확인 |
| `electron.ts:129` | 번들링 실패 `warn` → `error` | severity 변경 확인 |
| `electron.ts:114,145` | 종료/재시작 `info` 유지 | 변경 없음 확인 |
| `capacitor.ts:98,156` | initialize `start/success` | 공개 메서드 쌍 확인, `success`가 `finally` 바깥으로 올바르게 이동 |
| `capacitor.ts:281,325` | run `start/success` | 새로 추가된 쌍 확인 |
| `capacitor.ts:341,385` | build `start/success` | 공개 메서드 쌍 확인 |
| `capacitor.ts:241,296,365` | warn 3곳 유지 | 변경 없음 확인 |
| `rebuild-manager.ts:66` | 구조화 객체 → 인라인 보간 | `` `리빌드 에러 발생: ${String(result.reason)}` `` 확인 |

**테스트:** capacitor 3개 테스트 mock에 `start: vi.fn()` 추가 확인. electron 테스트 mock에 `start/success/error` 추가 확인.

## 설계 품질 평가

- **일관성**: 15개 파일 전체가 동일한 severity 기준(D2)과 태그 네이밍 컨벤션(`sd:cli:{모듈명}`)을 준수
- **하위 호환성**: 로그 출력 형태만 변경되고 기능적 동작(로그 레벨 필터링, 빌드 결과, exitCode 설정)은 모두 유지
- **테스트 커버리지**: 모든 변경에 대해 테스트가 적절히 업데이트됨
