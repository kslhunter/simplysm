# Eval 실행

## 입력

`python .claude/skills/sd-skill/scripts/run_eval.py <대상-스킬-이름>`

대상 스킬에 `evals/golden.jsonl` + `evals/fixtures/<fixture-name>/` 가 있어야 한다.

## 동작

각 케이스마다:

1. 격리된 작업 공간 준비 (`.claude/` 복사 + fixture 오버레이)
2. 대상 스킬 실행. 사용자 응답을 받을 수 없는 환경이라, 대상 스킬은 사용자 입력이 필요한 시점에 스스로 답변하면서 끝까지 진행 (다이얼로그 기반 스킬도 평가 가능, 단 자체 답변이라 흐름·형식 검증용)
3. 에이전트 동작 기록과 종료 시점 파일 트리 수집
4. 별도 평가 에이전트가 rubric 항목별 PASS/FAIL 채점 → 모두 PASS 시 케이스 PASS

## 출력

stdout: summary JSON
- `run_id`, `results_dir`
- `summary`: total / pass / fail / error
- `cases[]`: 케이스별 verdict + 결과 dir 경로

각 케이스 결과 파일 (`results_dir/cases/<id>/`):
- `judge_output.json` — rubric 항목별 PASS/FAIL + reason
- `events.json` — 에이전트 이벤트 시퀀스
- `tree.json` — 샌드박스 종료 시 파일 트리

## FAIL 분석

위 결과 파일 읽어 reason 확인 → 스킬/eval 어느 쪽 문제인지 판단.
