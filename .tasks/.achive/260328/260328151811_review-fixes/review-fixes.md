# Feature: sd-cli 리뷰 이슈 수정

## 참조 자료

- [리뷰 리포트](../.tasks/260328150532_review-sd-cli-rebuild/review.md)
- 대상 코드: `packages/sd-cli/src/`

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | BaseEngine resolver 패턴 | ViteEngine과 동일한 패턴 적용 | 동일 코드베이스 내 검증된 패턴 |
| D2 | Capacitor shell 실행 방식 | spawn 배열 인자 + shell:false | Node.js 보안 베스트 프랙티스 |
| D3 | Gradle 비밀번호 처리 | gradle.properties 파일 참조 방식 | 소스 코드에 시크릿 미포함 원칙 |
| D4 | publish 자동 커밋 | git 명령어 직접 사용 | --dangerously-skip-permissions 제거 |
| D5 | ngtsc 경로 필터링 | startsWith(normalizedSrcDir + "/") | tsc-build.ts와 일관성 통일 |

## 요구명세

```gherkin
Feature: sd-cli 리뷰 이슈 수정

  Background:
    Given sd-cli v14 빌드 시스템이 구성되어 있다

  Rule: BaseEngine watch 모드에서 registerBuild resolver를 올바르게 처리한다 (LOGIC-001 Critical)

    Scenario: dev 모드에서 서버 코드 변경 후 서버 런타임이 재시작된다
      Given ServerEsbuildEngine이 watch 모드로 실행 중이다
      When 서버 소스 파일이 변경된다
      Then buildStart 이벤트에서 registerBuild의 resolver가 저장된다
      And build 이벤트에서 resolver가 호출된다
      And RebuildManager의 batchComplete 이벤트가 발생한다

    Scenario: watch 모드에서 라이브러리 리빌드 후 에러가 출력된다
      Given TscEngine이 watch 모드로 실행 중이다
      When 라이브러리 소스 파일이 변경되어 타입 에러가 발생한다
      Then batchComplete 이벤트 후 printErrors가 호출된다

    Scenario: NgtscEngine watch 모드에서도 동일하게 동작한다
      Given NgtscEngine이 watch 모드로 실행 중이다
      When Angular 라이브러리 소스 파일이 변경된다
      Then resolver가 호출되고 batchComplete가 발생한다

  Rule: Capacitor 명령어 실행 시 command injection을 방지한다 (SEC-001)

    Scenario: appId에 쉘 메타문자가 포함되어도 안전하게 실행된다
      Given Capacitor._exec()가 호출된다
      When 명령어를 실행할 때
      Then spawn에 shell:false와 배열 인자가 사용된다

  Rule: Gradle build.gradle에 keystore 비밀번호를 평문으로 삽입하지 않는다 (SEC-002)

    Scenario: 서명 설정 시 비밀번호가 gradle.properties를 참조한다
      Given Android 서명 설정이 요청된다
      When _configureSigningConfig()가 실행된다
      Then build.gradle에 평문 비밀번호 대신 gradle.properties 참조 코드가 삽입된다
      And gradle.properties 파일에 비밀번호가 기록된다
      And gradle.properties가 .gitignore에 추가된다

  Rule: publish 자동 커밋에서 --dangerously-skip-permissions를 사용하지 않는다 (SEC-003)

    Scenario: 미커밋 변경사항이 있을 때 git 명령어로 직접 커밋한다
      Given publish 실행 시 미커밋 변경사항이 존재한다
      When 자동 커밋이 수행된다
      Then claude --dangerously-skip-permissions 대신 git add + git commit이 직접 실행된다

  Rule: ngtsc-build-core의 경로 필터링이 정확한 경로 매칭을 사용한다 (LOGIC-002)

    Scenario: 유사한 이름의 패키지 경로가 오탐되지 않는다
      Given normalizedSrcDir이 "packages/core/src"이다
      When "packages/core-common/src/file.ts" 파일의 진단이 필터링된다
      Then 해당 진단은 제외된다 (includes 대신 startsWith + "/" 사용)

  Rule: BuildOrchestrator가 Promise.allSettled 결과를 검사한다 (DESIGN-001)

    Scenario: 예상 밖 예외 발생 시 state.hasError가 설정된다
      Given build + lint가 Promise.allSettled로 실행된다
      When 예상 밖 예외로 rejected가 발생한다
      Then state.hasError = true가 설정되고 에러가 로깅된다

  Rule: esbuild-config의 의존성 트리를 1회만 순회한다 (PERF-001)

    Scenario: collectUninstalledOptionalPeerDeps와 collectNativeModuleExternals가 단일 순회로 통합된다
      Given 서버 빌드에서 externals를 수집한다
      When scanDependencyTree가 실행된다
      Then 의존성 트리를 1회만 순회하여 두 결과를 동시에 수집한다

  Rule: check --type CLI 인자를 검증한다 (DESIGN-002)

    Scenario: 유효하지 않은 타입 입력 시 에러를 반환한다
      Given 사용자가 check --type typcheck (오타)을 입력한다
      When CLI 인자가 파싱된다
      Then "Invalid check type: typcheck" 에러가 출력된다

  Rule: Capacitor 파일 기반 락이 원자적이다 (LOGIC-003)

    Scenario: 동시 실행 시 하나만 락을 획득한다
      Given 두 프로세스가 동시에 _acquireLock()를 호출한다
      When fs.writeFile({ flag: 'wx' })가 사용된다
      Then 하나는 성공하고 다른 하나는 EEXIST 에러로 실패한다

  Rule: Capacitor 루트 package.json 경로를 동적으로 탐색한다 (LOGIC-004)

    Scenario: 패키지 깊이에 관계없이 루트 package.json을 찾는다
      Given 패키지가 packages/sub/my-pkg 구조에 있다
      When _setupNpmConf()가 실행된다
      Then 하드코딩된 ../../ 대신 상위 디렉토리를 탐색하여 루트 package.json을 찾는다

  Rule: Low severity 이슈들을 수정한다

    Scenario: startWatch 에러 시에도 resolve하는 문제 (LOGIC-005)
      When startWatch 초기 빌드가 에러로 완료된다
      Then Promise가 resolve되되, ResultCollector에 에러 상태가 기록된다

    Scenario: server-runtime cleanup 순서 (LOGIC-006)
      When cleanup()이 호출된다
      Then serverInstance를 undefined로 설정한 후 close()를 호출한다

    Scenario: Electron builder 산출물 파일명 (LOGIC-007)
      When _copyBuildOutput()가 실행된다
      Then glob 패턴으로 실제 산출물을 동적 탐색한다

    Scenario: 워크스페이스 패키지 경로의 dot 필터링 (LOGIC-008)
      When 패키지 경로를 필터링한다
      Then 디렉토리 여부를 stat으로 확인한다

    Scenario: ViteEngine/BaseEngine stop() 중복 (DESIGN-003)
      When 엔진을 중지한다
      Then 공통 유틸 함수로 stop 로직이 실행된다

    Scenario: Electron fire-and-forget 에러 추적 (DESIGN-004)
      When Electron 실행이 실패한다
      Then ResultCollector에 에러가 등록된다

    Scenario: 프로덕션 package.json 버전 (DESIGN-005)
      When dist/package.json을 생성한다
      Then 원본 package.json에서 실제 버전 범위를 가져온다

    Scenario: uncaughtException 핸들러 (DESIGN-006)
      When uncaughtException이 발생한다
      Then 에러 전송 후 graceful shutdown을 수행한다

    Scenario: cleanup exit code (DESIGN-007)
      When cleanup이 실패한다
      Then process.exit(1)로 비정상 종료를 알린다

    Scenario: AndroidManifest XML 수정 (DESIGN-008)
      When AndroidManifest.xml을 수정한다
      Then 기존 정규식 패턴을 유지하되 주석으로 제약사항을 명시한다

    Scenario: dry-run git push (DESIGN-009)
      When dry-run 모드에서 git push 단계에 도달한다
      Then 실제 git push를 실행하지 않고 로그만 출력한다

    Scenario: RebuildManager dead code (DESIGN-010)
      When Promise.allSettled 결과를 처리한다
      Then rejected 분기에 방어 코드 의도를 주석으로 명시한다

    Scenario: watch mode externals 캐싱 (PERF-002)
      When watch mode에서 파일이 추가/삭제된다
      Then package.json 변경 시에만 externals를 재수집한다

    Scenario: copyPublicFiles 병렬화 (PERF-003)
      When public/ 파일을 복사한다
      Then Promise.all로 병렬 복사한다

    Scenario: replaceDeps postinstall 경고 (SEC-004)
      When postinstall 스크립트를 실행한다
      Then 실행 전 경고 로그를 남긴다
```

