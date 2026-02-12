# replaceDeps 마이그레이션 설계 문서

**Date**: 2026-02-12
**Status**: Design Complete
**Scope**: pnpm 환경에서 symlink 기반 의존성 교체

---

## 1. 문제 정의

### 레거시 CLI의 localUpdates
- 레거시 `simplysm/sd-cli`에서 제공하던 기능
- **프로젝트 루트 수준**에서 glob 패턴으로 외부 라이브러리를 `node_modules`로 동기화
- 빌드/워치 시 **1회 복사** + watch 모드에서 **실시간 감지 후 복사**

### 현재 CLI의 상황
- `packages/sd-cli`로 마이그레이션되었으나 해당 기능은 **누락됨**
- `SdConfig` 인터페이스에 관련 필드 없음
- `build.ts`, `watch.ts` 등 명령어에서 관련 코드 없음

### pnpm 환경의 복잡성
- npm/yarn과 다르게 pnpm은 symlink 기반 `node_modules` 구조 사용
- 단순 파일 복사는 global store의 hardlink 손상 위험
- workspace 프로젝트라면 루트뿐 아니라 **각 패키지의 `node_modules`도 관리** 필요

---

## 2. 설계 방식

### 2.1 핵심 아이디어: Symlink 교체

**단순 파일 복사 대신 symlink 교체 방식 선택**

```
기존: node_modules/@simplysm/solid → .pnpm/@simplysm+solid@.../node_modules/@simplysm/solid
↓ (복사 시 파일 손상 위험)

새로운 방식: node_modules/@simplysm/solid → ../simplysm/packages/solid (직접 symlink)
↓ (소스 변경이 바로 반영, watch 감시 불필요)
```

**장점:**
- 파일 복사 불필요 → 성능 향상
- watch 감시 불필요 → 구현 단순화
- 소스 빌드 결과가 바로 반영됨
- `pnpm install` 하면 원래 상태로 자동 복원

### 2.2 설정 구조

**`sd-config.ts` (외부 앱):**

```typescript
export default {
  replaceDeps: {
    "@simplysm/*": "../simplysm/packages/*",
    "@other/*": "../../other-project/packages/*",
  },
  packages: {
    "client-admin": { target: "client", server: "server" },
    "server": { target: "server" },
  },
} satisfies SdConfig;
```

**설정 방식:**
- 키: `node_modules` 내에서 찾을 패키지 glob 패턴 (`@scope/*`, `@lib/core` 등)
- 값: 소스 디렉토리 경로 (키의 `*` 캡처값이 값의 `*`에 치환)
- 예: `@simplysm/*` + `../simplysm/packages/*` → `@simplysm/solid`는 `../simplysm/packages/solid`로 매핑

---

## 3. 핵심 알고리즘

### 3.1 `setupReplaceDeps(projectRoot, replaceDeps)` 함수

```
입력: projectRoot (외부 앱 루트), replaceDeps 설정
출력: symlink 교체 완료

1단계: Workspace 구조 파악
  - pnpm-workspace.yaml 파싱
  - ["packages/*"] 같은 glob 배열 추출
  - 실제 workspace 패키지 디렉토리 목록 생성
    → [projectRoot, "packages/client-admin", "packages/server", ...]
  - 파일 없으면 단일 프로젝트로 취급 (루트만 처리)

2단계: 탐색 대상 확장
  탐색 대상 = [projectRoot, ...workspace 패키지 경로들]

3단계: Glob 패턴 매칭 및 symlink 교체
  replaceDeps의 각 항목에 대해:
    예: "@simplysm/*" → "../simplysm/packages/*"

    a. 패턴 파싱
       - scope = "@simplysm"
       - glob = "*"

    b. 탐색 대상 각각의 node_modules/@simplysm/ 체크
       - 없으면 스킵
       - 있으면 하위 디렉토리 나열 (solid, core-common, ...)

    c. 매칭된 패키지마다 symlink 교체:
       - 캡처값(* → solid)으로 소스 경로 resolve
         → path.resolve(projectRoot, "../simplysm/packages/solid")
       - 소스 경로 존재 여부 확인 (없으면 경고 + 스킵)
       - 기존 symlink/디렉토리 제거
       - 소스 경로로 새 symlink 생성
       - 로그: "@simplysm/solid → ../simplysm/packages/solid"
```

### 3.2 에러 처리

