# SIMPLYSM 패키지 마이그레이션 계획

> `.legacy-packages` → `packages`로의 완전 재구축 프로젝트

---

## 기술 스택 및 환경

| 기술 | 버전 | 비고 |
|------|------|------|
| Node.js | 20.x | LTS |
| Yarn | 4.x | Berry |
| TypeScript | 5.8.x | strict 모드 |
| Angular | 20.x | 시그널 기반 |
| Vitest | 4.x | 테스트 프레임워크 |
| MySQL | 8.0.14+ | |
| MSSQL | 2012+ | |
| PostgreSQL | 9.0+ | |

### 브라우저 환경 Node.js 폴리필
- `esbuild-plugins-node-modules-polyfill` 사용
- 브라우저에서 `path`, `Buffer` 등 Node.js 내장 모듈 사용 가능

---

## 현재 상태

### 완료된 패키지 (7개)
| 신규 패키지 | 레거시 | 상태 |
|------------|--------|------|
| `core-common` | `sd-core-common` | ✅ 완료 |
| `core-browser` | `sd-core-browser` | ✅ 완료 |
| `core-node` | `sd-core-node` | ✅ 완료 |
| `orm-common` | `sd-orm-common` | ✅ 완료 |
| `orm-node` | `sd-orm-node` | ✅ 완료 |
| `service-common` | `sd-service-common` | ✅ 완료 |
| `eslint-plugin` | - | ✅ 신규 |

### 마이그레이션 대상 (12개)
| 레거시 패키지 | 목표 | 우선순위 |
|--------------|------|----------|
| `sd-service-client` | `service-client` | P2 |
| `sd-service-server` | `service-server` | P2 |
| `sd-angular` | `angular` | P3 |
| `sd-cli` | `cli` | P3 |
| `sd-excel` | `excel` | P4 |
| `sd-storage` | `storage` | P4 |
| `capacitor-plugin-*` (4개) | TBD | P5 |
| `cordova-plugin-*` (3개) | ❌ 폐기 | - |

---

## 마이그레이션 원칙

### 1. 표준 기술 우선
- 브라우저: 표준 Web API 사용 (polyfill 최소화)
- Node.js: 내장 모듈 사용 (`fs/promises`, `node:path` 등)
- 널리 사용되는 안정적 외부 패키지 사용
- 불필요한 추상화 제거

### 2. 구조 개선
- `sd-` 접두사 제거 (패키지명 단순화)
- 불필요한 레거시 지원 코드 제거
- 명확한 모듈 경계 및 책임 분리

### 3. 코드 품질
- TypeScript strict 모드 완전 적용
- ESLint 규칙 준수 (eslint-plugin)
- 테스트 커버리지 확보
- 각 패키지 `CLAUDE.md`, `README.md` 포함

### 4. CLAUDE.md 규칙 준수
- **레이어 의존성**: 단방향 의존, 건너뛰기 금지, 순환 참조 금지
- **파일 구조**: `src/index.ts`만 존재, 하위 디렉토리에 `index.ts` 금지
- **Import**: 패키지 간 `@simplysm/*` 별칭 사용
- **코딩 스타일**: `private` 키워드, `null` 대신 `undefined`, `===` 사용 등

### 5. 권장사항
- 클래스/함수/변수등의 명칭은 적절한 명칭으로 변경 권장

---

## Phase 1: Core 레이어 (Foundation)

### 1.1 `core-browser` ✅ 완료
**소스**: `.legacy-packages/sd-core-browser`

| 레거시 파일 | 마이그레이션 결과 |
|------------|------------------|
| `Blob.ext.ts` | `BlobUtils.download()` |
| `Element.ext.ts` | `ElementUtils` 네임스페이스 |
| `HtmlElement.ext.ts` | `HtmlElementUtils` 네임스페이스 |
| `HtmlElementUtils.ts` | `HtmlElementUtils` 네임스페이스에 통합 |

**주요 변경**:
- 프로토타입 확장 → 네임스페이스 패턴으로 전환 (`BlobUtils`, `ElementUtils`, `HtmlElementUtils`)
- 불필요한 polyfill 제거 (IE11 등)
- `tabbable` 패키지 도입 (포커스 가능 요소 탐지)
- 포커스 관련 함수는 사용자가 `tabbable` 직접 사용 (`ElementUtils.findFocusableParent`만 제공)

### 1.2 `core-node` ✅ 완료
**소스**: `.legacy-packages/sd-core-node`