## 구현계획

### 배경

sd-cli v14 리빌드 후 심층 리뷰에서 25건의 이슈가 발견되었다. Critical 1건(BaseEngine resolver), Medium 9건(보안 3, 로직 3, 설계 2, 성능 1), Low 15건으로 구성된다.

### 목표

- 25건 이슈 전체를 수정한다
- 기존 테스트를 깨뜨리지 않는다

### 비목표

- 새로운 기능 추가
- 아키텍처 변경

### 설계

#### LOGIC-001: BaseEngine resolver

ViteEngine(97~117행) 패턴을 BaseEngine.startWatch()에 적용:
- `let resolver: (() => void) | undefined` 변수 추가
- `buildStart` 핸들러에서 `resolver = this._rebuildManager.registerBuild(...)`
- `build` 핸들러 끝에서 `resolver?.(); resolver = undefined;`

#### SEC-001: Capacitor _exec 리팩토링

`_exec(cmd: string, cwd)` → `_exec(command: string, args: string[], cwd)` 시그니처 변경:
- `spawn(command, args, { cwd, shell: false, stdio: [...] })`
- 모든 호출부 변환:
  - `_execCap(args)`: `this._exec("npx", ["cap", ...args], ...)`
  - `"npm install"`: `this._exec("npm", ["install"], ...)`
  - `"npx capacitor-assets generate ..."`: `this._exec("npx", ["capacitor-assets", "generate", ...], ...)`
  - `"adb kill-server"`: `this._exec("adb", ["kill-server"], ...)`
  - gradlew: `this._exec(gradlew, [gradleTask, "--no-daemon"], ...)`

