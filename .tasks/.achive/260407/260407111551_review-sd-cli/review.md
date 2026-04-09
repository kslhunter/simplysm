# sd-cli 코드 리뷰

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/sd-cli/src/` (74개 파일) |
| 분석 일시 | 2026-04-07 |
| 발견 이슈 | 7건 (Critical: 0, Medium: 3, Low: 4) |

---

## Medium

### LOGIC-001: versionCode 계산 시 minor/patch >= 100이면 충돌

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/sd-cli/src/capacitor/capacitor-android.ts:260-263
title: versionCode 계산 공식이 minor/patch 100 이상에서 충돌
description: |
  현재 공식: major*10000 + minor*100 + patch
  minor 또는 patch가 100 이상이면 상위 자릿수와 겹친다.
  예: "1.0.100"과 "1.1.0"이 모두 versionCode=10100을 생성한다.
  Android는 versionCode가 유일해야 업데이트 판별이 가능하므로,
  충돌 시 Google Play에서 업데이트가 거부될 수 있다.
suggestion: |
  자릿수를 넓혀 충돌 범위를 제거한다:
  major*1000000 + minor*1000 + patch (minor/patch 0-999 허용)
```

### DESIGN-001: 디버그용 FsWatcher가 프로덕션 코드에 남아 리소스 누수

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts:282-292
title: 디버그용 angular/dist 삭제 감지 watcher가 shutdown()에서 정리되지 않음
description: |
  `[DEBUG:angular-dist]` 주석이 달린 디버그 전용 FsWatcher가 블록 스코프
  로컬 변수에만 할당되어 있다. 클래스 필드에 저장되지 않으므로
  shutdown()에서 close()가 호출되지 않는다.
  watch/dev 모드가 종료될 때까지 파일 핸들이 해제되지 않고,
  프로세스가 장시간 실행되면 OS 파일 디스크립터를 점유한다.
suggestion: |
  디버그 목적이 완료되었으면 코드를 제거한다.
  아직 필요하다면 클래스 필드에 저장하고 shutdown()에서 close()를 호출한다.
```

### DESIGN-002: esbuild context 재생성 실패 시 이전 context 미해제

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/sd-cli/src/workers/server-build.worker.ts:434-440
title: esbuild context 재생성 시 dispose 순서가 안전하지 않음
description: |
  파일 추가/삭제 시 esbuild context를 새로 만드는 흐름:
  1. oldContext = esbuildContext (이전 참조 저장)
  2. esbuildContext = await createEsbuildWatchContext(...) (새 context 생성)
  3. await oldContext.dispose() (이전 context 해제)

  2단계에서 예외가 발생하면 3단계가 실행되지 않아 oldContext가
  dispose 되지 않는다. esbuildContext는 여전히 이전 값을 가리키므로
  다음 onChange에서 자동 복구되지만, 실패 시점까지 context가 누수된다.
suggestion: |
  dispose를 먼저 수행하거나, try-finally로 감싸 실패 시에도 이전 context를 해제한다:
  const oldContext = esbuildContext;
  try {
    esbuildContext = await createEsbuildWatchContext(...);
  } finally {
    await oldContext?.dispose();
  }
```

---

## Low

### LOGIC-002: PostCSS 인라인 처리 시 원본 인용부호 스타일 미보존

```
id: LOGIC-002
severity: Low
category: 로직
location: packages/sd-cli/src/angular/vite-postcss-inline-plugin.ts:115-123
title: double-quote 문자열이 single-quote로 변환됨
description: |
  Angular 컴포넌트의 styles 배열에서 인라인 CSS를 PostCSS 처리 후
  다시 삽입할 때, 백틱(`)이면 백틱으로 유지하지만
  그 외(', ")는 모두 single-quote(')로 변환한다.
  원본이 "double-quote"인 경우 코드 스타일이 변경되어
  후속 빌드에서 불필요한 diff가 발생할 수 있다.
suggestion: |
  원본 인용부호를 보존한다:
  const quoteChar = origChar;  // `"` 또는 `'`
  newText = `${quoteChar}${escapedCss}${quoteChar}`;
