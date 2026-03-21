# Eval: sd-readme

## 행동 Eval

### 시나리오 1: 중규모 패키지 (core-node, src 7파일)
- 사전 조건: main 브랜치의 `packages/core-node/` 디렉토리를 테스트 작업 경로에 복사한다 (node_modules/, dist/, .으로 시작하는 폴더는 제외)
- 입력: "/sd-readme core-node"
- 체크리스트:
  - [ ] packages/core-node/README.md 파일이 생성됨
  - [ ] packages/core-node/docs/ 폴더가 생성됨
  - [ ] README.md에 패키지 개요와 설치 방법이 포함됨
  - [ ] README.md에 docs/ 내 각 파일에 대한 목차(파일명 + 설명)가 포함됨
  - [ ] docs/ 파일들이 index.ts의 주석 카테고리(Utils, Features, Worker) 기반으로 분할됨
  - [ ] 각 docs/*.md에 해당 카테고리의 API 시그니처가 포함됨
  - [ ] src/index.ts에 없는 internal 모듈은 문서화되지 않음
  - [ ] 모든 문서가 영어로 작성됨
  - [ ] packages/core-node/package.json의 `files` 배열에 `"docs"`가 포함됨
  - [ ] index.ts에서 export된 모든 public symbol이 README.md 또는 docs/*.md에 나열됨 (누락 없음)
  - [ ] docs/*.md에서 interface/type이 문서화될 때, 각 필드가 개별적으로 설명됨 (시그니처만 나열하지 않음)

### 시나리오 2: root README 생성 (인자 없이 실행)
- 사전 조건:
  - packages/pkg-a/package.json: `{ "name": "@simplysm/pkg-a", "description": "Common utilities", "main": "./dist/index.js" }`
  - packages/pkg-a/src/index.ts: `export function hello(): string { return "hi"; }`
  - packages/pkg-b/package.json: `{ "name": "@simplysm/pkg-b", "private": true, "main": "./dist/index.js" }`
  - packages/pkg-b/src/index.ts: `export function internal(): void {}`
- 입력: "/sd-readme"
- 체크리스트:
  - [ ] 루트에 README.md 파일이 생성됨
  - [ ] README.md에 @simplysm/pkg-a가 포함됨
  - [ ] README.md에 @simplysm/pkg-b가 포함되지 않음 (private이므로)
  - [ ] README.md에 각 패키지의 description이 포함됨
  - [ ] packages/pkg-a/README.md도 함께 생성됨

### 시나리오 3: 소규모 패키지 — interface 필드별 문서화 & union type 분기 설명
- 사전 조건:
  - packages/pkg-config/package.json: `{ "name": "@simplysm/pkg-config", "main": "./dist/index.js" }`
  - packages/pkg-config/src/index.ts:
    ```typescript
    export type { ServerConfig, ClientConfig, AppConfig } from "./types";
    export { createConfig } from "./factory";
    ```
  - packages/pkg-config/src/types.ts:
    ```typescript
    export interface ServerConfig {
      host: string;
      port: number;
      ssl?: boolean;
      timeout?: number;
    }

    export interface ClientConfig {
      baseUrl: string;
      retryCount?: number;
    }

    export type AppConfig =
      | ({ type: "server" } & ServerConfig)
      | ({ type: "client" } & ClientConfig);
    ```
  - packages/pkg-config/src/factory.ts:
    ```typescript
    import type { AppConfig } from "./types";
    export function createConfig(config: AppConfig): void {}
    ```
- 입력: "/sd-readme pkg-config"
- 체크리스트:
  - [ ] packages/pkg-config/README.md 파일이 생성됨
  - [ ] docs/ 폴더가 생성되지 않음 (소규모이므로 README.md 하나로 완결)
  - [ ] README.md에 패키지 이름과 설치 방법이 포함됨
  - [ ] ServerConfig의 각 필드(host, port, ssl, timeout)가 개별적으로 문서에 설명됨
  - [ ] ClientConfig의 각 필드(baseUrl, retryCount)가 개별적으로 문서에 설명됨
  - [ ] AppConfig가 union type임이 문서에 명시됨
  - [ ] AppConfig의 각 variant(`"server"`, `"client"`)가 문서에 나열됨
  - [ ] createConfig 함수가 문서에 포함됨
  - [ ] 총 4개 export(ServerConfig, ClientConfig, AppConfig, createConfig) 모두 문서에 포함됨 (누락 없음)
  - [ ] README.md가 영어로 작성됨

## 안티패턴 Eval

- [ ] internal(export되지 않은) 모듈을 문서화하지 않는다 (단, export된 컴포넌트/클래스의 props/context 타입은 해당 API의 일부로 허용)
- [ ] src/ 전체를 무차별 스캔하지 않는다 (반드시 exports 기반 추적)
- [ ] 소규모 패키지에 불필요한 docs/ 분할을 하지 않는다
- [ ] 존재하지 않는 API를 hallucination으로 생성하지 않는다
- [ ] 개별 패키지 지정 시 root README.md를 생성하지 않는다
- [ ] interface/type의 필드를 생략하고 시그니처만 나열하지 않는다
- [ ] export된 public symbol을 문서에서 누락하지 않는다
