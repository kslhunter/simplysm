---
name: sd-skill
description: 스킬을 작성하거나 기존 스킬을 수정하는 스킬. Use when 새로운 스킬을 작성 혹은 수정 할 때
---

# 스킬 작성

## 워크플로

1. 의도 정의 - 다음을 파악한다.
   - 이 스킬이 다루는 작업/도메인은 무엇인가?
   - 구체적으로 어떤 유즈케이스를 커버해야 하는가?
   - 실행 가능 스크립트가 필요한가? 지침만으로 충분한가?
   - 함께 포함해야 할 참고 자료가 있는가?

2. Eval 시나리오 정의 (Golden Dataset) - 다음을 작성하라:
   - 채점 기준이 될 케이스들: `evals/golden.jsonl`
   - 케이스 시작 시점의 워크스페이스 초기 상태: `evals/fixtures/<name>/`
   - 상세: [references/eval-authoring.md](references/eval-authoring.md)

3. 스킬 작성 - 다음을 작성하라:
   - 간결하고 명확한 지침이 담긴 SKILL.md
   - 별도의 참고파일 (내용이 100줄을 넘을 경우)
   - 유틸리티 스크립트 (필요한 경우)
   - 상세: [references/skill-authoring.md](references/skill-authoring.md)

4. Eval 실행 및 판정
   - 실행: `python .claude/skills/sd-skill/scripts/run_eval.py <대상-스킬-이름>`
   - 상세 (동작/EVAL_MODE_PREFIX/출력 구조): [references/eval-run.md](references/eval-run.md)
   - 사용자에게 보고: 전체 PASS/FAIL 카운트와 FAIL 케이스 목록.

5. 스킬 및 Eval 개선
   - FAIL 케이스의 reason 을 분석해 스킬 혹은 Eval 을 수정한 뒤, 같은 골든 셋 전체를 다시 4단계로 돌린다.
   - 스킬의 문제인지 Eval 의 문제인지 모호하면 사용자에게 물어본다.
   - 새로 발견한 실패 패턴은 골든 셋에 케이스로 추가한다.

6. 산출물 가독성 점검 (eval PASS 후)
   - SKILL.md / references / scripts 를 다시 통독: "Claude 에이전트가 잘 이해하고 따를 수 있게 간결·명확한가? 중복·꾸밈·과한 예시는 없는가?"
   - **표현·구조 정리만 허용, 의미 변경 금지.** 의미가 바뀌면 4단계로 회귀해 재검증.

## 스킬 구조

```
.claude/
├── simplysm.json                # tmpdir 오버라이드 (선택)
└── skills/
    └── <skill-name>/
        ├── SKILL.md             # 스킬 본문 (필수)
        ├── evals/               # Eval 정의 (필수)
        │   ├── golden.jsonl     # 케이스 목록
        │   └── fixtures/        # 케이스별 초기 워크스페이스
        │       └── <name>/
        ├── references/          # 상세 문서 (선택)
        │   └── *.md
        └── scripts/             # 유틸리티 (선택)
            └── *.py
```
