# Feature 1.1 legacy HTTP 서버 MIME 타입 라이브러리 전환

## 참조 자료

- [debug.md](./debug.md)
- 대상 파일: `packages/sd-cli/src/workers/client.worker.ts` (MIME_TYPES 맵 lines 85-104, 사용 line 167)
- 라이브러리: `mime` v4.x (ESM, 타입 내장, `packages/excel`에서 이미 사용 중)
- API: `mime.getType(filePath)` → `string | null` (null이면 fallback 필요)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | MIME 라이브러리 | `mime` v4.x | ESM 호환, 타입 내장, 모노레포 내 기존 사용, zero-dep |
| D2 | fallback 타입 | `application/octet-stream` 유지 | 기존 동작과 동일 |

## 요구명세

```gherkin
Feature: 1.1 legacy HTTP 서버 MIME 타입 라이브러리 전환

  Background:
    Given legacy dev 모드(legacyModule: true)로 HTTP 서버가 실행 중이다

  Rule: 수동 MIME_TYPES 맵을 mime 라이브러리로 대체한다

    Scenario: .wasm 파일이 올바른 MIME 타입으로 서빙된다
      When 클라이언트가 .wasm 파일을 요청한다
      Then Content-Type 헤더는 "application/wasm"이다

    Scenario: 기존 지원 확장자(.js, .css, .html 등)가 올바르게 서빙된다
      When 클라이언트가 .js 파일을 요청한다
      Then Content-Type 헤더는 JavaScript MIME 타입이다

    Scenario: 알 수 없는 확장자는 octet-stream으로 fallback한다
      When 클라이언트가 알 수 없는 확장자의 파일을 요청한다
      Then Content-Type 헤더는 "application/octet-stream"이다
```

## 구현계획

### 배경

legacy dev 모드의 HTTP 서버(`createLegacyHttpServer`)가 수동 `MIME_TYPES` 맵으로 Content-Type을 결정한다. `.wasm` 등 누락된 확장자는 `application/octet-stream`으로 서빙되어 WebAssembly streaming compile이 실패한다.

### 목표

- 수동 `MIME_TYPES` 맵을 `mime` 라이브러리로 대체하여 모든 확장자를 자동 커버

### 비목표

- service-server의 정적 파일 핸들러 변경 (Fastify `reply.sendFile()`이 자체 MIME 처리)
- `mime` 라이브러리의 커스텀 타입 등록

### 설계

1. `packages/sd-cli/package.json`에 `"mime": "^4.1.0"` 의존성 추가
2. `client.worker.ts`에서 `import mime from "mime"` 추가
3. `MIME_TYPES` 상수 제거
4. line 167의 `MIME_TYPES[ext] ?? "application/octet-stream"`을 `mime.getType(ext) ?? "application/octet-stream"`으로 변경

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| `mime` 라이브러리 | 채택 | ESM, 타입 내장, 모노레포 내 기존 사용 |
| `mime-types` 라이브러리 | 미채택 | CJS, 타입 미내장, 추가 의존성(mime-db) |
| `MIME_TYPES`에 `.wasm`만 추가 | 미채택 | 향후 다른 확장자 누락 시 같은 문제 반복 |

### Vertical Slices

- [x] Slice 1: mime 라이브러리 전환
  - **구현 내용:** `mime` 의존성 추가, `MIME_TYPES` 상수를 `mime.getType()` 호출로 교체, 테스트 추가
  - **호출 그래프:**
    ```mermaid
    flowchart TD
      A[createLegacyHttpServer] --> B["mime.getType(ext)"]
      B --> C["?? 'application/octet-stream'"]
    ```
  - **Scenarios:**
    - Scenario: .wasm 파일이 올바른 MIME 타입으로 서빙된다
    - Scenario: 기존 지원 확장자가 올바르게 서빙된다
    - Scenario: 알 수 없는 확장자는 octet-stream으로 fallback한다
