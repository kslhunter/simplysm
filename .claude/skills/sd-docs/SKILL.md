---
name: sd-docs
description: `@simplysm/*` 라이브러리 패키지의 API 문서를 `.claude/references/sd-simplysm14/apis/<패키지명>/` 위치에 사용 트리거 기준으로 작성·갱신. Use when 라이브러리 API 문서를 새로 작성하거나 코드 변경을 반영해 갱신할 때.
model: haiku
---

# sd-docs

`@simplysm/*` 라이브러리 패키지의 API 문서를 코드만을 진실 근거로 풀 재작성하고, 상위 README 의 패키지 인덱스를 최신 상태로 맞춤.

## 산출물 위치

- `.claude/references/sd-simplysm14/apis/<패키지명>/README.md` — 패키지당 1개, 필수.
- `.claude/references/sd-simplysm14/apis/<패키지명>/<군명>.md` — 사용 트리거 군이 커서 README 한 장에 풀어쓰면 같은 README 의 다른 군 정보까지 함께 읽혀 부담이 커지는 경우에만 분할 산출.
- `.claude/references/sd-simplysm14/README.md` 의 "패키지 인덱스" 섹션.

여기서 `<패키지명>` = `@simplysm/` 접두사 제외한 짧은 이름.

## 대상

- **public**: `packages/*/package.json` 중 `private: true` 가 아닌 패키지. 문서·인덱스 대상.
- **private**: `private: true` 인 패키지. 인덱스에서 제외.

## 오케스트레이션

Workflow 도구로 처리. 실행 형태(parallel/pipeline/schema/동시성)는 스크립트 작성 시 최적으로 선택하되, 다음 정합성 제약만 충족:

- 팬아웃 단위 = public 패키지 1개. 각 agent 는 [references/doc-rules.md](references/doc-rules.md) 의 작성 규칙을 따라 해당 `apis/<패키지명>/` 자리만 산출하고, doc-rules.md "8. 구조화 결과 반환" 형태로 결과를 돌려줌.
- 상위 README "패키지 인덱스" 섹션 갱신은 전 패키지 결과가 모두 모인 뒤 1회 처리 (전체 알파벳 리스트라 취합 필요). 개별 agent 는 상위 README 를 건드리지 않음.

## 패키지 인덱스 갱신 규칙

`.claude/references/sd-simplysm14/README.md` 는 **풀 재작성 대상 아님**. "패키지 인덱스" 섹션의 항목 리스트만 재구성.

- **갱신 대상**: "패키지 인덱스" 섹션 본문(항목 리스트)만.
- **건드리지 않음**: 섹션 머리(`## 패키지 인덱스`), 다른 모든 섹션, 파일 상단/하단 텍스트.
- **항목 형식**: `- **<패키지명>** — <triggerSummary>. 자세히: [apis/<패키지명>/README.md](./apis/<패키지명>/README.md)`.
- **순서**: 패키지명 알파벳순.
- **포함**: public 만. **제외**: private, 코드베이스에 더 이상 존재하지 않는 패키지.

## 사용자 보고

- 재작성된 패키지 목록 (= public 전체. 풀 재작성 모드 — 매번 모든 패키지 산출).
- 분할(`<군명>.md`) 발생 패키지 목록.
- 삭제된 분할 파일 (코드에서 사라진 군, 있다면).
- 인덱스에서 제거된 항목 (있다면).
