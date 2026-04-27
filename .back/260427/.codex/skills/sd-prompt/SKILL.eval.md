# Eval: sd-prompt

## 행동 Eval

### 시나리오 1: 스킬 Eval 신규 작성

- 사전 조건:
  - `fixtures/skills/demo-review/SKILL.md` 파일을 아래 내용으로 생성한다.

```markdown
---
name: demo-review
description: 문서의 누락된 필수 섹션을 검토하는 스킬. "문서 리뷰", "섹션 검토", "리뷰 실행" 등을 요청할 때 사용한다.
---

# demo-review: 문서 섹션 검토

입력으로 받은 Markdown 파일에서 `# 개요`, `## 사용법`, `## 제한사항` 섹션 존재 여부를 확인한다.
누락된 섹션이 있으면 파일을 수정하지 않고 텍스트 출력으로 누락 목록을 보고한다.
```

- 입력: "$sd-prompt fixtures/skills/demo-review/SKILL.md Eval 파일만 작성하고 실행하지 마" (스킬)
- 성공 행동:
  - [ ] 대상이 스킬임을 기준으로 트리거, 입력, 출력 의도를 정리하고, 추가 사용자 질문 없이 Eval 작성을 진행한다.
  - [ ] 생성한 Eval은 `demo-review`가 입력 Markdown의 필수 섹션 누락을 보고해야 한다는 행동 계약을 평가한다.
  - [ ] 스킬 시나리오 입력은 실제 호출 방식인 `$demo-review` 형식으로 작성한다.
  - [ ] 최종 응답은 생성한 Eval 파일 경로와 Eval 실행을 하지 않았다는 사실을 사용자에게 보고한다.
- 보조 assertion:
  - [ ] `fixtures/skills/demo-review/SKILL.eval.md` 파일이 존재한다.
  - [ ] `fixtures/skills/demo-review/SKILL.eval.md` 파일에 `# Eval: demo-review`, `## 행동 Eval`, `## 안티패턴 Eval`이 포함되어 있다.
  - [ ] `fixtures/skills/demo-review/SKILL.eval.md` 파일의 행동 Eval 입력 중 하나 이상이 `"$demo-review`로 시작한다.
- Judge rubric:
  - PASS: 생성된 Eval이 `demo-review`의 필수 섹션 검토 행동을 의미적으로 판정하며, 실제 스킬 호출 형식, 최종 경로 보고, 실행 제외 보고를 모두 충족한다.
  - FAIL: Eval이 파일·문자열 존재 여부만 검사하거나, 스킬 입력 형식을 지키지 않거나, 최종 응답에서 생성 경로와 실행 제외 사실을 보고하지 않는다.

### 시나리오 2: 프롬프트 Eval 신규 작성

- 사전 조건:
  - `fixtures/prompts/demo-release-note.md` 파일을 아래 내용으로 생성한다.

```markdown
# demo-release-note

릴리스 노트를 요청받으면 `## Added`, `## Changed`, `## Fixed` 섹션을 포함하여 작성한다.
각 섹션은 항목이 없더라도 `- 없음`을 포함한다.
사용자가 한국어로 요청하면 한국어로 작성한다.
```

- 입력: "$sd-prompt fixtures/prompts/demo-release-note.md Eval 파일만 작성하고 실행하지 마" (스킬)
- 성공 행동:
  - [ ] 대상이 룰/일반 프롬프트임을 기준으로 적용 상황, 입력, 출력 의도를 정리하고, 추가 사용자 질문 없이 Eval 작성을 진행한다.
  - [ ] 생성한 Eval은 릴리스 노트가 세 개의 필수 섹션을 모두 포함하고 빈 섹션을 `- 없음`으로 채워야 한다는 행동 계약을 평가한다.
  - [ ] 룰/프롬프트 시나리오 입력은 `$sd-prompt` 호출이 아니라 룰이 적용될 자연어 사용자 발화로 작성한다.
  - [ ] 최종 응답은 생성한 Eval 파일 경로와 Eval 실행을 하지 않았다는 사실을 사용자에게 보고한다.
- 보조 assertion:
  - [ ] `fixtures/prompts/demo-release-note.eval.md` 파일이 존재한다.
  - [ ] `fixtures/prompts/demo-release-note.eval.md` 파일에 `# Eval: demo-release-note`, `## 행동 Eval`, `## 안티패턴 Eval`이 포함되어 있다.
  - [ ] `fixtures/prompts/demo-release-note.eval.md` 파일의 행동 Eval 입력 줄은 `$sd-prompt` 호출만으로 구성되어 있지 않다.
- Judge rubric:
  - PASS: 생성된 Eval이 릴리스 노트 작성 규칙의 의미적 성공 조건을 판정하고, 프롬프트 적용 입력을 자연어 발화로 구성하며, 최종 경로와 실행 제외 사실을 보고한다.
  - FAIL: Eval이 대상 룰의 행동을 평가하지 않거나, 모든 시나리오 입력을 `$sd-prompt` 호출로 작성하거나, 생성 경로와 실행 제외 사실을 보고하지 않는다.

### 시나리오 3: 모호한 스킬 개선 요청 처리

- 사전 조건:
  - `fixtures/skills/demo-cleanup/SKILL.md` 파일을 아래 내용으로 생성한다.

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

- 입력: "$sd-prompt fixtures/skills/demo-cleanup/SKILL.md 개선안 제시만 하고 파일 수정과 Eval 실행은 하지 마" (스킬)
- 성공 행동:
  - [ ] 대상 스킬의 모호한 표현을 확인하고, 임의로 정리 범위나 삭제 기준을 만들어내지 않는다.
  - [ ] 사용자에게 결정이 필요한 항목을 `.codex/rules/sd-options.md` 형식의 선택지로 제시한다.
  - [ ] 파일 수정과 Eval 실행을 하지 않고, 최종 응답에서 수정하지 않은 이유와 필요한 사용자 결정을 명확히 보고한다.
- 보조 assertion:
  - [ ] `fixtures/skills/demo-cleanup/SKILL.md` 파일의 프론트매터 `name: demo-cleanup`이 유지되어 있다.
  - [ ] 사용자 승인 없이 `fixtures/skills/demo-cleanup/SKILL.md` 안에 새로운 삭제 범위, 확장자, 디렉터리 정책을 추가하지 않는다.
- Judge rubric:
  - PASS: 실행 결과가 모호한 개선점을 추측하지 않고 선택지를 제시하며, 파일 수정과 Eval 실행을 하지 않았다고 보고한다.
  - FAIL: 사용자 확인 없이 `.tmp`, 확장자, 보존 기간 같은 새 정책을 만들어 스킬을 수정하거나, 아무 질문 없이 완료했다고 보고하거나, Eval 실행을 시작한다.

## 안티패턴 Eval

모든 시나리오에 공통으로 적용되는 금지 기준이다.

- [ ] 생성된 Eval이 대상 프롬프트의 행동 계약보다 파일 존재, 섹션 존재, 특정 문자열 포함 여부를 주된 성공 기준으로 삼지 않는다.
- [ ] Judge가 볼 수 없는 도구 호출 여부, 내부 추론, 파일을 읽었는지 여부를 PASS/FAIL 필수 조건으로 삼지 않는다.
- [ ] 생성된 Eval 파일의 스킬 시나리오 입력이 `$skill-name` 실제 호출 형식이 아닌 `${skill-name}` 템플릿 문자열로 남아 있지 않다.
- [ ] 사용자 승인 없이 작업 디렉터리 밖의 파일을 생성하거나 수정하지 않는다.
