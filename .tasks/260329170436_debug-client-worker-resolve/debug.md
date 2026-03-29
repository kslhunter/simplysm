# 디버그: 클라이언트 번들에서 import_meta.resolve is not a function

## 출처

- **origin:** `direct` (사용자 직접 입력)
- **완료 시 참고:** 이전 서버 측 이슈(kslhunter/simplysm#7) 수정 후 노출된 클라이언트 측 동일 계열 문제

## 에러 증상

- **에러 메시지:** `TypeError: import_meta.resolve is not a function`
- **위치:** `SdServiceClientProtocolWrapper.worker` getter (브라우저 번들 chunk)
- **재현:** 브라우저에서 WebSocket 메시지 수신 시 `decodeAsync` -> `_runWorkerAsync` -> `worker` getter에서 워커 생성 시도

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: `import_meta.resolve` 에러 | E2: `.ts` 핸들러만 존재 | E3: `main: dist/index.js` | E4: 서버 빌드는 정상 |
|----|---|---|---|---|
| H1: `createSdNgPlugin`이 `.js` 파일에 대한 onLoad 핸들러 부재 | C | C | C | C |
| H2: 브라우저 타겟 치환 (H1의 2차 증상) | C | N | N | N |

### 결과: 확정 -- H1

`createSdNgPlugin`의 `onLoad` 핸들러가 `.ts` 파일만 처리하여, npm 패키지의 컴파일된 `.js` 파일에 `transformWorkerPaths`가 적용되지 않음. 서버 빌드는 `SdWorkerPathPlugin`이 모든 확장자를 처리하므로 정상.

## 해결 방안

### 방안 A: createSdNgPlugin에 .js onLoad 핸들러 추가

- **설명:** `createSdNgPlugin` 내부에 `.js` 파일용 `onLoad` 핸들러를 추가하여, `workerOutdir`가 제공된 경우 `transformWorkerPaths`를 적용
- **장점:** createSdNgPlugin 내부에서 완결, SdWorkerPathPlugin 변경 불필요, .ts 핸들러와 충돌 없음
- **반론:** 모든 .js 파일을 읽고 regex 테스트하는 오버헤드 발생
- **점수:** 안정성 9, 근본성 9, 부작용 8, 일관성 8 -> **평균 8.5/10**

### 방안 B: SdNgBundler에 SdWorkerPathPlugin을 .js 전용 필터로 추가

- **설명:** SdWorkerPathPlugin에 필터 커스터마이즈 파라미터 추가 후 SdNgBundler plugins에 .js 전용 인스턴스 추가
- **장점:** 기존 SdWorkerPathPlugin 로직 재사용, 관심사 분리
- **반론:** SdWorkerPathPlugin API 변경 필요, 두 곳에서 워커 변환 설정 관리 필요
- **점수:** 안정성 9, 근본성 9, 부작용 7, 일관성 9 -> **평균 8.5/10**

### 방안 C: 수행 안 함

- **설명:** 변경 없이 현재 상태 유지
- **장점:** 부작용 없음
- **반론:** npm 패키지 사용 시 클라이언트 워커 생성 불가
- **점수:** 안정성 3, 근본성 1, 부작용 10, 일관성 5 -> **평균 4.75/10**

## 선택 결과

**방안 A** (평균 8.5/10)

`createSdNgPlugin` 내부에 `.js` 파일용 `onLoad` 핸들러를 추가하여 `transformWorkerPaths`를 적용한다.
