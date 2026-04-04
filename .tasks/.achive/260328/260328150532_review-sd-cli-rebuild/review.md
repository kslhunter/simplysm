# sd-cli rebuild 최종 심층 리뷰

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/sd-cli/src/` 전체 (61파일, ~9,500줄) |
| 리뷰 일시 | 2026-03-28 15:05 |
| 리뷰 범위 | `.tasks/260326183509_sd-cli-rebuild/*.md` 요구사항 대비 구현 검증 |
| 발견 이슈 | Critical 1건, Medium 9건, Low 15건 |

## 이슈 목록

### Critical

```
id: LOGIC-001
severity: Critical
category: 로직
location: packages/sd-cli/src/engines/BaseEngine.ts:127-128
title: BaseEngine watch 모드에서 registerBuild resolver 미사용 — batchComplete 이벤트 영구 미발생
description:
  BaseEngine.startWatch()의 buildStart 핸들러(128행)에서 rebuildManager.registerBuild()를
  호출하지만, 반환값(resolver 함수)을 저장하지 않는다. RebuildManager는 resolver가 호출되어야
  해당 빌드의 Promise가 resolve되고, 모든 빌드가 완료되면 batchComplete 이벤트를 발생시킨다.

  resolver가 호출되지 않으므로:
  1. _runBatch()의 Promise.allSettled가 영원히 대기
  2. batchComplete 이벤트가 발생하지 않음
  3. dev 모드: _onDevBatchComplete()가 호출되지 않아 서버 코드 변경 후 런타임 재시작 불가
  4. watch 모드: 리빌드 완료 후 에러 출력(printErrors)이 트리거되지 않음

  영향 범위: TscEngine, NgtscEngine, ServerEsbuildEngine (BaseEngine 상속 3개 엔진 전체)
  ViteEngine은 별도 구현에서 resolver를 올바르게 저장·호출하고 있어(102행, 116행) 영향 없음.

suggestion:
  ViteEngine 패턴을 따라 buildStart 핸들러에서 resolver를 변수에 저장하고,
  build 이벤트 핸들러에서 resolver?.()를 호출한다:

  // buildStart 핸들러
  let resolver: (() => void) | undefined;
  this._worker!.on("buildStart", () => {
    if (!isInitialBuild && this._rebuildManager != null) {
      resolver = this._rebuildManager.registerBuild(workerKey, ...);
    }
  });
  // build 핸들러 끝에 추가
  resolver?.();
  resolver = undefined;
```

### Medium

```
id: SEC-001
severity: Medium
category: 보안
location: packages/sd-cli/src/capacitor/capacitor.ts:163
title: Capacitor _exec()에서 shell:true + 문자열 결합으로 command injection 경로 존재
description:
  _exec(cmd)는 spawn(cmd, { shell: true })로 쉘을 통해 명령을 실행한다.
  cmd는 "npx cap " + args.join(" ") 등으로 구성되며, args에 appId 등 설정값이 포함된다.
  _validateConfig()에서 appId를 정규식으로 검증하고 있어 현재 위험은 제한적이나,
  검증 로직 변경/우회 시 쉘 메타문자 주입이 가능해진다.
suggestion:
  spawn("npx", ["cap", ...args], { shell: false })처럼 인자를 배열로 분리하여
  쉘 해석을 방지한다.
```

```
id: SEC-002
severity: Medium
category: 보안
location: packages/sd-cli/src/capacitor/capacitor.ts:860-861
title: Gradle build.gradle에 keystore 비밀번호 평문 삽입
description:
  _configureSigningConfig()에서 storePassword와 keyPassword를 build.gradle 파일에
  평문 문자열로 직접 삽입한다. 이 파일이 VCS에 커밋되거나 CI 로그에 노출되면 서명 키가 유출된다.
suggestion:
  gradle.properties 또는 환경변수 참조(System.getenv("KEYSTORE_PASSWORD"))를 사용하여
  비밀번호를 소스 파일에 직접 기록하지 않도록 한다.
```

```
id: SEC-003
severity: Medium
category: 보안
location: packages/sd-cli/src/commands/publish.ts:599-602
title: publish 자동 커밋에서 --dangerously-skip-permissions 플래그 사용
description:
  자동 커밋을 위해 claude -p "/sd-commit all" --dangerously-skip-permissions를 실행한다.
  이 플래그는 Claude CLI의 모든 권한 검사를 우회하므로, CI/CD 환경에서 의도치 않은
  파일 수정이나 명령어 실행이 가능하다.
suggestion:
  --dangerously-skip-permissions 대신 필요한 최소 권한만 --allowedTools로 허용하거나,
  자동 커밋을 git 명령어로 직접 수행한다.
```

```
id: LOGIC-002
severity: Medium
category: 로직
location: packages/sd-cli/src/utils/ngtsc-build-core.ts:244-245, 279
title: String.includes()를 사용한 경로 필터링이 특정 프로젝트 구조에서 오탐 가능
description:
  진단 필터링(244행)과 emit 필터링(279행)에서 fileName.includes(normalizedSrcDir)를
  사용한다. 현재 monorepo에서는 패키지 디렉토리명이 서로의 접두사가 아니므로 문제 없으나,
  중첩 패키지 구조(예: packages/core/ + packages/core/plugins/)가 추가되면
  다른 패키지의 파일이 포함/emit될 수 있다.
  tsc-build.ts에서는 pathx.isChildPath()로 정확한 경로 포함 관계를 검사하고 있어
  두 모듈 간 접근 방식이 불일치한다.
suggestion:
  tsc-build.ts와 동일하게 pathx.isChildPath() 또는 startsWith(normalizedSrcDir + "/")를
  사용하여 정확한 경로 매칭을 보장한다.
```

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/sd-cli/src/orchestrators/BuildOrchestrator.ts:409-416
title: Promise.allSettled 반환값 미검사로 예상 밖 예외 누락 가능
description:
  lint + build를 Promise.allSettled로 병렬 실행하지만 반환값을 검사하지 않는다.
  개별 태스크 내부의 try/finally가 engine.stop()만 보장하고, createBuildEngine 자체의
  실패나 engine.run() 밖의 예상 밖 예외는 state.hasError에 반영되지 않은 채
  빌드가 "성공"으로 보고될 수 있다.
suggestion:
  Promise.allSettled 반환값을 순회하며 rejected 결과가 있으면 state.hasError = true를
  설정하고 에러를 로깅한다.
```

```
id: PERF-001
severity: Medium
category: 성능
location: packages/sd-cli/src/utils/esbuild-config.ts:153-187
title: 의존성 트리를 동일 구조로 2회 순회 (collectUninstalledOptionalPeerDeps + collectNativeModuleExternals)
description:
  collectUninstalledOptionalPeerDeps와 collectNativeModuleExternals가 각각 별도로
  scanDependencyTree를 호출하여 모든 하위 의존성의 package.json을 readFileSync로
  2회 순회한다. 대규모 의존성 트리에서 수천 회의 동기 파일 읽기가 중복 발생한다.
suggestion:
  두 collector를 하나의 순회에서 동시에 실행하거나, visited set과 파싱된 package.json
  결과를 공유하는 캐시를 도입한다.
```

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/sd-cli/src/sd-cli-entry.ts:110
title: check --type CLI 인자에 대한 입력 검증 부재
description:
  사용자가 --type invalid를 입력하면 "invalid"가 그대로 CheckType으로 캐스팅된다.
  알 수 없는 타입은 조용히 무시되어, 오타 시 해당 체크가 스킵되지만 피드백이 없다.
  예: --type typcheck (오타) → typecheck가 실행되지 않고 성공으로 보고됨.
suggestion:
  yargs의 choices 옵션이나 런타임 검증을 추가하여 유효하지 않은 타입에 에러를 반환한다.
```

```
id: LOGIC-003
severity: Medium
category: 로직
location: packages/sd-cli/src/capacitor/capacitor.ts:217
title: 파일 기반 락(lock)이 원자적이지 않아 TOCTOU 경쟁 상태
description:
  _acquireLock()에서 fsx.exists() 체크와 fsx.write() 사이에 시간 간격이 있다.
  두 프로세스가 동시에 exists()를 호출하면 둘 다 false를 받고 각각 락 파일을 생성할 수 있다.
suggestion:
  fs.writeFile의 { flag: 'wx' } (exclusive create)를 사용하면 파일이 이미 존재할 경우
  원자적으로 실패하므로 TOCTOU를 제거할 수 있다.
```

```
id: LOGIC-004
severity: Medium
category: 로직
location: packages/sd-cli/src/capacitor/capacitor.ts:312
title: 루트 package.json 경로를 ../../로 하드코딩하여 패키지 깊이에 종속
description:
  _setupNpmConf()에서 path.resolve(this._pkgPath, "../../package.json")로
  루트 package.json을 찾는다. 패키지가 반드시 {root}/packages/{name} 구조(깊이 2)에
  있다고 가정한다. tests/ 하위 패키지나 nesting이 다른 구조에서는 잘못된 경로를 참조한다.
suggestion:
  findUp("package.json", { cwd: ... }) 같은 상위 탐색 유틸을 사용하거나,
  workspace root 경로를 생성자에서 주입받는다.
```

### Low

```
id: LOGIC-005
severity: Low
category: 로직
location: packages/sd-cli/src/engines/BaseEngine.ts:122-188
title: startWatch가 에러 시에도 resolve하여 호출자가 실패를 감지 불가
description:
  build 이벤트의 에러 경로(176행)와 _callStartWatch 실패(182행) 모두에서 resolve()를
  호출한다. reject하지 않으므로 호출자는 초기 빌드 성공/실패를 Promise 결과만으로 구분할 수 없다.
suggestion:
  초기 빌드 실패 시 reject하거나, Promise<{ success: boolean }>로 반환 타입을 변경한다.
```

```
id: LOGIC-006
severity: Low
category: 로직
location: packages/sd-cli/src/workers/server-runtime.worker.ts:55-61
title: cleanup()에서 close() 전에 serverInstance를 undefined로 설정하지 않아 중복 호출 가능
description:
  close() 완료를 await한 후 serverInstance = undefined를 설정한다. close()가 오래 걸리는
  동안 cleanup()이 다시 호출되면 동일 서버에 close()가 두 번 호출된다.
  다른 워커(server-build.worker.ts:116-118)에서는 변수를 먼저 undefined로 설정하는 패턴을 사용한다.
suggestion:
  다른 워커와 동일하게 serverInstance = undefined를 close() 호출 전에 실행한다.
```

```
id: LOGIC-007
severity: Low
category: 로직
location: packages/sd-cli/src/electron/electron.ts:336
title: Electron builder 산출물 파일명 추측 기반 조합으로 실제 파일명과 불일치 가능
description:
  _copyBuildOutput()에서 파일명을 description + version으로 조합하지만, electron-builder의
  실제 파일명 패턴은 builder 설정과 productName에 따라 달라질 수 있다.
suggestion:
  fsx.glob("*.exe", ...)로 빌드 산출물을 동적 탐색하거나, electron-builder의
  artifactBuildCompleted 이벤트에서 실제 경로를 받는다.
```

```
id: LOGIC-008
severity: Low
category: 로직
location: packages/sd-cli/src/commands/publish.ts:514
title: 워크스페이스 패키지 경로 필터링이 디렉토리명에 .이 포함된 패키지를 제외
description:
  .filter((item) => !path.basename(item).includes("."))로 파일을 제외하려는 의도이나,
  디렉토리명에 .이 포함된 경우(예: my.package)도 필터링된다.
suggestion:
  fs.stat으로 디렉토리 여부를 확인하거나, glob에 디렉토리만 매칭하는 옵션을 사용한다.
```

```
id: DESIGN-003
severity: Low
category: 설계
location: packages/sd-cli/src/engines/ViteEngine.ts:176-194 vs BaseEngine.ts:194-212
title: ViteEngine과 BaseEngine 간 stop() 로직 중복
description:
  shutdown timeout + stopWatch race + terminate 패턴이 양쪽에 복제되어 있다.
  한쪽만 수정하면 불일치가 발생할 수 있다.
suggestion:
  stop() 로직을 공통 유틸 함수로 추출한다.
```

```
id: DESIGN-004
severity: Low
category: 설계
location: packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts:436-447
title: Electron fire-and-forget 실행의 에러가 ResultCollector에 미반영
description:
  Capacitor는 await로 실행하지만 Electron은 fire-and-forget 패턴이다.
  실패 시 로그만 남기고 ResultCollector에 등록하지 않아 최종 결과에 반영되지 않는다.
suggestion:
  Electron 실패 시에도 ResultCollector에 에러를 등록한다.
```

```
id: DESIGN-005
severity: Low
category: 설계
location: packages/sd-cli/src/workers/server-build.worker.ts:167-173
title: 프로덕션 package.json의 dependencies 버전이 모두 "*"로 고정
description:
  dist/package.json에 모든 external 패키지를 "*" 버전으로 기록한다.
  npm install 시 빌드 시점과 다른 버전이 설치될 수 있다.
suggestion:
  원본 package.json이나 lockfile에서 실제 버전 범위를 가져온다.
```

```
id: DESIGN-006
severity: Low
category: 설계
location: packages/sd-cli/src/workers/server-runtime.worker.ts:65-77
title: uncaughtException 핸들러가 에러 전송만 하고 프로세스를 종료하지 않음
description:
  Node.js 공식 문서는 uncaughtException 후 프로세스를 계속 실행하는 것을 권장하지 않는다.
  예외 발생 시 애플리케이션이 불확정 상태에서 계속 동작할 수 있다.
suggestion:
  에러 전송 후 graceful shutdown을 수행하는 것이 더 안전하다.
```

```
id: DESIGN-007
severity: Low
category: 설계
location: packages/sd-cli/src/utils/worker-utils.ts:30-37
title: registerCleanupHandlers에서 cleanup 실패 시에도 process.exit(0)으로 종료
description:
  cleanup이 실패해도 exit code가 0이다. CI 등 호출자가 정상 종료로 인식하게 된다.
suggestion:
  cleanup 에러 시 process.exit(1)로 비정상 종료를 알린다.
```

```
id: DESIGN-008
severity: Low
category: 설계
location: packages/sd-cli/src/capacitor/capacitor.ts:628-694
title: AndroidManifest.xml을 정규식/문자열 치환으로 수정
description:
  속성 순서, 줄바꿈, 주석 등 XML 구조가 예상과 다르면 치환이 실패하거나 잘못된 위치에 삽입된다.
  Capacitor가 생성하는 초기 XML 포맷이 일정하므로 현재는 동작하지만 취약한 구조이다.
suggestion:
  xmldom 같은 XML 파서를 사용하여 DOM 조작 후 직렬화하는 것이 안전하다.
```

```
id: DESIGN-009
severity: Low
category: 설계
location: packages/sd-cli/src/commands/publish.ts:692-694
title: dry-run 모드에서 실제 git push --dry-run을 실행
description:
  dry-run 시뮬레이션이라고 하지만 실제 git push --dry-run을 실행한다.
  원격 서버와 통신하므로 네트워크/인증 문제 시 에러가 발생하고, catch 없이 프로세스가 중단된다.
suggestion:
  dry-run 시 git push를 실행하지 않고 로그만 출력하거나, try-catch로 에러를 경고 처리한다.
```

```
id: PERF-002
severity: Low
category: 성능
location: packages/sd-cli/src/workers/server-build.worker.ts:489-503
title: Watch mode에서 파일 추가/삭제 시 externals를 매번 전체 재수집
description:
  파일이 추가/삭제될 때마다 collectAllExternals()가 호출되어 전체 의존성 트리를 재순회한다.
  실제로 externals는 package.json의 의존성이 변경되지 않는 한 동일하다.
suggestion:
  externals 결과를 캐싱하고, package.json 변경 시에만 재수집한다.
```

```
id: PERF-003
severity: Low
category: 성능
location: packages/sd-cli/src/utils/copy-public.ts:22-28
title: copyPublicFiles에서 파일을 순차 복사
description:
  public/ 디렉토리의 모든 파일을 for...of + await로 한 번에 하나씩 복사한다.
  copy-src.ts도 동일한 패턴이다.
suggestion:
  Promise.all 또는 concurrency 유틸을 활용하여 파일 복사를 병렬화한다.
```

```
id: SEC-004
severity: Low
category: 보안
location: packages/sd-cli/src/utils/replace-deps.ts:273
title: replaceDeps가 참조하는 package.json의 postinstall 스크립트를 무조건 실행
description:
  교체 대상 패키지의 postinstall 스크립트를 exec()로 실행한다.
  현재는 sd.config.ts에서만 설정되므로 위험도가 낮지만, 방어적 설계 관점에서는 주의 필요.
suggestion:
  postinstall 실행을 opt-in 플래그로 제어하거나, 실행 전 경고 로그를 남긴다.
```

```
id: DESIGN-010
severity: Low
category: 설계
location: packages/sd-cli/src/utils/rebuild-manager.ts:50-56
title: Promise.allSettled의 rejected 분기가 도달 불가능한 dead code
description:
  registerBuild가 반환하는 resolver는 resolve만 호출하는 함수이다.
  Promise 자체는 reject될 수 없으므로 rejected 분기 처리는 실행되지 않는다.
suggestion:
  의도적 방어 코드라면 주석으로 명시하고, 아니라면 Promise.all로 단순화한다.
```

## 요약

| Severity | 건수 | ID |
|----------|------|----|
| Critical | 1 | LOGIC-001 |
| Medium | 9 | SEC-001~003, LOGIC-002~004, DESIGN-001~002, PERF-001 |
| Low | 15 | LOGIC-005~008, DESIGN-003~010, PERF-002~003, SEC-004 |
| **합계** | **25** | |

### 우선 조치 권장

1. **LOGIC-001 (Critical)**: BaseEngine의 registerBuild resolver 미사용은 dev 모드 서버 재시작과 watch 모드 에러 출력을 완전히 차단하는 실제 버그이다. ViteEngine의 동일 패턴(97~117행)을 참조하여 즉시 수정이 필요하다.

2. **SEC-001~003 (Medium)**: 보안 이슈 3건은 현재 검증 로직으로 위험이 제한적이나, 방어적 설계 관점에서 개선이 권장된다.

3. **LOGIC-002 (Medium)**: ngtsc의 includes 기반 경로 필터링은 현재 프로젝트에서는 동작하나, tsc-build.ts와 접근 방식이 불일치하므로 통일이 권장된다.