| 레거시 파일 | 마이그레이션 방향 |
|------------|------------------|
| `FsUtils.ts` | `node:fs/promises` 기반으로 재작성 |
| `PathUtils.ts` | `node:path` 직접 사용, 필요시 유틸만 |
| `HashUtils.ts` | ❌ 제거 (7줄 래퍼, 직접 crypto 사용) |
| `SdFsWatcher.ts` | `chokidar` 래퍼 개선 |
| `SdLogger.ts` | ❌ 제거 → `pino` + `ora` 사용 (브라우저/Node 통합 지원) |
| `SdProcess.ts` | ❌ 제거 → `execa` 패키지로 대체 |
| `worker/` | Worker 유틸리티 개선 |

**주요 변경**:
- `execa` 패키지 도입 (SdProcess 대체)
- `HashUtils` 제거 (직접 crypto 사용)
- `SdLogger` 제거 → `pino` + `ora` 사용 (콘솔 스피너 + 파일 로깅)
- `glob` 유지 (패턴 파싱 복잡, 안정적 라이브러리)

---

## Phase 2: ORM & Service 레이어

> **의존성 순서**: orm-node → service-common → service-client/server
>
> 이 순서대로 진행해야 함 (CLAUDE.md 레이어 규칙 준수)

### 2.1 `orm-node` ✅ 완료
**소스**: `.legacy-packages/sd-orm-node`

| 레거시 파일 | 마이그레이션 결과 |
|------------|------------------|
| `MssqlDbConn` | `connections/mssql-db-conn.ts` |
| `MysqlDbConn` | `connections/mysql-db-conn.ts` |
| `PostgresDbConn` | `connections/postgresql-db-conn.ts` |
| `PooledDbConn` | `pooled-db-conn.ts` |
| `DbConnectionFactory` | `db-conn-factory.ts` |
| `SdOrmDbContext*` | `node-db-context-executor.ts` |
| - | `sd-orm.ts` (최상위 진입점) |

**주요 변경**:
- generic-pool 기반 커넥션 풀링 유지
- pino 로깅 도입 (SdLogger 대체)
- PostgreSQL 네이티브 Bulk Insert (pg-copy-streams)
- SQLite 지원 제거 (orm-common에 QueryBuilder 없음)
- 타입: `any` → `unknown` 또는 구체적 타입

### 2.2 `service-common` ✅ 완료
**소스**: `.legacy-packages/sd-service-common`

| 레거시 파일 | 마이그레이션 결과 |
|------------|------------------|
| `SdServiceProtocol.ts` | `protocol/service-protocol.ts` |
| `protocol.types.ts` | `protocol/protocol.types.ts` |
| `*-service.types.ts` | `service-types/*.types.ts` |
| `SdServiceEventListenerBase` | `types.ts` (ServiceEventListener) |

**주요 변경**:
- `Sd` 접두사 제거
- `SdServiceEventListenerBase` → `abstract class ServiceEventListener`
- `eventName`을 abstract로 변경 (mangle-safe, 상속 시 필수 구현)
- `$info`, `$data` declare 프로퍼티로 타입 추출

### 2.3 `service-client` (신규 생성)
**소스**: `.legacy-packages/sd-service-client`

| 구성요소 | 마이그레이션 방향 |
|---------|------------------|
| `SdServiceClient` | 클라이언트 코어 정리 |
| `features/*` | 기능별 모듈 분리 유지 |
| `transport/` | WebSocket 전송 계층 개선 |
| `workers/` | Web Worker 처리 개선 |

**주요 변경**:
- 표준 `fetch` API 활용 강화
- WebSocket 연결 관리 개선

### 2.4 `service-server` (신규 생성)
**소스**: `.legacy-packages/sd-service-server`

| 구성요소 | 마이그레이션 방향 |
|---------|------------------|
| `SdServiceServer` | Fastify 기반 유지 |
| `auth/` | JWT 인증 개선 |
| `services/` | 빌트인 서비스 정리 |
| `transport/` | HTTP/WS 핸들러 개선 |
| `legacy/` | ❌ V1 지원 완전 제거 |

**주요 변경**:
- Fastify 5.x 최신 패턴 적용
- 레거시 V1 프로토콜 제거
- 미들웨어/플러그인 구조 개선

---

## Phase 3: Application 레이어

### 3.1 `angular` (신규 생성)
**소스**: `.legacy-packages/sd-angular` (160+ 파일)

**구조 재설계**:
```
angular/
├── core/           # 코어 유틸리티, 프로바이더
├── components/     # UI 컴포넌트 (layout, form, data, nav, overlay)
├── directives/     # 디렉티브
├── pipes/          # 파이프
└── features/       # 도메인 기능 (address, permission 등)
```

