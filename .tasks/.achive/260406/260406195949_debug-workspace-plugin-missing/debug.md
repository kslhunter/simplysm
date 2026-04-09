# 디버그: workspace:* Capacitor 플러그인이 Android 빌드에 누락됨

## 출처

- **origin:** `kslhunter/simplysm#19`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: workspace:* 플러그인이 `.capacitor/android/` 빌드 파일(`capacitor.build.gradle`, `capacitor.settings.gradle`, `capacitor.plugins.json`)에 등록 / 실제: workspace:* 플러그인만 누락. 비-workspace 플러그인은 정상 등록
- **위치:** `packages/sd-cli/src/capacitor/capacitor.ts:365-369` (`_setupNpmConf`)
- **재현 절차:** sd.config.ts에 workspace:* 플러그인 선언 → `pnpm dev` 또는 `pnpm build` → `.capacitor/android/` 확인

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|        | E1: `_setupNpmConf()` L365-369에서 workspace 플러그인을 dependencies에서 삭제 | E2: Capacitor `getDependencies()`가 `package.json`만 읽음 | E3: `_linkWorkspacePlugins()`가 `symlink()`로 정상 생성 | E4: 비-workspace 플러그인은 정상 등록 (이슈 보고) |
|--------|---|---|---|---|
| H1: package.json에서 제거되어 플러그인 후보 목록에서 누락 | C(code) | C(doc) | N | C(code) |
| H2: symlink가 잘못 생성되어 플러그인 해석 실패 | N | N | I(code) | N |

- E1 C(code): `delete capNpmConf.dependencies[plugin]` — `capacitor.ts:369`에서 직접 확인
- E2 C(doc): Capacitor CLI GitHub 소스 `cli/src/plugin.ts`의 `getDependencies()`가 `package.json`의 dependencies/devDependencies만 읽음을 직접 확인
- E3 I(code): `symlink(pluginDir, linkPath, "junction")` — `capacitor.ts:1109`에서 정상 호출 확인. H2와 불일치

### 결과: 확정 — H1

`_setupNpmConf()`에서 workspace 플러그인을 `.capacitor/package.json` dependencies에서 제거한다. Capacitor CLI의 `getPlugins()` → `getDependencies()`는 `package.json` dependencies/devDependencies에서만 플러그인 후보를 수집하므로, workspace 플러그인이 후보 목록에 포함되지 않는다. `node_modules`에 symlink가 존재하더라도 `resolvePlugin()`이 호출되지 않아 Android 빌드 파일에 누락된다.

원래 의도는 `link:` 프로토콜 방식으로 해결하려 했으나, symlink 생성까지만 구현하고 `package.json` 등록 부분이 누락된 미완성 상태였다.

## 해결 방안

### 방안 A: `capacitor.config.ts`에 `includePlugins` 추가

- **설명:** `_writeCapConf()`에서 생성하는 `capacitor.config.ts`에 모든 플러그인 이름을 `includePlugins` 배열로 추가
- **장점:** Capacitor 공식 메커니즘, 코드 변경이 `_writeCapConf()` 한 곳으로 최소
- **반론:** `includePlugins` 사용 시 Capacitor가 package.json 기반 자동 발견을 중단하므로, 기본 플러그인도 명시해야 함
- **점수:** 안정성 9/10, 정합성 8/10, 유지보수 8/10 → **평균 8.3/10**

### 방안 B: workspace 플러그인을 `link:` 프로토콜로 `package.json`에 추가

- **설명:** `_setupNpmConf()`에서 workspace 플러그인을 제거하지 않고, 실제 패키지 경로를 `link:` 프로토콜로 dependencies에 추가. `pnpm install`이 symlink를 자동 처리하므로 `_linkWorkspacePlugins()` 제거
- **장점:** package.json이 모든 의존성을 정확히 반영. Capacitor 기본 발견 메커니즘 유지. 원래 의도된 설계 방향 완성
- **반론:** `.capacitor/`는 격리된 pnpm 프로젝트이므로 `link:` 프로토콜 동작이 환경에 따라 다를 수 있음
- **점수:** 안정성 6/10, 정합성 9/10, 유지보수 7/10 → **평균 7.3/10**

### 방안 C: 수행 안 함

- **장점:** 변경 없음
- **반론:** workspace 플러그인이 Android 빌드에 계속 누락됨
- **점수:** 안정성 10/10, 정합성 2/10, 유지보수 10/10 → **평균 7.3/10**

## 선택 결과

**방안 B** (평균 7.3/10)

원래 의도된 설계 방향(`link:` 프로토콜)을 완성하는 방식. `_setupNpmConf()`에서 workspace 플러그인을 `link:` 프로토콜로 dependencies에 추가하고, 중복된 `_linkWorkspacePlugins()` 메서드 및 관련 호출을 제거한다.
