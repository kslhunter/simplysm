# 소스 트리 분석

> 생성일: 2026-02-01
> 버전: 13.0.0-beta.0

## 프로젝트 구조

```
simplysm/                          # 모노레포 루트
├── packages/                      # 라이브러리 패키지
│   ├── cli/                       # CLI 도구 (node)
│   │   ├── src/
│   │   │   ├── sd-cli.ts         # CLI 엔트리포인트
│   │   │   ├── index.ts
│   │   │   ├── commands/         # CLI 명령어들
│   │   │   │   ├── typecheck.ts
│   │   │   │   ├── lint.ts
│   │   │   │   ├── watch.ts
│   │   │   │   ├── build.ts
│   │   │   │   ├── publish.ts
│   │   │   │   └── device.ts     # Capacitor 빌드
│   │   │   ├── workers/          # 워커 스레드
│   │   │   │   ├── typecheck.worker.ts
│   │   │   │   └── watch.worker.ts
│   │   │   └── utils/            # 유틸리티
│   │   │       ├── tsconfig.ts
│   │   │       └── sd-config.ts
│   │   └── tests/
│   │
│   ├── core-common/               # 공통 유틸리티 (neutral)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── globals.ts        # 전역 설정
│   │   │   ├── extensions/       # 프로토타입 확장 (Array, Map, Set)
│   │   │   │   ├── arr-ext.ts
│   │   │   │   ├── map-ext.ts
│   │   │   │   └── set-ext.ts
│   │   │   ├── types/            # 커스텀 타입
│   │   │   │   ├── date-time.ts
│   │   │   │   ├── date-only.ts
│   │   │   │   ├── time.ts
│   │   │   │   ├── uuid.ts
│   │   │   │   └── lazy-gc-map.ts
│   │   │   ├── features/         # 기능 클래스
│   │   │   │   ├── debounce-queue.ts
│   │   │   │   ├── serial-queue.ts
│   │   │   │   └── event-emitter.ts
│   │   │   ├── utils/            # 유틸리티 함수
│   │   │   │   ├── str.ts
│   │   │   │   ├── num.ts
│   │   │   │   ├── obj.ts
│   │   │   │   ├── bytes.ts
│   │   │   │   ├── xml.ts
│   │   │   │   └── wait.ts
│   │   │   ├── errors/           # 에러 클래스
│   │   │   │   ├── sd-error.ts
│   │   │   │   ├── argument-error.ts
│   │   │   │   └── timeout-error.ts
│   │   │   └── zip/              # ZIP 처리
│   │   │       └── sd-zip.ts
│   │   └── tests/
│   │
│   ├── core-browser/              # 브라우저 유틸리티 (browser)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── extensions/       # DOM 확장
│   │   │   │   ├── element-ext.ts
│   │   │   │   └── html-element-ext.ts
│   │   │   └── utils/
│   │   │       └── blob.ts
│   │   └── tests/
│   │
│   ├── core-node/                 # Node.js 유틸리티 (node)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── fs.ts         # 파일시스템 유틸리티
│   │   │   │   └── path.ts       # 경로 유틸리티
│   │   │   ├── features/
│   │   │   │   └── fs-watcher.ts # 파일 감시
│   │   │   └── worker/           # 워커 스레드
│   │   │       ├── worker.ts
│   │   │       └── create-worker.ts
│   │   └── tests/
│   │
│   ├── eslint-plugin/             # ESLint 플러그인 (node)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── rules/            # 커스텀 린트 규칙
│   │   └── tests/
│   │
│   ├── excel/                     # Excel 처리 (neutral)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── excel-workbook.ts
│   │   │   └── excel-worksheet.ts
│   │   └── tests/
│   │
│   ├── orm-common/                # ORM 공통 (neutral)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── db-context.ts     # DbContext 베이스 클래스
│   │   │   ├── schema/           # 테이블/뷰 빌더
│   │   │   │   ├── table-builder.ts
│   │   │   │   ├── view-builder.ts
│   │   │   │   ├── procedure-builder.ts
│   │   │   │   └── factory/      # 컬럼/인덱스/관계 빌더
│   │   │   │       ├── column-builder.ts
│   │   │   │       ├── index-builder.ts
│   │   │   │       └── relation-builder.ts
│   │   │   ├── exec/             # Queryable, Executable
│   │   │   │   ├── queryable.ts
│   │   │   │   ├── executable.ts
│   │   │   │   └── search-parser.ts
│   │   │   ├── expr/             # 표현식 빌더
│   │   │   │   ├── expr.ts
│   │   │   │   └── expr-unit.ts
│   │   │   ├── query-builder/    # DB별 쿼리 빌더
│   │   │   │   ├── base/
│   │   │   │   │   ├── query-builder-base.ts
│   │   │   │   │   └── expr-renderer-base.ts
│   │   │   │   ├── mysql/
│   │   │   │   │   ├── mysql-query-builder.ts
│   │   │   │   │   └── mysql-expr-renderer.ts
│   │   │   │   ├── mssql/
│   │   │   │   │   ├── mssql-query-builder.ts
│   │   │   │   │   └── mssql-expr-renderer.ts
│   │   │   │   └── postgresql/
│   │   │   │       ├── postgresql-query-builder.ts
│   │   │   │       └── postgresql-expr-renderer.ts
│   │   │   ├── types/
│   │   │   │   ├── db.ts
│   │   │   │   ├── column.ts
│   │   │   │   ├── expr.ts
│   │   │   │   └── query-def.ts
│   │   │   ├── models/
│   │   │   │   └── system-migration.ts
│   │   │   └── utils/
│   │   │       └── result-parser.ts
│   │   └── tests/
│   │
│   ├── orm-node/                  # ORM Node.js (node/backend)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── sd-orm.ts         # 메인 ORM 클래스
│   │   │   └── connections/      # DB 커넥션 구현체
│   │   │       ├── mysql-db-conn.ts
│   │   │       ├── mssql-db-conn.ts
│   │   │       └── postgresql-db-conn.ts
│   │   └── tests/
│   │
│   ├── service-common/            # 서비스 공통 (neutral)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── types/            # 프로토콜 타입
│   │   └── tests/
│   │
│   ├── service-client/            # WebSocket 클라이언트 (neutral)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── service-client.ts
│   │   │   ├── types/
│   │   │   │   ├── connection-config.ts
│   │   │   │   └── progress.types.ts
│   │   │   ├── transport/
│   │   │   │   ├── socket-provider.ts
│   │   │   │   └── service-transport.ts
│   │   │   ├── protocol/
│   │   │   │   └── client-protocol-wrapper.ts
│   │   │   └── features/
│   │   │       ├── event-client.ts
│   │   │       ├── file-client.ts
│   │   │       └── orm/
│   │   │           ├── orm-connect-config.ts
│   │   │           ├── orm-client-connector.ts
│   │   │           └── orm-client-db-context-executor.ts
│   │   └── tests/
│   │
│   ├── service-server/            # HTTP/WebSocket 서버 (node/backend)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── service-server.ts # Fastify 서버
│   │   │   ├── types/
│   │   │   │   └── server-options.ts
│   │   │   ├── auth/             # JWT 인증
│   │   │   │   ├── auth.decorators.ts
│   │   │   │   ├── auth-token-payload.ts
│   │   │   │   └── jwt-manager.ts
│   │   │   ├── core/             # 서비스 실행기
│   │   │   │   ├── service-base.ts
│   │   │   │   └── service-executor.ts
│   │   │   ├── services/         # 내장 서비스
│   │   │   │   ├── orm-service.ts
│   │   │   │   ├── crypto-service.ts
│   │   │   │   ├── smtp-service.ts
│   │   │   │   └── auto-update-service.ts
│   │   │   ├── transport/        # HTTP/WebSocket 핸들러
│   │   │   │   ├── http/
│   │   │   │   │   ├── http-request-handler.ts
│   │   │   │   │   ├── upload-handler.ts
│   │   │   │   │   └── static-file-handler.ts
│   │   │   │   └── socket/
│   │   │   │       ├── websocket-handler.ts
│   │   │   │       └── service-socket.ts
│   │   │   ├── protocol/
│   │   │   │   └── protocol-wrapper.ts
│   │   │   ├── utils/
│   │   │   │   └── config-manager.ts
│   │   │   └── legacy/
│   │   │       └── v1-auto-update-handler.ts
│   │   └── tests/
│   │
│   ├── solid/                     # SolidJS UI 컴포넌트 (browser/web)
│   │   ├── src/
│   │   │   ├── index.ts          # Button, tailwindPreset export
│   │   │   ├── tailwind-preset.ts # Tailwind CSS 프리셋
│   │   │   └── components/
│   │   │       └── controls/
│   │   │           └── Button.tsx # 현재 유일한 활성 컴포넌트
│   │   ├── tests/
│   │   ├── CLAUDE.md             # Solid 패키지 특화 규칙
│   │   └── base.css              # 기본 CSS
│   │
│   ├── solid-demo/                # SolidJS 데모 앱 (client/web)
│   │   ├── src/
│   │   │   ├── main.tsx          # 앱 엔트리포인트
│   │   │   ├── main.css          # 메인 CSS
│   │   │   └── App.tsx
│   │   ├── public/               # 정적 파일
│   │   │   └── favicon.ico
│   │   └── tailwind.config.ts
│   │
│   └── storage/                   # FTP/SFTP 클라이언트 (node/backend)
│       ├── src/
│       │   ├── index.ts
│       │   ├── storage-factory.ts
│       │   └── clients/          # FTP/SFTP 구현
│       └── tests/
│
├── tests/                         # 통합 테스트
│   ├── orm/                       # ORM 통합 테스트 (Docker DB 필요)
│   └── service/                   # 서비스 통합 테스트
│
├── docs/                          # 프로젝트 문서
│   ├── index.md                  # 마스터 인덱스
│   ├── architecture.md
│   ├── technology-stack.md
│   ├── source-tree-analysis.md
│   ├── component-inventory.md
│   ├── api-contracts.md
│   └── development-guide.md
│
├── .back/                         # 백업 파일
│   └── 260201/                   # 2026-02-01 백업
│       └── solid/                # 기존 solid 패키지 백업
│
├── _bmad/                         # BMAD 워크플로우 설정
│   ├── bmm/                      # BMM 모듈 설정
│   ├── core/                     # 코어 설정
│   ├── cis/                      # CIS 모듈
│   └── tea/                      # TEA 모듈
│
├── _bmad-output/                  # BMAD 워크플로우 출력
│   ├── planning-artifacts/
│   └── implementation-artifacts/
│
├── .cache/                        # 빌드 캐시
│   ├── eslint.cache
│   ├── typecheck-*.tsbuildinfo
│   └── dts.tsbuildinfo
│
├── package.json                   # 루트 package.json
├── pnpm-workspace.yaml           # pnpm 워크스페이스 설정
├── tsconfig.json                 # TypeScript 설정
├── vitest.config.ts              # Vitest 테스트 설정
├── eslint.config.ts              # ESLint 설정
├── sd.config.ts                  # Simplysm CLI 설정
└── CLAUDE.md                     # AI 어시스턴트 가이드
```

