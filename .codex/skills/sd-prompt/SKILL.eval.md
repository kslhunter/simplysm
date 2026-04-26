# Eval: sd-prompt

## 행동 Eval

### 시나리오 1: 스킬 Eval 신규 작성

- 사전 조건:
  - `.codex/skills/demo-review/SKILL.md` 파일을 아래 내용으로 생성한다.

```markdown
---
name: demo-review
description: 문서의 누락된 필수 섹션을 검토하는 스킬. "문서 리뷰", "섹션 검토", "리뷰 실행" 등을 요청할 때 사용한다.
---

# demo-review: 문서 섹션 검토

입력으로 받은 Markdown 파일에서 `# 개요`, `## 사용법`, `## 제한사항` 섹션 존재 여부를 확인한다.
누락된 섹션이 있으면 파일을 수정하지 않고 텍스트 출력으로 누락 목록을 보고한다.
```

- 입력: "$sd-prompt .codex/skills/demo-review/SKILL.md Eval 작성" (스킬)
- 체크리스트:
  - [ ] `.codex/skills/demo-review/SKILL.eval.md` 파일이 존재한다.
  - [ ] `.codex/skills/demo-review/SKILL.eval.md` 파일의 첫 번째 헤딩이 `# Eval: demo-review`이다.
  - [ ] `.codex/skills/demo-review/SKILL.eval.md` 파일에 `## 행동 Eval` 섹션이 포함되어 있다.
  - [ ] `.codex/skills/demo-review/SKILL.eval.md` 파일에 `## 안티패턴 Eval` 섹션이 포함되어 있다.
  - [ ] `.codex/skills/demo-review/SKILL.eval.md` 파일의 행동 Eval 입력 중 하나 이상이 `"$demo-review`로 시작한다.
  - [ ] `.codex/skills/demo-review/SKILL.eval.md` 파일의 체크리스트에 `읽었는지`, `도구 호출`, `내부 추론` 문구가 포함되어 있지 않다.
  - [ ] `run-output.md`에 `.codex/skills/demo-review/SKILL.eval.md` 경로가 포함되어 있다.

### 시나리오 2: 룰 Eval 신규 작성

- 사전 조건:
  - `.codex/rules/demo-release-note.md` 파일을 아래 내용으로 생성한다.

```markdown
# demo-release-note

릴리스 노트를 요청받으면 `## Added`, `## Changed`, `## Fixed` 섹션을 포함하여 작성한다.
각 섹션은 항목이 없더라도 `- 없음`을 포함한다.
사용자가 한국어로 요청하면 한국어로 작성한다.
```

- 입력: "$sd-prompt .codex/rules/demo-release-note.md Eval 작성" (스킬)
- 체크리스트:
  - [ ] `.codex/rules/demo-release-note.eval.md` 파일이 존재한다.
  - [ ] `.codex/rules/demo-release-note.eval.md` 파일의 첫 번째 헤딩이 `# Eval: demo-release-note`이다.
  - [ ] `.codex/rules/demo-release-note.eval.md` 파일에 `## 행동 Eval` 섹션이 포함되어 있다.
  - [ ] `.codex/rules/demo-release-note.eval.md` 파일에 `## 안티패턴 Eval` 섹션이 포함되어 있다.
  - [ ] `.codex/rules/demo-release-note.eval.md` 파일의 행동 Eval 입력 줄 중 하나 이상이 `$sd-prompt`로 시작하지 않는 자연어 발화이다.
  - [ ] `.codex/rules/demo-release-note.eval.md` 파일의 체크리스트에 workspace 파일 또는 `run-output.md` 텍스트 출력만으로 판정할 수 없는 도구 호출 순서 조건이 포함되어 있지 않다.
  - [ ] `run-output.md`에 `.codex/rules/demo-release-note.eval.md` 경로가 포함되어 있다.

### 시나리오 3: 스킬 프롬프트 개선 원칙 적용

- 사전 조건:
  - `.codex/skills/demo-cleanup/SKILL.md` 파일을 아래 내용으로 생성한다.

```markdown
---
name: demo-cleanup
description: 임시 파일을 정리하는 스킬. "정리", "cleanup", "파일 정리" 등을 요청할 때 사용한다.
---

# demo-cleanup: 임시 파일 정리

파일을 적절하게 정리한다.
Buffer 사용 금지.
필요시 사용자에게 물어본다.
```

- 입력: "$sd-prompt .codex/skills/demo-cleanup/SKILL.md 개선" (스킬)
- 체크리스트:
  - [ ] `.codex/skills/demo-cleanup/SKILL.md` 파일에 `name: demo-cleanup`이 유지되어 있다.
  - [ ] `.codex/skills/demo-cleanup/SKILL.md` 파일에 `Buffer 사용 금지`만 단독으로 남아 있지 않고, 같은 파일 안에 `Uint8Array` 대안이 포함되어 있다.
  - [ ] `.codex/skills/demo-cleanup/SKILL.md` 파일에 `적절하게` 문구가 포함되어 있지 않다.
  - [ ] `.codex/skills/demo-cleanup/SKILL.md` 파일에 `필요시` 문구가 포함되어 있지 않다.
  - [ ] `.codex/skills/demo-cleanup/SKILL.eval.md` 파일이 존재한다.
  - [ ] `run-output.md`에 `.codex/skills/demo-cleanup/SKILL.md` 경로가 포함되어 있다.

## 안티패턴 Eval

- [ ] `run-output.md`가 작업한 파일 경로 없이 완료되었다고만 보고하지 않는다.
- [ ] 생성된 Eval 파일의 스킬 시나리오 입력이 `$skill-name` 형식이 아닌 `${skill-name}` 템플릿 문자열로 남아 있지 않다.
- [ ] 생성된 Eval 파일의 체크리스트가 `도구를 호출한다`, `파일을 읽는다`, `내부적으로 판단한다`처럼 Judge가 볼 수 없는 행동만으로 PASS/FAIL을 요구하지 않는다.
