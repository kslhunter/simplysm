# WBS: vite-plugin-pwa 직접 구현 대체 및 Vite 8 업그레이드

## 프로젝트 개요

- **배경:** `packages/sd-cli`에서 사용하는 `vite-plugin-pwa`가 Vite 8을 지원하지 않아 업그레이드가 차단됨. 실제 사용 기능이 매우 제한적(manifest 생성, precache SW, prompt 등록)이라 직접 구현으로 대체 가능.
- **환경:** pnpm 모노레포, `packages/sd-cli`는 Angular 클라이언트 앱의 Vite 빌드를 담당하는 CLI 도구
- **전제조건:** 없음
- **기술적 제약:** Chrome 61+ 호환 필요 (Service Worker API는 Chrome 40+부터 지원하므로 문제 없음)
- **참조 자료:**
  - `packages/sd-cli/src/utils/vite-config.ts` — 현재 VitePWA 사용 위치
  - `packages/sd-cli/src/sd-config.types.ts` — SdPwaConfig 타입 정의
  - `packages/sd-cli/src/utils/generate-pwa-icons.ts` — 아이콘 생성 유틸 (재사용)

## Impact Mapping

- **Goal:** 외부 의존성 3개(vite-plugin-pwa, workbox-build, workbox-window) 제거 및 Vite 8 업그레이드 달성
  - **Actor:** sd-cli로 Angular 앱을 빌드하는 개발자
    - **Impact:** 최신 Vite 버전의 빌드 성능·기능 개선을 즉시 활용할 수 있다
      - **Deliverable:** 커스텀 Vite PWA 플러그인
      - **Deliverable:** Vite 8 업그레이드
    - **Impact:** PWA 동작을 외부 라이브러리 제약 없이 직접 제어할 수 있다
      - **Deliverable:** 커스텀 Vite PWA 플러그인

## Feature Breakdown

### Epic 1. PWA 직접 구현

#### [ ] Feature 1.1 커스텀 Vite PWA 플러그인 구현

**의존성:** 없음

**범위:**

- `manifest.webmanifest` JSON 파일 생성 (`closeBundle` 훅) — name, short_name, display, theme_color, background_color, icons
- Service Worker 파일(`sw.js`) 생성 (`closeBundle` 훅) — 앱 버전 상수 + `dist/` 산출물 파일 목록 주입
- SW의 `install` 이벤트: 파일 목록 전체를 캐시에 저장
- SW의 `activate` 이벤트: 현재 버전 외 이전 캐시 삭제
- SW의 `fetch` 이벤트: 캐시 우선 응답
- SW의 `message` 이벤트: `SKIP_WAITING` 메시지 수신 시 `self.skipWaiting()` 호출
- HTML에 `<link rel="manifest" href="/manifest.webmanifest">` 주입 (`transformIndexHtml` 훅)
- HTML에 SW 등록 + 업데이트 감지 + prompt 스크립트 주입 (`transformIndexHtml` 훅)
- 앱 버전 기반 캐시 관리 (버전 변경 시 전체 캐시 교체, 파일별 해시 불필요)
- 버전 소스: `package.json`의 `version` 필드
- 기존 `SdPwaConfig` 타입 재사용
- 기존 `generate-pwa-icons.ts` 재사용

**경계:**

- Workbox 런타임 캐싱 전략(NetworkFirst, StaleWhileRevalidate 등)은 구현하지 않음
- 증분 캐싱(파일별 해시 기반 부분 업데이트) 없음 — 버전 변경 시 전체 교체
- dev 모드에서는 PWA 플러그인 비활성 (기존 동작 유지: build 모드에서만 동작)

**근거:**

- 대화: "직접 만들어서 대체 안되나", "버전관리 그냥 앱 버전으로 하면안됨?"
- 코드: `vite-config.ts:220` — `registerType: "prompt"`, `injectRegister: "script"`, manifest/workbox 설정만 사용

#### [ ] Feature 1.2 vite-plugin-pwa 의존성 교체

**의존성:** Feature 1.1

**범위:**

- `vite-config.ts`에서 `VitePWA` import → 커스텀 플러그인으로 교체
- `package.json`에서 `vite-plugin-pwa`, `workbox-build`, `workbox-window` 의존성 제거
- 기존 테스트(`vite-config.spec.ts`) PWA 관련 부분 업데이트

**경계:**

- `SdPwaConfig` 타입은 변경하지 않음 (기존 설정 호환 유지)
- `sd.config.ts`의 `pwa` 설정 인터페이스 변경 없음

**근거:**

- 대화: 의존성 3개 제거 목적
- 코드: `package.json:49` — `"vite-plugin-pwa": "^1.2.0"`

### Epic 2. Vite 8 업그레이드

#### [ ] Feature 2.1 Vite 8 업그레이드

**의존성:** Feature 1.2

**범위:**

- `vite` 의존성 `^7.3.1` → `^8.0.0` 업데이트
- Vite 8 breaking changes 대응 (빌드 설정, 플러그인 API 변경 등)
- 다른 Vite 관련 의존성 호환성 확인 (`vite-plugin-solid` ^8 지원 확인됨, `vite-tsconfig-paths` 와일드카드 peer dep으로 호환)

**경계:**

- Node.js 버전 업그레이드는 이 Feature에서 다루지 않음 (Vite 8 요구사항: Node.js ^20.19 || >=22.12.0)
- Vite 8의 신규 기능 활용은 이 Feature에서 다루지 않음 (호환성 확보만)

**근거:**

- 대화: "직접구현으로 하면 vite도 8버전으로 올릴 수 있을거같은데"
- 조사: `vite-plugin-pwa`가 유일한 Vite 8 블로커 (`peerDependency: ^3~^7`)
- npm: Vite 8.0.0~8.0.3 배포 확인

## 제외 사항

- **Workbox 런타임 캐싱 전략** — 현재 사용하지 않으며, 단순 precache로 충분 (Goal 미연결)
- **증분 캐싱 (파일별 해시)** — 사용자 명시적 제외 ("앱버전 다르면 재설치 식으론 안되나")
- **Node.js 버전 업그레이드** — 범위 초과, 별도 작업으로 분리
- **Vite 8 신규 기능 활용** — 범위 초과, 호환성 확보만 목표