**마이그레이션 전략**:
1. Angular 20 시그널 API 완전 적용
2. Standalone 컴포넌트 패턴
3. 불필요한 컴포넌트 정리/통합
4. SCSS → CSS-in-TS 또는 Tailwind 검토

**우선순위 컴포넌트**:
- P1: Layout (dock, flex, grid), Form (textfield, select, checkbox)
- P2: Data (sheet, list), Navigation (sidebar, topbar, tab)
- P3: Overlay (modal, dropdown, toast, busy)
- P4: Visual (echarts, calendar), Features

### 3.2 `cli` (신규 생성)
**소스**: `.legacy-packages/sd-cli`

**구조 재설계**:
```
cli/
├── commands/       # CLI 명령어
├── builders/       # 빌드 러너
├── bundlers/       # esbuild/NG 번들러
├── generators/     # 코드 생성기
└── utils/          # 공통 유틸리티
```

**마이그레이션 전략**:
1. Cordova 지원 제거
2. Capacitor 지원 유지/개선
3. Electron 지원 유지/개선
4. Angular CLI 연동 최신화

---

## Phase 4: Utility 레이어

### 4.1 `excel` (신규 생성)
**소스**: `.legacy-packages/sd-excel`

| 구성요소 | 마이그레이션 방향 |
|---------|------------------|
| `SdExcelWorkbook` | 유지, 인터페이스 개선 |
| `legacy/` | ❌ 레거시 리더 제거 |
| `xmls/` | XML 파서 정리 |

**주요 변경**:
- xlsx 라이브러리 의존 검토 (SheetJS vs ExcelJS)
- 이미지 삽입 기능 개선
- 스트리밍 지원 검토

### 4.2 `storage` (신규 생성)
**소스**: `.legacy-packages/sd-storage`

| 구성요소 | 마이그레이션 방향 |
|---------|------------------|
| `SdFtpStorage` | basic-ftp 기반 유지 |
| `SdSftpStorage` | ssh2-sftp-client 기반 유지 |

**주요 변경**:
- 인터페이스 단순화
- 에러 핸들링 표준화

---

## Phase 5: Mobile 플러그인

### 5.1 Capacitor 플러그인 (검토 필요)
| 플러그인 | 검토 사항 |
|---------|----------|
| `auto-update` | 공식 플러그인 대체 가능성 검토 |
| `broadcast` | Android 전용, 필요성 검토 |
| `file-system` | Capacitor Filesystem 플러그인 검토 |
| `usb-storage` | 특수 용도, 필요시 유지 |

### 5.2 Cordova 플러그인
- ❌ **전체 폐기** - Capacitor로 완전 전환

---

## 실행 일정 (예상)

| Phase | 패키지 | 예상 작업량 |
|-------|--------|------------|
| 1 | core-browser, core-node | 중 |
| 2 | orm-node, service-* | 대 |
| 3 | angular, cli | 매우 큼 |
| 4 | excel, storage | 소 |
| 5 | capacitor-* | 중 |

---

## 검증 체크리스트

각 Phase 완료 시:
- [ ] TypeScript 컴파일 성공: `npx tsc --noEmit -p packages/{package}/tsconfig.json`
- [ ] ESLint 통과: `npx eslint "packages/{package}/**/*.{ts,js,html}"`
- [ ] Vitest 테스트 통과: `npx vitest run packages/{package}` (tests 폴더 존재 시)
- [ ] 의존성 패키지와 통합 테스트
- [ ] 기존 프로젝트 호환성 검증

---

## 위험 요소 및 대응

| 위험 | 대응 |
|------|------|
| Angular 컴포넌트 대량 변경 | 점진적 마이그레이션, 호환 레이어 |
| CLI 빌드 시스템 복잡성 | 단계별 분리, 충분한 테스트 |
| 기존 프로젝트 영향 | 버전 분리 (13.x), 마이그레이션 가이드 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-01-06 | 초안 작성 |
| 2026-01-06 | `core-browser` 마이그레이션 완료 |
| 2026-01-06 | `orm-common` sd-core-common → core-common 의존성 마이그레이션 완료 (1,108개 테스트 통과) |
| 2026-01-07 | `core-browser` 개선: 네임스페이스 구조 적용, `tabbable` 패키지 도입 |
| 2026-01-07 | `core-node` 마이그레이션 완료 |
| 2026-01-07 | `orm-node` 마이그레이션 완료: generic-pool 커넥션 풀링, pino 로깅, PostgreSQL 지원 |
| 2026-01-07 | `service-common` 마이그레이션 완료: 프로토콜 정의, ServiceEventListener 추상 클래스 |
| 2026-01-07 | 마이그레이션 계획 업데이트: 완료 패키지 7개, 남은 패키지 12개 |
