# SIMPLYSM

[![license](https://img.shields.io/github/license/kslhunter/simplysm)](https://github.com/kslhunter/simplysm/blob/master/LICENSE)

Angular 기반 풀스택 TypeScript 애플리케이션을 위한 모노레포 프레임워크입니다.

## 요구사항

| 항목 | 버전 |
|------|------|
| Node.js | 20.x (LTS) |
| Yarn | 4.x (Berry) |
| TypeScript | 5.8.x |
| Angular | 20.x |

### 데이터베이스 지원

| DBMS | 최소 버전 | 비고 |
|------|----------|------|
| MySQL | 8.0.14+ | LATERAL 지원 필요 |
| MSSQL | 2012+ | OFFSET...FETCH 지원 필요 |
| PostgreSQL | 9.0+ | LATERAL 지원 필요 |

## 설치

```bash
# npm
npm install @simplysm/core-common

# yarn
yarn add @simplysm/core-common
```

## 패키지 구조

```
@simplysm/angular          (마이그레이션 예정)
        ↓
@simplysm/service-server ←→ @simplysm/service-client
        ↓                           ↓
          @simplysm/service-common
        ↓
@simplysm/orm-node       @simplysm/storage
        ↓                       ↓
@simplysm/orm-common            ↓
        ↓                       ↓
@simplysm/core-browser   @simplysm/core-node   @simplysm/excel
        ↓                       ↓                    ↓
                  @simplysm/core-common
```

## 패키지 목록

### Core 패키지

| 패키지 | 설명 | 문서 |
|--------|------|------|
| [`@simplysm/core-common`](https://www.npmjs.com/package/@simplysm/core-common) | 브라우저/Node.js 공통 유틸리티 | [README](../../packages/core-common/README.md) |
| [`@simplysm/core-browser`](https://www.npmjs.com/package/@simplysm/core-browser) | 브라우저 전용 DOM 유틸리티 | [README](../../packages/core-browser/README.md) |
| [`@simplysm/core-node`](https://www.npmjs.com/package/@simplysm/core-node) | Node.js 전용 파일시스템/Worker 유틸리티 | [README](../../packages/core-node/README.md) |

### ORM 패키지

| 패키지 | 설명 | 문서 |
|--------|------|------|
| [`@simplysm/orm-common`](https://www.npmjs.com/package/@simplysm/orm-common) | 타입 안전한 ORM 쿼리 빌더 | [README](../../packages/orm-common/README.md) |
| [`@simplysm/orm-node`](https://www.npmjs.com/package/@simplysm/orm-node) | Node.js DB 연결 (MySQL/MSSQL/PostgreSQL) | [README](../../packages/orm-node/README.md) |

### Service 패키지

| 패키지 | 설명 | 문서 |
|--------|------|------|
| [`@simplysm/service-common`](https://www.npmjs.com/package/@simplysm/service-common) | 클라이언트-서버 프로토콜 및 타입 | [README](../../packages/service-common/README.md) |
| [`@simplysm/service-client`](https://www.npmjs.com/package/@simplysm/service-client) | WebSocket 기반 서비스 클라이언트 | [README](../../packages/service-client/README.md) |
| [`@simplysm/service-server`](https://www.npmjs.com/package/@simplysm/service-server) | WebSocket 기반 서비스 서버 | [README](../../packages/service-server/README.md) |

### 유틸리티 패키지

| 패키지 | 설명 | 문서 |
|--------|------|------|
| [`@simplysm/excel`](https://www.npmjs.com/package/@simplysm/excel) | Excel 파일 처리 (OOXML) | [README](../../packages/excel/README.md) |
| [`@simplysm/storage`](https://www.npmjs.com/package/@simplysm/storage) | FTP/SFTP 스토리지 클라이언트 | [README](../../packages/storage/README.md) |

### 개발 도구

| 패키지 | 설명 | 문서 |
|--------|------|------|
| [`@simplysm/eslint-plugin`](https://www.npmjs.com/package/@simplysm/eslint-plugin) | SIMPLYSM 프로젝트용 ESLint 규칙 | [README](../../packages/eslint-plugin/README.md) |
| [`@simplysm/cli`](https://www.npmjs.com/package/@simplysm/cli) | CLI 도구 (ESLint 래퍼) | [README](../../packages/cli/README.md) |
| [`@simplysm/claude`](https://www.npmjs.com/package/@simplysm/claude) | Claude Code 확장 배포 | [README](../../packages/claude/README.md) |

## 주요 기능 요약

### core-common

- **유틸리티**: `ObjectUtils`, `StringUtils`, `NumberUtils` (깊은 복사, 케이스 변환, 포맷팅)
- **커스텀 타입**: `Uuid`, `DateTime`, `DateOnly`, `Time` (불변 날짜/시간)
- **확장 메서드**: Array (`orderBy`, `groupBy`, `sum`), Map (`getOrCreate`), Set (`toggle`)
- **데이터 변환**: `JsonConvert` (커스텀 타입 지원), `CsvConvert`, `XmlConvert`
- **비동기 제어**: `Wait`, `SdAsyncFnDebounceQueue`, `SdAsyncFnSerialQueue`

### core-browser

- **DOM 유틸리티**: `findAll`, `findFirst`, `getParents`, `isFocusable`
- **HTML 유틸리티**: `repaint`, `getRelativeOffset`, `scrollIntoViewIfNeeded`
- **Blob 처리**: `downloadBlob`

### core-node

- **경로 유틸리티**: `PathUtils.posix`, `PathUtils.norm`, `PathUtils.isChildPath`
- **파일시스템**: `FsUtils.glob`, `FsUtils.readJson`, `FsUtils.writeAsync`
- **파일 감시**: `SdFsWatcher` (chokidar 기반)
- **타입 안전 Worker**: `SdWorker`, `createSdWorker`

### orm-common

- **타입 안전 쿼리**: LINQ-like Fluent API
- **Multi-Dialect**: MySQL, MSSQL, PostgreSQL 지원
- **Code First**: 코드 기반 스키마 정의 및 마이그레이션
- **SQL Injection 방지**: 자동 파라미터화

### orm-node

- **커넥션 풀링**: generic-pool 기반 자동 관리
- **네이티브 Bulk Insert**: MSSQL BulkLoad, MySQL LOAD DATA, PostgreSQL COPY
- **트랜잭션 지원**: 자동 롤백

### service-common

- **Binary Protocol**: 대용량 메시지 청킹 (최대 100MB)
- **타입 안전 이벤트**: `ServiceEventListener`
- **빌트인 서비스**: `IOrmService`, `ICryptoService`, `ISmtpService`

### excel

- **워크북/워크시트**: 생성, 읽기, 저장 (OOXML 포맷)
- **셀 조작**: 값, 스타일, 수식, 병합
- **이미지 삽입**: PNG, JPEG 등 지원
- **타입 안전 래퍼**: Zod 스키마 기반 `ExcelWrapper`

### storage

- **FTP/FTPS**: `FtpStorageClient` (basic-ftp 기반)
- **SFTP**: `SftpStorageClient` (ssh2-sftp-client 기반)
- **연결 관리**: `StorageFactory` (busyCount 동기화)

### eslint-plugin

- **TypeScript 규칙**: `no-hard-private`, `ts-no-unused-injects`
- **Angular 템플릿 규칙**: `ng-template-sd-require-binding-attrs`
- **권장 설정**: `sdPlugin.configs.root`

## 브라우저 지원

- **타겟**: Chrome 79+
- **빌드**: TypeScript ES2022 → esbuild (browserslist)
- **폴리필**: Node.js 내장 모듈 사용 가능 (`esbuild-plugins-node-modules-polyfill`)

```typescript
import path from "path";  // 브라우저에서도 사용 가능
Buffer.from("hello");     // 브라우저에서도 사용 가능
```

## 개발 가이드

개발 관련 상세 가이드는 [CLAUDE.md](CLAUDE.md)를 참고하세요.

## 라이선스

MIT
