# service-common 개발 가이드

> SimplySM 프레임워크의 서비스 프로토콜 및 공통 타입 패키지 - Claude Code 참고 문서
>
> **주의:** `sd-service-common`(구버전)은 참고 금지.

**이 문서는 Claude Code가 service-common 패키지를 개발/수정할 때 참고하는 가이드입니다.**
**사용자 문서는 [README.md](README.md)를 참고하세요.**

## 아키텍처

```
Application
    ↓
angular, cli, etc.
    ↓
service-client / service-server
    ↓
service-common    ← 공유 프로토콜/타입
    ↓
orm-common (타입만)
    ↓
core-common
```

**핵심**: service-client와 service-server가 공유하는 프로토콜 및 타입 정의.

## 모듈 구조

```
src/
├── protocol/
│   ├── protocol.types.ts    # 메시지 타입 정의
│   └── service-protocol.ts  # 인코딩/디코딩
├── service-types/
│   ├── orm-service.types.ts
│   ├── crypto-service.types.ts
│   ├── auto-update-service.types.ts
│   └── smtp-service.types.ts
├── types.ts                 # ServiceEventListener, IServiceUploadResult
└── index.ts                 # 진입점
```

## 주요 컴포넌트

### ServiceProtocol (protocol/service-protocol.ts)

Binary Protocol V2 인코더/디코더.

**상수 (하드코딩)**:
| 상수 | 값 | 설명 |
|------|-----|------|
| `_MAX_TOTAL_SIZE` | 100MB | 메시지 최대 크기 |
| `_SPLIT_MESSAGE_SIZE` | 3MB | 청킹 임계값 |
| `_CHUNK_SIZE` | 300KB | 청크 크기 |
| GC Interval | 10초 | LazyGcMap 정리 주기 |
| Expire Time | 60초 | 미완성 메시지 만료 |

### ServiceEventListener (types.ts)

이벤트 리스너 타입 정의용 추상 클래스.

**특징**:
- `abstract readonly eventName`: 상속 시 필수 구현 (컴파일 에러로 강제)
- `declare readonly $info/$data`: 타입 추출용, JS 코드 생성 안 함
- `prototype.eventName`: 인스턴스 생성 없이 이벤트명 조회

### 서비스 인터페이스 (service-types/)

| 인터페이스 | 설명 |
|-----------|------|
| `IOrmService` | DB 연결/쿼리 서비스 |
| `ICryptoService` | 암호화 서비스 |
| `IAutoUpdateService` | 자동 업데이트 서비스 |
| `ISmtpService` | 이메일 전송 서비스 |

## sd-service-common과의 차이

### 변경됨

| 항목 | 레거시 | 신규 |
|------|--------|------|
| 네이밍 | `SdServiceProtocol` | `ServiceProtocol` |
| 타입명 | `ISdServiceReloadMessage` | `IServiceReloadMessage` |
| EventListener | `class SdServiceEventListenerBase` | `abstract class ServiceEventListener` |
| 프로퍼티 | `info`, `data` | `$info`, `$data` (declare) |
| 이벤트명 | `constructor.name` (mangle 위험) | `eventName` (mangle 안전) |
| import | `@simplysm/sd-*` | `@simplysm/*` |

### 개선됨

| 항목 | 변경 내용 |
|------|----------|
| `eventName` | abstract로 상속 시 필수 구현 강제 |
| `$info/$data` | declare로 상속 시 재선언 불필요 |
| 타입 | `any` → `unknown` |

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/service-common/tsconfig.json 2>&1 | grep "^packages/service-common/"

# ESLint
npx eslint "packages/service-common/**/*.ts"
```
