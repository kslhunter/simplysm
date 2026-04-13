# sd-cli 리팩토링 분석 리포트

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/sd-cli/src/` (98 TypeScript 파일, ~11,861 LOC) |
| 분석 일시 | 2026-04-13 |
| 분석 관점 | 구조(STRUCT), 설계(DESIGN), 아키텍처(ARCH) |
| 발견 이슈 | **0건** |

## 분석 결과

분석 결과 보고할 이슈가 없습니다.

## 분석 요약

### 구조적 분석 (STRUCT)

- **순환 의존성 없음**: 98개 파일 전체에서 순환 참조 미발견
- **Co-location 양호**: 관련 파일이 기능별로 적절히 그룹화 (angular/ 7파일, capacitor/ 6파일, esbuild/ 7파일 등)
- **Barrel export 없음**: 루트 `src/index.ts`(2개 export)만 존재, 하위 디렉토리에 re-export 없음
- **파일 크기**: 300줄 초과 파일 13개 존재하나 모두 응집도가 높은 단일 책임 모듈

### 설계 분석 (DESIGN)

- **BaseEngine 템플릿 메서드**: TscEngine(70줄), NgtscEngine(68줄), ServerEsbuildEngine(76줄)이 BaseEngine(209줄)을 상속하는 적절한 "is-a" 관계
- **EsbuildClientEngine 분리**: 생명주기 차이(serverReady/port/HMR)로 인한 의도적 설계. 공유 로직은 `setupWatchEvents`, `stopEngineWorker` 유틸리티로 추출됨
- **AngularCompiler 응집성**: 560줄이지만 AOT 증분 컴파일의 단일 파이프라인(initialize→emit→diagnostics)으로 응집
- **인터페이스 설계**: BuildEngine(run/startWatch/stop), OrchestratorLifecycle(initialize/start/shutdown) 모두 적절한 크기

### 아키텍처 분석 (ARCH)

- **의존 방향 준수**: commands → orchestrators → engines → workers → utils 단방향 계층 유지
- **레이어 분리**: commands는 위임만, engines/workers는 빌드 로직만, utils는 리프 유틸리티
- **Worker 격리**: Worker Thread 모듈은 타입 전용 import만으로 엔진과 연결, 런타임 격리 유지
- **공통 유틸리티**: `setupWatchEvents`, `stopEngineWorker`, `ResultCollector`, `RebuildManager` 등이 적절히 공유됨

### 검증 과정에서 기각된 후보 이슈 (9건)

| # | 후보 | 기각 사유 |
|---|------|-----------|
| 1 | BuildOrchestrator + Capacitor/Electron 직접 결합 | 고정 2개 플랫폼에 대한 Factory/Strategy는 조기 추상화 |
| 2 | EsbuildClientEngine BaseEngine 미상속 | `BaseEngine.ts:59` 의도적 설계 + 공유 유틸리티 존재 |
| 3 | AngularCompiler God Class | 단일 응집 파이프라인의 하위 단계, 독립 책임 아님 |
| 4 | BuildOutput 인터페이스 과다 | 5필드 소규모, 분할 시 복잡도만 증가 |
| 5 | Config 로딩 중복 | 서로 다른 오케스트레이터의 다른 요구사항 |
| 6 | 파일 복사 로직 중복 | 6줄 중복, watch 버전은 근본적 차이, 프로젝트 컨벤션 내 |
| 7 | BaseOrchestrator LSP 위반 | abstract 클래스, 다형 인터페이스는 OrchestratorLifecycle |
| 8 | DevOrchestrator 타이머 중복 | 4줄 디바운스 2회, 서로 다른 용도/딜레이 |
| 9 | engine-factory.ts 조건 분기 | 4개 고정 엔진 타입에 팩토리 함수 적절 |