#### SEC-002: Gradle 비밀번호

`_configureSigningConfig()`에서 build.gradle에 `project.property('...')` 참조를 삽입하고, `gradle.properties` 파일에 실제 비밀번호를 기록. `.gitignore`에 `gradle.properties` 추가.

#### SEC-003: publish 자동 커밋

claude CLI 호출 대신 `git add -A` + `git commit -m "..."` 직접 실행.

#### LOGIC-002: ngtsc 경로 필터링

`fileName.includes(normalizedSrcDir)` → `fileName.startsWith(normalizedSrcDir + "/")` 또는 `fileName === normalizedSrcDir`로 변경. 진단 필터(244행)와 emit 필터(279행) 모두.

#### PERF-001: 의존성 트리 단일 순회

`collectAllExternals(pkgDir)` 함수를 신규 도입. 내부에서 `scanDependencyTree`를 1회만 호출하여 optionalPeerDeps + nativeModules를 동시 수집. 기존 두 함수는 내부적으로 이 함수를 호출하도록 위임.

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| BaseEngine에 resolver 추가 | 채택 | ViteEngine에서 검증된 패턴 |
| Capacitor spawn shell:false | 채택 | Node.js 보안 베스트 프랙티스 |
| gradle.properties 참조 | 채택 | Android 공식 권장 방식 |
| 환경변수(System.getenv) 참조 | 미채택 | CI/CD 설정 필요, 로컬 개발 불편 |

### Vertical Slices

#### [x] Slice 1: BaseEngine resolver 수정 (LOGIC-001 Critical + DESIGN-003 + DESIGN-010)
- **구현 내용:** BaseEngine.startWatch()에 resolver 패턴 적용, stop() 공통화, RebuildManager 주석
- **파일:** `engines/BaseEngine.ts`, `engines/ViteEngine.ts`, `utils/rebuild-manager.ts`
- **Scenarios:**
  - Scenario: dev 모드에서 서버 코드 변경 후 서버 런타임이 재시작된다
  - Scenario: watch 모드에서 라이브러리 리빌드 후 에러가 출력된다
  - Scenario: NgtscEngine watch 모드에서도 동일하게 동작한다
  - Scenario: ViteEngine/BaseEngine stop() 중복
  - Scenario: RebuildManager dead code

