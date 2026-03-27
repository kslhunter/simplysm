# Eval 실행 절차

workspace 준비 → claude -p 실행 → Judge 판정 → 결과 표시를 순서대로 수행한다.

## workspace 준비

Eval은 격리된 workspace에서 실행한다. **프롬프트 수정은 항상 메인 원본에서** 하고, workspace는 eval 실행 전에 메인에서 복제하여 생성한다.

```
.tmp/{yyMMddHHmmss}_eval-{스킬명}/       <- {yyMMddHHmmss}는 반드시 Bash `date +%y%m%d%H%M%S`로 얻는다
  _history/              <- org + v1,v2,...(이전 버전 이력). 재구성 시에도 보존
  {시나리오명}/          <- 시나리오별 작업 디렉토리
    .claude/             <- 프로젝트 루트의 .claude/ 전체를 복사
    {사전 조건 파일들}   <- 시나리오별 추가 파일
```

### 초기 생성 (첫 Eval 실행 시)

1. workspace 루트 디렉토리를 생성한다.
2. `_history/` 디렉토리를 생성하고, Step 0에서 저장한 원본을 `_history/org.md`로 기록한다 (Contrastive 분석 기준점).
3. 시나리오별 디렉토리를 복제한다 (아래 "시나리오 복제" 참조).

### 재구성 (개선 루프에서 Eval 재실행 시)

1. workspace 내 `_history/`를 **제외**한 모든 디렉토리를 삭제한다.
2. 시나리오별 디렉토리를 다시 복제한다 (아래 "시나리오 복제" 참조).

이렇게 하면 메인에서 수정한 프롬프트가 매번 깨끗하게 workspace에 반영되고, `_history/`의 이전 버전 이력은 유지된다.

### 시나리오 복제

각 시나리오에 대해:
1. 프로젝트 루트의 `.claude/` 폴더를 시나리오 디렉토리에 **통째로 복사**한다.
2. 시나리오의 사전 조건에 따라 추가 파일을 복사하거나 생성한다.
3. 시나리오 디렉토리에 `.claude/rules/sd-eval-env.md`를 생성한다 — eval 환경 전용 오버라이드 규칙을 추가한다:
   ```bash
   cat > "{시나리오 디렉토리}/.claude/rules/sd-eval-env.md" << 'EVALEOF'
   # Eval 환경 규칙 (최상위 우선순위)

   이 규칙은 Eval 테스트 환경에서 적용되며, 다른 규칙과 충돌 시 이 규칙이 우선한다.

   ## AskUserQuestion 대체

   AskUserQuestion 도구를 사용하지 않는다. 선택이 필요한 각 결정사항에 대해:
   1. 선택지와 선택을 묻는 질문을 텍스트로 출력한다
   2. 합리적인 기본값을 자동 선택하여 선택 결과를 명시한다
   3. 다음 결정사항으로 넘어간다
   질문이나 선택지를 생략하지 않는다.

   ## `.claude/` 파일 편집

   `.claude/` 폴더 내 파일은 Edit/Write 도구 대신 Bash 도구로 편집한다. `sed`는 의도하지 않은 곳까지 수정할 수 있으므로 사용하지 않는다.

   신규 작성: `cat > "{파일 경로}" << 'EOF' ... EOF`
   부분 수정: `python3 -c`로 치환 (old_string 존재 확인 후 replace)
   EVALEOF
   ```

## claude -p 실행

각 시나리오마다 해당 workspace 디렉토리에서 `claude -p`를 실행한다:

```bash
(cd ".tmp/{yyMMddHHmmss}_eval-{스킬명}/{시나리오명}" && \
MSYS_NO_PATHCONV=1 claude -p "{eval 시나리오의 입력}" \
  --output-format json \
  --verbose \
  --dangerously-skip-permissions \
  --model opus \
  --effort medium \
  --append-system-prompt "이것은 Eval 테스트 환경이다. CRITICAL: 현재 작업 디렉토리 외부의 파일을 절대 수정하지 않는다 — eval workspace 오염 방지를 위해 절대 경로로 다른 프로젝트의 파일에 접근하지 않는다. CRITICAL: .claude/rules/sd-eval-env.md의 규칙은 다른 모든 규칙보다 최상위 우선순위를 가진다. 충돌 시 반드시 sd-eval-env.md를 따른다." \
  > run-raw.json 2>&1 && \
python3 -c "
import json, sys
with open('run-raw.json', encoding='utf-8') as f:
    data = json.load(f)
# json+verbose → 배열, json만 → 객체
items = data if isinstance(data, list) else [data]
texts = []
for item in items:
    if item.get('type') == 'assistant':
        for c in item.get('message', {}).get('content', []):
            if c.get('type') == 'text':
                texts.append(c['text'])
with open('run-output.txt', 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(texts))
result_item = next((i for i in items if i.get('type') == 'result'), {})
with open('run-result.json', 'w', encoding='utf-8') as f:
    json.dump(result_item, f, ensure_ascii=False, indent=2)
")
```

