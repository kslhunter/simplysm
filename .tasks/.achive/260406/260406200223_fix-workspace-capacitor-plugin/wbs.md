# WBS: workspace:* Capacitor 플러그인 Android 빌드 누락 수정

## 프로젝트 개요

- **배경:** sd-cli의 Capacitor 빌드 시 workspace:* 버전의 플러그인이 Android 빌드 파일에 누락됨 (kslhunter/simplysm#19)
- **환경:** pnpm 모노레포, Capacitor 7.6.1, sd-cli@14.0.18
- **전제조건:** 없음
- **기술적 제약:** `.capacitor/`는 격리된 pnpm 프로젝트 (`pnpm-workspace.yaml` 별도 생성). workspace:* 프로토콜을 직접 사용할 수 없음
- **참조 자료:**
  - `.tasks/260406195949_debug-workspace-plugin-missing/debug.md` — 근본 원인 분석 결과
  - `packages/sd-cli/src/capacitor/capacitor.ts` — 수정 대상 파일

## Impact Mapping

- **Goal:** workspace:* Capacitor 플러그인이 Android 빌드에 정상 포함되어 네이티브 기능이 동작함
  - **Actor:** sd-cli 사용자 (모노레포 개발자)
    - **Impact:** 빌드 후 수동 개입 없이 workspace 플러그인이 포함된 APK를 빌드할 수 있다
      - **Deliverable:** `_setupNpmConf()`의 workspace 플러그인 처리를 `link:` 프로토콜로 전환

## Feature Breakdown

### Epic 1. Capacitor workspace 플러그인 빌드 수정

#### [x] Feature 1.1 workspace 플러그인을 link: 프로토콜로 전환

**의존성:** 없음

**범위:**

- `_setupNpmConf()`에서 workspace 플러그인을 dependencies에서 제거하지 않고, `link:` 프로토콜로 실제 패키지 경로를 지정하여 추가
- `_linkWorkspacePlugins()` 메서드 삭제
- `_initCap()`에서 `_linkWorkspacePlugins()` 호출 2곳 제거
- `_setupNpmConf()` 반환 타입에서 `workspacePlugins` 제거

**경계:**

- Capacitor CLI의 플러그인 발견 메커니즘 자체는 수정하지 않음
- `cap sync`/`cap copy` 호출 로직은 변경하지 않음
- 비-workspace 플러그인의 처리 방식은 변경하지 않음

**근거:**

- 디버그 분석: `_setupNpmConf()`가 workspace 플러그인을 package.json에서 제거 → Capacitor CLI가 발견 못함
- 사용자 확인: `link:` 프로토콜 + `pnpm install`이 symlink를 자동 생성하므로 `_linkWorkspacePlugins()` 불필요

## 제외 사항

- `capacitor.config.ts`의 `includePlugins` 옵션 추가 — `link:` 프로토콜로 충분히 해결 가능 (방안 A 미채택)
