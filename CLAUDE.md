# Simplysm

pnpm 모노레포. 패키지 경로: `packages/*`, 테스트: `tests/*`

## 명령어

모든 명령어는 내부적으로 `pnpm sd-cli <명령>`을 실행한다. 모든 명령에 `--debug` 플래그 사용 가능.
`[targets..]`를 지정하지 않으면 `sd.config.ts`에 정의된 전체 패키지 대상으로 실행된다.
타겟은 패키지 경로로 지정한다 (예: `packages/core-common`, `tests/orm`).

### 개발

```bash
pnpm dev [targets..]                     # client+server 패키지 개발 모드 실행
pnpm dev packages/solid-demo             # 특정 패키지만 dev 모드
pnpm dev -o key=value                    # sd.config.ts에 옵션 전달

pnpm watch [targets..]                   # 라이브러리 패키지 빌드 워치 모드
pnpm watch packages/core-common          # 특정 패키지만 워치
```

### 빌드 & 배포

```bash
pnpm build [targets..]                   # 프로덕션 빌드
pnpm build packages/solid                # 특정 패키지만 빌드

pnpm pub [targets..]                     # 빌드 후 배포 (npm/sftp)
pnpm pub --no-build                      # 빌드 생략하고 배포만
pnpm pub --dry-run                       # 실제 배포 없이 시뮬레이션
pnpm pub:no-build                        # --no-build 단축 명령
```

### 코드 품질 검사

```bash
# 타입 체크
pnpm typecheck [targets..]               # TypeScript 타입 체크
pnpm typecheck packages/core-common      # 특정 패키지만

# 린트
pnpm lint [targets..]                    # ESLint + Stylelint 실행
pnpm lint:fix [targets..]               # 린트 자동 수정 (--fix)
pnpm lint --timing                       # 규칙별 실행 시간 출력

# 통합 검사 (typecheck + lint + test 병렬 실행)
pnpm check [targets..]                   # 전체 검사
pnpm check packages/core-common          # 특정 패키지만
pnpm check --type typecheck,lint         # 검사 종류 선택 (typecheck,lint,test 중 콤마 구분)

# 테스트
pnpm vitest [targets..]                  # vitest 워치 모드
pnpm vitest run [targets..]              # 테스트 1회 실행
pnpm vitest run packages/core-common     # 특정 패키지만 테스트
```

### 기타

```bash
pnpm sd-cli device -p <패키지명>          # Android 디바이스에서 앱 실행
pnpm sd-cli device -p my-app -u <URL>    # 개발 서버 URL 직접 지정
pnpm sd-cli replace-deps                 # sd.config.ts의 replaceDeps 설정에 따라 node_modules를 로컬 소스로 심볼릭 링크
pnpm sd-cli init                         # 새 프로젝트 초기화
```

## 패키지 target 종류 (sd.config.ts)

| target | 설명 |
|--------|------|
| node | Node.js 전용 라이브러리 |
| browser | 브라우저 전용 라이브러리 |
| neutral | Node/브라우저 공용 라이브러리 |
| client | 클라이언트 앱 (dev/build 시 Vite 사용) |
| server | 서버 앱 (PM2 배포) |

## 아키텍처

의존 방향: 위 → 아래. `core-common`은 내부 의존 없는 leaf 패키지.

```
Apps:       solid-demo (client) / solid-demo-server (server)
UI:         solid (SolidJS + Tailwind)
Capacitor:  capacitor-plugin-auto-update / broadcast / file-system / usb-storage
Service:    service-server (Fastify) / service-client / service-common
ORM:        orm-node (MySQL/PostgreSQL/MSSQL) / orm-common
Core:       core-common (neutral) / core-browser / core-node
Tools:      sd-cli, lint, excel, storage, sd-claude, mcp-playwright
```

## 통합 테스트

`tests/` 폴더에 위치. `pnpm vitest run tests/orm` 등으로 실행.

- `tests/orm` — DB 커넥션, DbContext, 이스케이프 테스트 (MySQL, PostgreSQL, MSSQL). Docker 필요.
- `tests/service` — 서비스 클라이언트-서버 통신 테스트.

## Import 경로 별칭

tsconfig paths로 `@simplysm/패키지명`이 `packages/패키지명/src/index.ts`에 매핑된다.