## 엔트리포인트

| 패키지 | 엔트리포인트 | 설명 |
|--------|-------------|------|
| cli | `src/sd-cli.ts` | CLI 도구 실행 |
| core-common | `src/index.ts` | 공통 유틸리티 export |
| core-browser | `src/index.ts` | 브라우저 유틸리티 export |
| core-node | `src/index.ts` | Node.js 유틸리티 export |
| eslint-plugin | `src/index.ts` | ESLint 규칙 export |
| excel | `src/index.ts` | Excel 처리 export |
| orm-common | `src/index.ts` | ORM 쿼리 빌더 export |
| orm-node | `src/index.ts` | DB 커넥션 export |
| service-common | `src/index.ts` | 서비스 프로토콜 export |
| service-client | `src/index.ts` | WebSocket 클라이언트 export |
| service-server | `src/index.ts` | Fastify 서버 export |
| solid | `src/index.ts` | Button, tailwindPreset export |
| solid-demo | `src/main.tsx` | 데모 앱 렌더링 |
| storage | `src/index.ts` | FTP/SFTP 클라이언트 export |

## 주요 디렉토리 설명

### packages/cli/src/commands/
CLI 명령어 구현체:
- `typecheck.ts` - TypeScript 타입 검사
- `lint.ts` - ESLint 린트 검사
- `watch.ts` - 개발 모드 (빌드 + .d.ts 생성)
- `build.ts` - 프로덕션 빌드
- `publish.ts` - npm 패키지 배포
- `device.ts` - Capacitor 모바일 빌드

