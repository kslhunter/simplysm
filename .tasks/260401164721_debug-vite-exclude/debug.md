# 디버그: SdClientPackageConfig.exclude가 Vite optimizeDeps.exclude로 전달되지 않음

## 출처

- **origin:** `kslhunter/simplysm#11`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 에러 증상

- **에러 메시지:** `Error: Couldn't find host element for "jeep-sqlite" as it is unknown to this Stencil runtime.`
- **위치:** `sd.config.ts`의 client 패키지 `exclude` 설정 → Vite `optimizeDeps.exclude` 전달 경로 전체
- **재현:** `sd.config.ts`에서 `exclude: ["jeep-sqlite"]` 설정 후 `pnpm dev` 실행 시, 해당 패키지가 여전히 pre-bundling되어 Stencil 런타임 이중 인스턴스 발생

## 근본 원인 추적 (ACH)

### 가설

- H1: exclude 전달 경로 미구현 — `SdClientPackageConfig.exclude`가 타입에만 정의되고, Vite 설정까지 전달하는 코드가 누락됨
- H2: exclude가 전달되지만 Vite 설정에 잘못 매핑됨

### ACH 매트릭스

|    | E1: ClientBuildInfo에 exclude 필드 없음 (`client.worker.ts:18-36`) | E2: CreateClientViteConfigOptions에 exclude 없음 (`vite-config.ts:17-55`) | E3: ViteEngine.run/startWatch에서 exclude 미전달 (`ViteEngine.ts:59-67, 162-172`) |
|----|------------------------------------------------------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| H1 | C(code)                                                          | C(code)                                                                 | C(code)                                                                        |
| H2 | I → 폐기 — 필드 자체가 없으므로 잘못 매핑 불가                       | I → 폐기                                                                 | I → 폐기                                                                        |

### 결과: 확정 — H1

`SdClientPackageConfig.exclude`는 타입에 정의되어 있지만, Vite 설정까지 전달하는 코드가 전체 경로에서 누락되었다. (C(code) 3건으로 확정 요건 충족)

누락 지점 요약:

| 지점 | 파일 | 상태 |
|------|------|------|
| 타입 정의 | `sd-config.types.ts:235` | `exclude?: string[]` 정의됨 |
| ViteEngine → worker | `ViteEngine.ts:59-67, 162-172` | `exclude` 미전달 |
| Worker 인터페이스 | `client.worker.ts:18-36` | `ClientBuildInfo`에 `exclude` 필드 없음 |
| Vite 설정 생성 옵션 | `vite-config.ts:17-55` | `CreateClientViteConfigOptions`에 `exclude` 없음 |
| Vite 설정 생성 함수 | `vite-config.ts:57+` | `optimizeDeps.exclude` 설정 안 함 |

## 해결 방안

### 방안 A: 전체 경로 exclude 관통 구현

- **설명:** `ClientBuildInfo` → `CreateClientViteConfigOptions` → `createClientViteConfig()` 함수에 `exclude` 필드를 추가하고, `optimizeDeps.exclude`에 매핑. `ViteEngine.run()`과 `startWatch()`에서 `this._pkg.config.exclude`를 전달.
- **장점:** 원인을 직접 해결하며, 기존 `replaceDeps`가 `sdScopeWatchPlugin`에서 `optimizeDeps.exclude`를 설정하는 패턴과 일관성 있음
- **반론:** `sdScopeWatchPlugin`의 `config()` 훅에서도 `optimizeDeps.exclude`를 설정하므로 Vite의 config merge가 두 값을 올바르게 합쳐주는지 확인 필요 (Vite는 plugin config를 deep merge하므로 배열은 합쳐짐)
- **점수:** 안정성 9/10, 일관성 9/10, 근본성 10/10 → **평균 9.3/10**

### 방안 B: sdScopeWatchPlugin에서 exclude 통합 처리

- **설명:** `sdScopeWatchPlugin` 옵션에 `exclude`를 추가하여 `replaceDeps`와 `exclude`를 하나의 플러그인에서 통합 관리
- **장점:** `optimizeDeps.exclude` 설정이 한 곳에 집중됨
- **반론:** `sdScopeWatchPlugin`의 책임 범위가 확장되어 SRP 위반. 프로덕션 빌드에서 누락 위험
- **점수:** 안정성 7/10, 일관성 6/10, 근본성 8/10 → **평균 7.0/10**

### 수행 안 함

- **장점:** 코드 변경 없음
- **반론:** 이슈가 해결되지 않아 exclude가 필요한 패키지 사용 불가
- **점수:** 안정성 3/10, 일관성 3/10, 근본성 0/10 → **평균 2.0/10**

## 선택 결과

**방안 A** (평균 9.3/10)

전체 경로에 `exclude` 전달을 구현하여 `optimizeDeps.exclude`에 매핑한다. 기존 패턴과 일관되며 근본 원인을 직접 해결한다.