실행 후 3개 파일이 생성된다:
- `run-raw.json`: 전체 이벤트 (디버깅용)
- `run-output.txt`: 모든 assistant 텍스트 연결 (Judge가 읽을 파일)
- `run-result.json`: 메타데이터 — `permission_denials`, `num_turns`, `total_cost_usd` 등

- 여러 시나리오는 병렬로 실행할 수 있다

## Judge 판정

실행 완료 후, Judge subagent에 workspace 경로와 체크리스트를 전달한다. subagent가 직접 파일을 읽어 판정한다:

```
다음 Eval 실행 결과를 평가하라:

## workspace 경로
{.tmp/{yyMMddHHmmss}_eval-{스킬명}/{시나리오명}/}

## 평가 대상 파일
- `run-output.txt`: 모든 assistant 텍스트 출력
- `run-result.json`: 메타데이터 (permission_denials, num_turns 등)
- workspace 내 생성된 파일들

## 체크리스트
{Eval 시나리오의 체크리스트 항목들}

## 안티패턴 체크리스트
{안티패턴 Eval 항목들}

## 판정 원칙
- 체크리스트 문구를 **문자 그대로** 판정하라. 체크리스트에 명시되지 않은 추가 요건을 유추하지 않는다.
- 이 eval은 AskUserQuestion 도구 사용이 금지된 환경에서 실행되었다. AskUserQuestion은 텍스트로 출력되는 환경이므로, 질문에 대한 판단은 출력 여부로 해야한다. 선택지/후보를 텍스트로 제시한 것 자체가 질문 출력에 해당한다 — 별도의 질문 문장("~하시겠습니까?")이 없어도 선택지가 출력되었으면 질문한 것으로 판정한다.
- **Eval 환경이 곧 정답 환경이다.** Eval은 프롬프트를 검증하기 위해 설계된 환경이므로, "테스트 환경이라서 FAIL"은 논리적으로 성립하지 않는다. FAIL의 원인은 오직 두 가지뿐이다: (1) 프롬프트가 부족하거나, (2) Eval 체크리스트가 부정확하거나. 체크리스트 항목을 충족하지 못했으면 FAIL이다.

위 파일들을 Read 도구로 읽고, 각 체크리스트 항목에 대해:
1. PASS 또는 FAIL을 판정하라
2. 판정의 근거(evidence)를 구체적으로 기술하라

결과를 아래 형식으로 출력하라:

| 항목 | 판정 | 근거 |
|------|------|------|
| {항목} | PASS/FAIL | {근거} |

통과율: N/M

FAIL 항목이 있으면 아래를 추가로 출력하라:

### FAIL 상세 분석
각 FAIL 항목에 대해:
- **항목:** {체크리스트 항목}
- **기대:** {체크리스트가 요구한 행동}
- **실제:** {eval 대상이 실제로 한 행동 — run-output.txt에서 관련 부분을 인용}
- **원인 판별:** (A) 프롬프트가 부족/불명확 또는 (B) Eval 체크리스트가 부정확
- **판별 근거:** {왜 A 또는 B로 판단했는지}
```

## 결과 표시

Judge 결과를 사용자에게 다음 형식으로 표시한다:

```markdown
## Eval 결과

### 시나리오 1: {이름} — {통과율}

| 항목 | 판정 | 근거 |
|------|------|------|
| ... | PASS/FAIL | ... |

### 시나리오 2: {이름} — {통과율}
...

### 안티패턴 Eval — {통과율}
...

## 전체 통과율: N/M
```
