---
name: sd-docs
description: `@simplysm/*` 라이브러리 패키지의 API 문서를 `.claude/references/sd-simplysm14/apis/<패키지명>/` 자리에 사용 트리거 기준으로 산출·갱신한다. Use when 라이브러리 API 문서를 새로 작성하거나 코드 변경을 반영해 갱신할 때.
effort: "low"
---

# sd-docs

`@simplysm/*` 라이브러리 패키지의 API 문서를 코드 진실에 맞춰 산출·갱신한다. 메인 에이전트가 패키지 목록 추출과 상위 README 인덱스 갱신을 담당하고, 패키지별 산출은 subagent 1개씩 병렬 위임한다.

## 산출 자리

- `.claude/references/sd-simplysm14/apis/<패키지명>/README.md` — 패키지당 1개, 필수.
- `.claude/references/sd-simplysm14/apis/<패키지명>/<군명>.md` — 사용 트리거 군이 본질적으로 커서 README 한 장에 풀어쓰면 다른 컨텍스트 정보까지 끌려나오는 경우에만 분할 산출.
- `.claude/references/sd-simplysm14/README.md` 의 "패키지 인덱스" 섹션 — 메인이 자동 갱신.

## 워크플로

### 1. 패키지 목록 추출

워크스페이스 루트의 `packages/*/package.json` 을 모두 읽어 다음 두 리스트를 만든다.

- **public 리스트**: `private: true` 가 아닌 패키지. 각 항목 = `{ name, dir }`.
- **private 리스트**: `private: true` 인 패키지. 인덱스에서 제외하기 위해 보관.

### 2. 패키지별 subagent 병렬 호출

`public 리스트` 의 패키지 수만큼 `general-purpose` subagent 호출을 **단일 메시지 안에서 병렬**로 보낸다. 각 호출 프롬프트는 [references/subagent-prompt.md](references/subagent-prompt.md) 의 양식을 그대로 사용하고, `<PACKAGE_NAME>` 과 `<PACKAGE_DIR>` 만 치환한다.

각 subagent 의 산출:

- `apis/<패키지명>/README.md` 신규 작성 또는 코드 변경 반영 갱신.
- 필요 시 `apis/<패키지명>/<군명>.md` 추가/갱신.
- 결과 보고 1단락 (산출/갱신 파일 목록, 분할 발생 여부, 한 줄 트리거 요약).

### 3. 상위 README 의 "패키지 인덱스" 섹션 갱신

모든 subagent 완료 후 `.claude/references/sd-simplysm14/README.md` 의 "패키지 인덱스" 섹션을 통째로 재구성한다.

- **항목 형식**: `- **<패키지명>** — <한 줄 트리거 요약>. 자세히: [apis/<패키지명>/README.md](./apis/<패키지명>/README.md)`
- **순서**: 패키지명 알파벳순.
- **포함**: `public 리스트` 만.
- **제외**: `private 리스트` 의 패키지, 코드베이스에 더 이상 존재하지 않는 패키지.
- 섹션 머리(`## 패키지 인덱스`)와 다른 섹션은 건드리지 않는다.

### 4. 사용자 보고

다음 항목을 짧게 정리해 출력한다.

- 신규 작성된 패키지 목록.
- 갱신된 패키지 목록.
- 분할 발생(추가 `.md` 가 생긴) 패키지 목록.
- 인덱스에서 제거된 항목 (있다면).
