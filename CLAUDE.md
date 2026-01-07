# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 빌드 및 개발 명령어

```bash
# 개발 모드 (파일 변경 감지 및 자동 빌드)
yarn watch

# 프로덕션 빌드
yarn build

# npm 배포
yarn publish

# 린트 및 자동 수정
yarn eslint:fix

# 의존성 새로 설치
yarn reinstall

# 테스트 실행
vitest                  # 전체 테스트
vitest run <패턴>       # 특정 테스트 파일 실행
```

빌드 시스템은 `sd-cli` (커스텀 CLI 도구)를 사용함. 모든 명령어는 `yarn run _sd-cli_`를 통해 tsx로 실행되며 메모리 8GB 할당.

## 아키텍처 개요

**Signal 기반 Angular 모노레포**로 18개 활성 패키지 보유 (전체 21개, 1개 deprecated). **Angular 20.x with Signals** (레거시 change detection 미사용) 및 **Fastify 5.x** 백엔드 사용.

### 패키지 의존성 구조

```
sd-core-common (기반: 유틸리티, 리플렉션, xml, yaml, zip)
├── sd-core-browser → sd-angular (UI 프레임워크)
├── sd-core-node → sd-orm-node, sd-service-server
├── sd-orm-common → sd-orm-node, sd-service-common
├── sd-service-common → sd-service-server, sd-service-client
└── sd-excel, sd-storage (독립 유틸리티)
```

### 주요 패키지 역할

| 패키지 | 용도 |
|--------|------|
| **sd-angular** | Signal 기반 Angular UI 프레임워크 (폼/레이아웃/데이터/네비게이션/오버레이/비주얼 컴포넌트) |
| **sd-service-server** | Fastify REST/WebSocket 서버 (JWT 인증 포함) |
| **sd-service-client** | 서비스 통신용 WebSocket 클라이언트 |
| **sd-orm-common** | ORM 컨트랙트 및 쿼리 빌딩 |
| **sd-orm-node** | Node.js ORM 구현 (SQLite3, MySQL2, MSSQL via Tedious) |
| **sd-cli** | 라이브러리, Angular 앱, Electron, Cordova, Capacitor 빌드 오케스트레이션 |
| **eslint-plugin** | 커스텀 ESLint 규칙 (sd-control attribute 검증 포함) |

### sd-angular 3계층 구조

```
Core 레이어: 디렉티브, 파이프, 프로바이더, signal 유틸리티 ($signal, $effect, $computed)
UI 레이어: SdButton, SdTextfield, SdSheet, SdModal, SdToast 등
Feature 레이어: 테마 시스템 (5개 테마), 데이터 뷰, 권한 테이블
```

## 설정 파일

- `simplysm.js` - 빌드 설정 (패키지 타입, 배포 설정, 폴리필 정의)
- `tsconfig.base.json` - TypeScript 기본 설정 (ES2022, ESNext 모듈, strict 모드)
- `eslint.config.js` - ESLint 9.x flat config (`@simplysm/eslint-plugin` 사용)
- `vitest.config.js` - 테스트 러너 (node 환경, globals 활성화)

## 코드 컨벤션

- **아이콘**: `ng-icons`의 `@ng-icons/tabler-icons` 사용 (FontAwesome 아님). [Tabler Icons 링크](https://ng-icons.github.io/ng-icons/#/browse-icons?iconset=tablerTools) 참고
- **상태 관리**: Angular Signals만 사용 (상태에 RxJS 미사용, HTTP/WebSocket에는 RxJS 사용)
- **패키지 매니저**: Yarn 4.12.0 (워크스페이스)

## 모바일 플러그인 패키지

- **Capacitor 플러그인** (4개): auto-update, broadcast (Android 전용), file-system, usb-storage
- **Cordova 플러그인** (3개): auto-update, file-system, usb-storage (레거시 지원)

## 중요 사항

- `sd-orm-common-ext`는 **deprecated** - 사용 금지
- 모든 패키지는 `@simplysm/` npm scope 사용
- Path alias: `@simplysm/*`는 `./packages/*/src/index.ts`로 매핑
