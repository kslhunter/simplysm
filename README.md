# SIMPLYSM

Signal 기반 Angular UI 프레임워크 및 엔터프라이즈급 풀스택 플랫폼

## 개요

SIMPLYSM은 **Angular 20+ Signal 기반**의 UI 프레임워크와 **Fastify 백엔드**, **ORM**, **모바일 플러그인**을 포함한 통합 개발 플랫폼입니다. 기업용 Admin UI, 업무 시스템, 대규모 Feature 기반 프로젝트에 적합하도록 설계되었습니다.

## 의존성

- **Angular**: 20.x
- **TypeScript**: 5.8.x
- **Node.js**: 20.x
- **Yarn**: 4.12.0

## 설치

```bash
# 저장소 클론
git clone https://github.com/kslhunter/simplysm.git

# 의존성 설치
yarn install
```

### 개별 패키지 설치

```bash
# UI 프레임워크
npm install @simplysm/sd-angular

# 백엔드 서버
npm install @simplysm/sd-service-server

# ORM (필요한 DB 드라이버와 함께)
npm install @simplysm/sd-orm-node mysql2
```

## 패키지 구조

### Core 패키지
| 패키지 | 설명 |
|--------|------|
| `@simplysm/sd-core-common` | 기반 유틸리티 (XML, YAML, ZIP, 리플렉션) |
| `@simplysm/sd-core-browser` | 브라우저 환경 유틸리티 |
| `@simplysm/sd-core-node` | Node.js 환경 유틸리티 |

### UI 프레임워크
| 패키지 | 설명 |
|--------|------|
| `@simplysm/sd-angular` | Signal 기반 Angular UI 컴포넌트 (폼, 레이아웃, 데이터, 오버레이) |
| `@simplysm/sd-service-client` | 서비스 통신용 WebSocket 클라이언트 |

### 백엔드
| 패키지 | 설명 |
|--------|------|
| `@simplysm/sd-service-server` | Fastify REST/WebSocket 서버 (JWT 인증) |
| `@simplysm/sd-service-common` | 서비스 공통 타입 및 프로토콜 |
| `@simplysm/sd-storage` | FTP/SFTP 스토리지 모듈 |

### 데이터베이스
| 패키지 | 설명 |
|--------|------|
| `@simplysm/sd-orm-common` | ORM 공통 인터페이스 및 쿼리 빌더 |
| `@simplysm/sd-orm-node` | Node.js ORM 구현 (SQLite3, MySQL2, MSSQL) |

### 유틸리티
| 패키지 | 설명 |
|--------|------|
| `@simplysm/sd-excel` | Excel 파일 처리 (XLSX 내보내기/가져오기) |
| `@simplysm/sd-cli` | 빌드 CLI (watch, build, publish) |
| `@simplysm/eslint-plugin` | 커스텀 ESLint 규칙 |

### 모바일 플러그인
**Capacitor** (iOS/Android):
- `@simplysm/capacitor-plugin-auto-update` - OTA 업데이트
- `@simplysm/capacitor-plugin-broadcast` - Intent 브로드캐스트 (Android)
- `@simplysm/capacitor-plugin-file-system` - 파일 시스템
- `@simplysm/capacitor-plugin-usb-storage` - USB 스토리지

**Cordova** (레거시):
- `@simplysm/cordova-plugin-auto-update`
- `@simplysm/cordova-plugin-file-system`
- `@simplysm/cordova-plugin-usb-storage`

## 개발

```bash
# 개발 모드 (watch)
yarn watch

# 빌드
yarn build

# 린트 수정
yarn eslint:fix

# 테스트
vitest
```

## sd-angular 사용 예시

### 초기 설정

```typescript
import { provideSdAngular } from "@simplysm/sd-angular";

bootstrapApplication(AppComponent, {
  providers: [
    provideSdAngular({
      defaultTheme: "compact",
      defaultDark: false
    })
  ]
});
```

### 컴포넌트 사용

```html
<sd-form>
  <sd-textfield label="이름" />
  <sd-select label="유형" [items]="types" />
  <sd-button (click)="save()">저장</sd-button>
</sd-form>

<sd-sheet [items]="rows" (itemSelect)="onSelect($event)" />
```

### 테마
5가지 테마 제공: `compact`, `mobile`, `kiosk`, `modern`, `dark`

```html
<sd-theme-selector></sd-theme-selector>
```

## 주요 업데이트

### 12.15.x → 12.16.x

- ESLint 오류는 `yarn eslint:fix`로 대부분 수정 가능
- **아이콘 시스템 변경**: FontAwesome → ng-icons (`@ng-icons/tabler-icons`)
  - [Tabler Icons 브라우저](https://ng-icons.github.io/ng-icons/#/browse-icons?iconset=tablerTools)
  - 기존 FontAwesome 계속 사용 가능, sd-angular 컨트롤의 `[icon]` 속성만 수정 필요

### 12.14.x → 12.15.x

- `sd-dock-container`, `sd-dock` 컨트롤 복원
- 레이아웃 컨트롤(디렉티브) 변경: `sd-flex`, `sd-form-*`, `sd-grid`, `sd-card`, `sd-pane`, `sd-table`
  - 태그/속성/클래스 방식으로 사용 가능
  - 일부 Control이 Directive로 변경 (import 변경 필요)
- ESLint에 sd-컨트롤 attribute 관련 규칙 추가
  - `yarn eslint:fix`로 자동 수정 가능

## 라이선스

MIT

## 기여

이슈 및 PR은 [GitHub](https://github.com/kslhunter/simplysm)에서 환영합니다.