| 상황 | 동작 |
|------|------|
| 소스 경로 미존재 | 경고 로그 + 해당 항목 스킵 (빌드 중단 ❌) |
| symlink 생성 실패 (권한 등) | 에러 로그 + 계속 진행 |
| `pnpm-workspace.yaml` 미존재 | 루트만 처리 |
| `node_modules/` 미존재 | 해당 workspace 패키지 스킵 |

---

## 4. 통합 지점

### 4.1 새 파일

**`packages/sd-cli/src/utils/replace-deps.ts`**
```typescript
export async function setupReplaceDeps(
  projectRoot: string,
  replaceDeps: Record<string, string>,
): Promise<void>
```

### 4.2 수정 파일

| 파일 | 변경 |
|------|------|
| `sd-config.types.ts` | `SdConfig` 인터페이스에 `replaceDeps?: Record<string, string>` 필드 추가 |
| `commands/build.ts` | 빌드 시작 전 `setupReplaceDeps()` 호출 (1줄) |
| `orchestrators/WatchOrchestrator.ts` | 와치 시작 전 `setupReplaceDeps()` 호출 (1줄) |
| `commands/dev.ts` | dev 시작 전 `setupReplaceDeps()` 호출 (1줄) |

### 4.3 호출 위치

```typescript
// build.ts, watch.ts, dev.ts 등에서
const config = await loadConfig();

// config 로드 직후, 실제 빌드/와치 시작 전
if (config.replaceDeps) {
  await setupReplaceDeps(projectRoot, config.replaceDeps);
}

// ... 이후 기존 빌드/와치/dev 로직
```

---

## 5. 동작 흐름

### 5.1 전체 시나리오

```
외부 앱에서 실행:
  $ pnpm build / pnpm watch / pnpm dev
    ↓
config 로드 → replaceDeps 설정 확인
    ↓
setupReplaceDeps() 실행 (1회)
  ├─ pnpm-workspace.yaml 파싱
  ├─ [루트, ...workspace 패키지] 탐색
  ├─ glob 매칭 → symlink 교체
  └─ 로그 출력
    ↓
기존 빌드/와치/dev 로직 진행 (변경 없음)
```

### 5.2 주요 특성

- **watch 감시 불필요**: symlink 방식이므로 소스 변경이 바로 반영
- **1회만 실행**: build/watch/dev 시작 시 setupReplaceDeps 1회 호출
- **종료 시 원복 안 함**: `pnpm install`로 원복 가능
- **기존 아키텍처 영향 없음**: Builder/Worker/Orchestrator 패턴 유지

---

## 6. 구현 체크리스트

- [ ] `sd-config.types.ts` - `replaceDeps` 필드 추가
- [ ] `utils/replace-deps.ts` - 새 파일 생성 (setupReplaceDeps 함수)
  - [ ] pnpm-workspace.yaml 파싱
  - [ ] workspace 패키지 목록 추출
  - [ ] glob 패턴 매칭
  - [ ] symlink 교체 로직
  - [ ] 에러 처리
- [ ] `commands/build.ts` - setupReplaceDeps 호출 추가
- [ ] `orchestrators/WatchOrchestrator.ts` - setupReplaceDeps 호출 추가
- [ ] `commands/dev.ts` - setupReplaceDeps 호출 추가
- [ ] 단위 테스트 (로컬 테스트용 임시 프로젝트)
- [ ] 통합 테스트 (실제 simplysm + 외부 앱)

---

## 7. 테스트 계획

### 7.1 단위 테스트
- glob 패턴 매칭 로직
- 경로 resolve 로직
- workspace 파싱 로직

### 7.2 통합 테스트
- 단일 프로젝트 (pnpm-workspace.yaml 없음)
- workspace 프로젝트 (여러 패키지)
- 복수 replaceDeps 항목
- 소스 경로 미존재 시 경고 처리

---

## 8. 마이그레이션 영향도

### 8.1 기존 코드 영향
- **없음**: 기존 Builder/Worker/Orchestrator 패턴 유지
- 설정 추가로 인한 기존 코드 변경 최소화

### 8.2 사용자 영향
- 레거시 `localUpdates` 설정을 `replaceDeps`로 이름만 변경하여 사용 가능
- `pnpm install` 만으로 원복 가능 (원복 명령어 불필요)

---

## 9. 향후 고려사항

- `.gitignore` 또는 별도 설정에서 symlink 교체 대상 제외 필요 (선택사항)
- 개발 중 symlink 손상 시 자동 복구 메커니즘 (선택사항)
- 프로덕션 빌드에서 replaceDeps 비활성화 옵션 (선택사항)