#### [x] Slice 2: Capacitor 보안 + 안정성 (SEC-001, SEC-002, LOGIC-003, LOGIC-004, DESIGN-008)
- **구현 내용:** _exec 배열 인자 전환, Gradle 비밀번호 외부화, 원자적 락, 루트 경로 탐색, XML 주석
- **의존:** 없음
- **파일:** `capacitor/capacitor.ts`
- **Scenarios:**
  - Scenario: appId에 쉘 메타문자가 포함되어도 안전하게 실행된다
  - Scenario: 서명 설정 시 비밀번호가 gradle.properties를 참조한다
  - Scenario: 동시 실행 시 하나만 락을 획득한다
  - Scenario: 패키지 깊이에 관계없이 루트 package.json을 찾는다
  - Scenario: AndroidManifest XML 수정

#### [x] Slice 3: publish 보안 + 안정성 (SEC-003, DESIGN-009, LOGIC-008)
- **구현 내용:** 자동 커밋 git 직접 실행, dry-run git push 제거, 디렉토리 필터링 수정
- **의존:** 없음
- **파일:** `commands/publish.ts`
- **Scenarios:**
  - Scenario: 미커밋 변경사항이 있을 때 git 명령어로 직접 커밋한다
  - Scenario: dry-run git push
  - Scenario: 워크스페이스 패키지 경로의 dot 필터링

#### [x] Slice 4: 빌드 유틸 수정 (LOGIC-002, PERF-001, PERF-002, DESIGN-005)
- **구현 내용:** ngtsc 경로 필터링, 의존성 트리 단일 순회, externals 캐싱, 버전 정보
- **의존:** 없음
- **파일:** `utils/ngtsc-build-core.ts`, `utils/esbuild-config.ts`, `workers/server-build.worker.ts`
- **Scenarios:**
  - Scenario: 유사한 이름의 패키지 경로가 오탐되지 않는다
  - Scenario: collectUninstalledOptionalPeerDeps와 collectNativeModuleExternals가 단일 순회로 통합된다
  - Scenario: watch mode externals 캐싱
  - Scenario: 프로덕션 package.json 버전

#### [x] Slice 5: Orchestrator + CLI 수정 (DESIGN-001, DESIGN-002, DESIGN-004)
- **구현 내용:** Promise.allSettled 결과 검사, --type 검증, Electron 에러 추적
- **의존:** 없음
- **파일:** `orchestrators/BuildOrchestrator.ts`, `orchestrators/DevWatchOrchestrator.ts`, `sd-cli-entry.ts`
- **Scenarios:**
  - Scenario: 예상 밖 예외 발생 시 state.hasError가 설정된다
  - Scenario: 유효하지 않은 타입 입력 시 에러를 반환한다
  - Scenario: Electron fire-and-forget 에러 추적

#### [x] Slice 6: Worker + Utils 잔여 수정 (LOGIC-005~007, DESIGN-006~007, PERF-003, SEC-004)
- **구현 내용:** cleanup 순서, uncaughtException, exit code, 파일 복사 병렬화, postinstall 경고, Electron 파일명, startWatch 에러
- **의존:** Slice 1 (LOGIC-005는 BaseEngine 관련)
- **파일:** `workers/server-runtime.worker.ts`, `utils/worker-utils.ts`, `utils/copy-public.ts`, `utils/copy-src.ts`, `utils/replace-deps.ts`, `electron/electron.ts`, `engines/BaseEngine.ts`
- **Scenarios:**
  - Scenario: startWatch 에러 시에도 resolve하는 문제
  - Scenario: server-runtime cleanup 순서
  - Scenario: Electron builder 산출물 파일명
  - Scenario: uncaughtException 핸들러
  - Scenario: cleanup exit code
  - Scenario: copyPublicFiles 병렬화
  - Scenario: replaceDeps postinstall 경고