```

### DESIGN-003: replaceDeps 로딩 catch-all이 모든 에러를 삼킴

```
id: DESIGN-003
severity: Low
category: 설계
location: packages/sd-cli/src/sd-cli.ts:37-38
title: Production 모드 replaceDeps 설정 시 모든 예외를 무조건 무시
description: |
  Phase 1(replaceDeps)의 try-catch가 에러 종류를 구분하지 않고
  모든 예외를 무시한다. sd.config.ts 부재(ENOENT)뿐 아니라
  구문 에러(SyntaxError), 권한 에러(EACCES), 런타임 에러 등도
  모두 삼켜진다. Phase 2에서 sd.config.ts를 다시 로드하므로
  실질적 장애는 낮지만, 디버깅 시 첫 번째 실패 원인이 숨겨진다.
suggestion: |
  에러 종류를 구분하여 예상 가능한 에러(ENOENT, MODULE_NOT_FOUND)만 무시하고,
  나머지는 경고 로그를 남긴다.
```

### DESIGN-004: symlink 테스트 임시 파일 정리 누락

```
id: DESIGN-004
severity: Low
category: 설계
location: packages/sd-cli/src/electron/electron.ts:343-358
title: _canCreateSymlink() 실패 시 임시 파일이 삭제되지 않음
description: |
  symlink 테스트 함수가 writeFileSync → symlinkSync → lstatSync →
  unlinkSync 순서로 실행한다. 중간 단계에서 예외가 발생하면
  catch 블록으로 빠지며 이미 생성된 testTarget/testLink 파일이
  삭제되지 않는다. finally 블록이 없기 때문이다.
  반복 호출 시 이전 임시 파일이 남아 symlinkSync에서 EEXIST 에러가
  발생할 수 있다.
suggestion: |
  finally 블록에서 임시 파일 정리:
  finally {
    try { fs.unlinkSync(testLink); } catch {}
    try { fs.unlinkSync(testTarget); } catch {}
  }
```

### DESIGN-005: AndroidManifest.xml을 regex로 수정하여 형식 변경에 취약

```
id: DESIGN-005
severity: Low
category: 설계
location: packages/sd-cli/src/capacitor/capacitor-android.ts:157-214
title: regex 기반 XML 수정이 XML 형식 변경에 취약
description: |
  AndroidManifest.xml 수정에 문자열 치환(`replace`)과 정규식을 사용한다.
  예: `content.replace("<application", '<application android:...')`.
  Capacitor나 Android Gradle Plugin이 XML 형식(줄바꿈, 들여쓰기, 속성 순서)을
  변경하면 패턴 매칭이 실패하여 속성이 누락될 수 있다.
  특히 intent-filter 삽입에 사용하는
  `/(<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?>)/`는
  비탐욕적이지만 복수 activity가 있으면 오매칭 가능성이 있다.
suggestion: |
  XML 파서(xml2js, fast-xml-parser 등)를 사용하여 구조적으로 수정하면
  형식 변경에 안전하다. 현재 방식을 유지한다면, 패턴 매칭 실패 시
  경고 로그를 남겨 사용자가 인지할 수 있도록 한다.
```

### PERF-001: 배포 실패 패키지 검색에 O(n*m) 탐색 사용

```
id: PERF-001
severity: Low
category: 성능
location: packages/sd-cli/src/commands/publish.ts:773
title: publishedPackages.includes() 반복 호출로 O(n*m) 성능
description: |
  `allPkgNames.filter(n => !publishedPackages.includes(n))`에서
  includes()가 매번 선형 탐색하므로 O(n*m) 복잡도이다.
  현재 패키지 수가 적어 실질적 영향은 없으나, 모노레포 패키지가
  많아지면 비효율이 누적된다.
suggestion: |
  Set을 사용하면 O(n+m)으로 개선 가능:
  const publishedSet = new Set(publishedPackages);
  const failedPkgNames = allPkgNames.filter(n => !publishedSet.has(n));
```
