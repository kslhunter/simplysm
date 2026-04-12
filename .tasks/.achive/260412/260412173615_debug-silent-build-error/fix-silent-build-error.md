# Feature: 클라이언트 초기 빌드 에러 보고 수정

## 참조 자료
- 디버그 문서: [debug.md](./debug.md)

## 요구명세

```gherkin
Feature: 클라이언트 초기 빌드 에러 보고

  Rule: 초기 빌드 에러가 표면화되어야 한다
    Scenario: onEnd에서 초기 빌드 실패 시 errors 필드 포함
      Given esbuild onEnd 콜백이 초기 빌드에서 호출됨
      When result.errors가 비어있지 않음
      Then initialBuildResolve에 errors 필드가 포함됨

    Scenario: EsbuildClientEngine이 초기 빌드 실패를 로깅
      Given worker.startWatch()가 { success: false, errors: [...] }를 반환
      When startWatch가 완료됨
      Then 에러가 logger.error로 출력됨

  Rule: dev 모드에서 esbuild 에러가 직접 출력되어야 한다
    Scenario: dev 모드에서 logLevel이 warning
      Given esbuild-client-config의 mode가 "dev"
      When esbuild context가 생성됨
      Then logLevel이 "warning"으로 설정됨

    Scenario: build 모드에서 logLevel이 silent 유지
      Given esbuild-client-config의 mode가 "build"
      When esbuild context가 생성됨
      Then logLevel이 "silent"로 설정됨
```

## 구현계획

### 배경
esbuild 초기 빌드 에러가 3단계에 걸쳐 숨겨지고 있다. [근거: debug.md "3단계 블랙홀"]

### 목표
- 초기 빌드 에러를 터미널에 표면화 [근거: Rule "초기 빌드 에러가 표면화되어야 한다"]
- dev 모드에서 esbuild 자체 에러도 출력 [근거: Rule "dev 모드에서 esbuild 에러가 직접 출력되어야 한다"]

### 비목표
- 빌드 에러의 실제 원인 해결 (이는 에러 표면화 후 별도 진행)

### 설계

1. `client.worker.ts` onEnd: 초기 빌드 시에도 errors 필드를 포함하여 resolve
2. `EsbuildClientEngine.ts` startWatch: 워커 반환값의 success/errors 확인 후 로깅
3. `esbuild-client-config.ts`: dev 모드에서 logLevel을 "warning"으로 변경

### Vertical Slicing

#### Slice 1: 초기 빌드 에러 보고
- [x] **구현 내용:** client.worker.ts onEnd에서 초기 빌드 시 errors 포함 + EsbuildClientEngine startWatch에서 에러 로깅
- **Scenarios:** onEnd에서 초기 빌드 실패 시 errors 필드 포함, EsbuildClientEngine이 초기 빌드 실패를 로깅

#### Slice 2: esbuild logLevel 변경
- [x] **구현 내용:** esbuild-client-config.ts의 logLevel을 dev 모드에서 "warning"으로 변경
- **Scenarios:** dev 모드에서 logLevel이 warning, build 모드에서 logLevel이 silent 유지