### packages/orm-common/src/schema/
테이블, 뷰, 프로시저 정의를 위한 Fluent API 빌더 제공

### packages/orm-common/src/query-builder/
MySQL, MSSQL, PostgreSQL 각각에 대한 SQL 쿼리 생성 로직

### packages/service-server/src/transport/
HTTP 요청 처리와 WebSocket 연결 관리 담당

### packages/service-server/src/services/
내장 서비스:
- `orm-service.ts` - ORM 쿼리 실행
- `crypto-service.ts` - 암호화
- `smtp-service.ts` - 이메일 발송
- `auto-update-service.ts` - 자동 업데이트

### packages/solid/
⚠️ **현재 Tailwind CSS로 마이그레이션 중**
- 현재 활성 컴포넌트: `Button.tsx`
- `tailwind-preset.ts` - Tailwind CSS 프리셋 제공
- 기존 컴포넌트들은 `.back/260201/solid/`에 백업됨

## 현재 상태

### solid 패키지 마이그레이션
- **이전**: vanilla-extract 기반 CSS-in-JS
- **현재**: Tailwind CSS 기반으로 전환 중
- **활성 컴포넌트**: Button만 마이그레이션 완료
- **백업 위치**: `.back/260201/solid/`

### 새로 추가된 CLI 명령어
- `device.ts` - Capacitor Android 빌드 지원

---

*이 문서는 document-project 워크플로우에 의해 자동 생성되었습니다.*
