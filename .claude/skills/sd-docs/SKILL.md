---
name: sd-docs
description: `@simplysm/*` 라이브러리 패키지의 API 문서를 `.claude/references/sd-simplysm14/apis/<패키지명>/` 위치에 사용 트리거 기준으로 작성·갱신. Use when 라이브러리 API 문서를 새로 작성하거나 코드 변경을 반영해 갱신할 때.
model: haiku
---

# sd-docs

`@simplysm/*` 라이브러리 패키지의 API 문서를 코드를 근거로 작성·갱신. 메인 에이전트가 패키지 목록 추출과 상위 README 인덱스 갱신을 담당하고, 패키지별 문서 작성은 패키지 1개당 subagent 1개를 호출해 병렬 위임.

## 산출물 위치

- `.claude/references/sd-simplysm14/apis/<패키지명>/README.md` — 패키지당 1개, 필수.
- `.claude/references/sd-simplysm14/apis/<패키지명>/<군명>.md` — 사용 트리거 군이 커서 README 한 장에 풀어쓰면 같은 README 의 다른 군 정보까지 함께 읽혀 부담이 커지는 경우에만 분할 산출.
- `.claude/references/sd-simplysm14/README.md` 의 "패키지 인덱스" 섹션 — 메인 에이전트가 갱신.

## 워크플로

### 1. 패키지 목록 추출

워크스페이스 루트의 `packages/*/package.json` 을 모두 읽어 다음 두 리스트를 만듦.

- **public 리스트**: `private: true` 가 아닌 패키지. 각 항목 = `{ name, dir }`.
- **private 리스트**: `private: true` 인 패키지. 인덱스에서 제외하기 위해 보관.

### 2. 패키지별 subagent 병렬 호출

`public 리스트` 의 패키지 수만큼 `general-purpose` subagent 호출을 **단일 메시지 안에서 병렬**로 보냄. 각 호출 프롬프트는 [references/subagent-prompt.md](references/subagent-prompt.md) 양식의 "프롬프트" 마커 아래 본문을 그대로 사용하고, `<PACKAGE_NAME>` 과 `<PACKAGE_DIR>` 만 치환.

각 subagent 의 산출 (풀 재작성 모드 — 기존 파일 참고 없이 처음부터 작성):

- `apis/<패키지명>/README.md` 재작성.
- 필요 시 `apis/<패키지명>/<군명>.md` 재작성. 코드에서 사라진 군의 파일은 삭제.
- 결과 보고 1단락 (산출 파일 목록, 분할 발생 여부, 한 줄 트리거 요약).

**범위 한정**: subagent 는 `apis/<패키지명>/` 위치만 다룸. 상위 `.claude/references/sd-simplysm14/README.md` 는 건드리지 않음 (다음 단계의 "패키지 인덱스 섹션 갱신" 에서 메인 에이전트가 처리).

### 3. 상위 README 의 "패키지 인덱스" 섹션 갱신 (파일 보존 + 섹션 내 항목만 갱신)

`.claude/references/sd-simplysm14/README.md` 는 **풀 재작성 대상 아님**. 파일 본문·다른 섹션은 그대로 보존, "패키지 인덱스" 섹션의 항목 리스트만 재구성함.

모든 subagent 완료 후:

- **갱신 대상**: "패키지 인덱스" 섹션 본문(항목 리스트)만.
- **건드리지 않음**: 섹션 머리(`## 패키지 인덱스`), 다른 모든 섹션, 파일 상단/하단 텍스트.
- **항목 형식**: `- **<패키지명>** — <한 줄 트리거 요약>. 자세히: [apis/<패키지명>/README.md](./apis/<패키지명>/README.md)`.
- **순서**: 패키지명 알파벳순.
- **포함**: `public 리스트` 만.
- **제외**: `private 리스트` 의 패키지, 코드베이스에 더 이상 존재하지 않는 패키지.

### 4. 사용자 보고

다음 항목을 짧게 정리해 출력함.

- 재작성된 패키지 목록 (= `public 리스트` 전체. 풀 재작성 모드 — 매번 모든 패키지 산출).
- 분할 발생(`<군명>.md` 가 생긴) 패키지 목록.
- 삭제된 분할 파일 (코드에서 사라진 군, 있다면).
- 인덱스에서 제거된 항목 (있다면).
