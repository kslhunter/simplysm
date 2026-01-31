# 소스 트리 분석

> 생성일: 2026-01-31

## 프로젝트 구조

```
simplysm/                          # 모노레포 루트
├── packages/                      # 라이브러리 패키지
│   ├── cli/                       # CLI 도구 (node)
│   │   ├── src/
│   │   │   ├── sd-cli.ts         # CLI 엔트리포인트
│   │   │   ├── commands/         # CLI 명령어들
│   │   │   └── ...
│   │   └── tests/
│   │
│   ├── core-common/               # 공통 유틸리티 (neutral)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── extensions/       # 프로토타입 확장 (Array, Map, Set)
│   │   │   ├── types/            # 커스텀 타입 (DateTime, Uuid 등)
│   │   │   ├── utils/            # 유틸리티 함수
│   │   │   └── errors/           # 에러 클래스
│   │   └── tests/
│   │
│   ├── core-browser/              # 브라우저 유틸리티 (browser)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── extensions/       # DOM 확장
│   │   └── tests/
│   │
│   ├── core-node/                 # Node.js 유틸리티 (node)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── fs/               # 파일시스템 유틸리티
│   │   │   └── workers/          # 워커 관련
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
│   │   │   ├── schema/           # 테이블/뷰 빌더
│   │   │   ├── exec/             # Queryable, Executable
│   │   │   ├── expr/             # 표현식 빌더
│   │   │   ├── query-builder/    # DB별 쿼리 빌더
│   │   │   │   ├── mysql/
│   │   │   │   ├── mssql/
│   │   │   │   └── postgresql/
│   │   │   └── types/
│   │   └── tests/
│   │
│   ├── orm-node/                  # ORM Node.js (node/backend)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── sd-orm.ts         # 메인 ORM 클래스
│   │   │   ├── connections/      # DB 커넥션 구현체
│   │   │   │   ├── mysql-db-conn.ts
│   │   │   │   ├── mssql-db-conn.ts
│   │   │   │   └── postgresql-db-conn.ts
│   │   │   └── types/
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
│   │   │   └── service-client.ts
│   │   └── tests/
│   │
│   ├── service-server/            # HTTP/WebSocket 서버 (node/backend)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── service-server.ts # Fastify 서버
│   │   │   ├── auth/             # JWT 인증
│   │   │   ├── core/             # 서비스 실행기
│   │   │   ├── services/         # 내장 서비스
│   │   │   ├── transport/        # HTTP/WebSocket 핸들러
│   │   │   │   ├── http/
│   │   │   │   └── socket/
│   │   │   └── workers/
│   │   └── tests/
│   │
│   ├── solid/                     # SolidJS UI 컴포넌트 (browser/web)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── styles.ts         # 스타일 export
│   │   │   ├── components/       # UI 컴포넌트
│   │   │   │   ├── controls/     # 입력 컴포넌트
│   │   │   │   ├── data/         # 데이터 표시
│   │   │   │   ├── navigator/    # 네비게이션
│   │   │   │   └── overlay/      # 오버레이
│   │   │   ├── contexts/         # React-like 컨텍스트
│   │   │   ├── directives/       # SolidJS 디렉티브
│   │   │   ├── hooks/            # 커스텀 훅
│   │   │   └── styles/           # vanilla-extract 스타일
│   │   │       ├── variables/
│   │   │       └── mixins/
│   │   └── tests/
│   │
│   ├── solid-demo/                # SolidJS 데모 앱 (client/web)
│   │   ├── src/
│   │   │   ├── main.tsx          # 앱 엔트리포인트
│   │   │   └── pages/            # 페이지 컴포넌트
│   │   └── public/               # 정적 파일
│   │
│   └── storage/                   # FTP/SFTP 클라이언트 (node/backend)
│       ├── src/
│       │   ├── index.ts
│       │   ├── storage-factory.ts
│       │   ├── clients/          # FTP/SFTP 구현
│       │   └── types/
│       └── tests/
│
├── tests/                         # 통합 테스트
│   ├── orm/                       # ORM 통합 테스트 (Docker DB 필요)
│   └── service/                   # 서비스 통합 테스트
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
| solid | `src/index.ts` | UI 컴포넌트 export |
| solid-demo | `src/main.tsx` | 데모 앱 렌더링 |
| storage | `src/index.ts` | FTP/SFTP 클라이언트 export |

## 주요 디렉토리 설명

### packages/orm-common/src/schema/
테이블, 뷰, 프로시저 정의를 위한 Fluent API 빌더 제공

### packages/orm-common/src/query-builder/
MySQL, MSSQL, PostgreSQL 각각에 대한 SQL 쿼리 생성 로직

### packages/service-server/src/transport/
HTTP 요청 처리와 WebSocket 연결 관리 담당

### packages/solid/src/components/
재사용 가능한 SolidJS UI 컴포넌트 (controls, data, navigator, overlay 카테고리)

### packages/solid/src/styles/
vanilla-extract 기반 CSS-in-JS 스타일 시스템 (테마, 색상, 토큰)
