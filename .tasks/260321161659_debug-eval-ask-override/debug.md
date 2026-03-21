# 디버그: sd-prompt eval 환경에서 AskUserQuestion 대체 지시 불충분

## 에러 증상

- **에러 메시지:** (런타임 에러 아님 — LLM 행동 불일치)
- **위치:** `.claude/skills/sd-prompt/SKILL.md:299` (`--append-system-prompt` 문구)
- **재현:**
  - 증상 A: sd-plan eval 시나리오 1 — LLM이 Q1만 선택지 테이블로 출력하고 Q2~Q6은 선택지 없이 일괄 자동 결정
  - 증상 B: sd-plan eval 시나리오 2 — LLM이 Q1 선택지를 출력 후 응답을 기다리며 종료 (자동 선택 미수행)

## 근본 원인 추적 (Why Chain)

### 증상 A: Q2~Q6 선택지 생략

1. **증상:** LLM이 ASSUMED 6건 중 Q1만 선택지 테이블을 출력하고, Q2~Q6은 선택지 없이 자동 결정
2. **왜?** → Q1 자동 선택 후 "계속 진행하라"를 "나머지도 빠르게 결정"으로 해석
3. **왜?** → 실제 대화에서는 `AskUserQuestion`이 블로킹하여 per-question 루프가 강제되지만, eval에서는 블로킹 메커니즘이 없음
4. **왜?** → append-system-prompt가 "자동 선택하여 계속 진행하라"만 말하고, "각 질문마다 선택지를 출력하라"를 강제하지 않음
5. **근본 원인:** append-system-prompt가 AskUserQuestion의 블로킹 루프를 대체하는 per-question 절차를 명시하지 않음

### 증상 B: 자동 선택 미수행으로 멈춤

1. **증상:** LLM이 Q1 선택지 출력 후 자동 선택하지 않고 종료
2. **왜?** → sd-option-scoring.md L17: "선택지 정보를 텍스트로 출력한 뒤 `---` 구분선을 출력하고, `AskUserQuestion`으로 질문한다" — LLM이 이 지시를 따르려 하지만 AskUserQuestion이 차단됨
3. **왜?** → sd-option-scoring.md L7: "사용자 선택 후 다음으로 넘어간다" — "사용자 선택" 이벤트가 eval에서는 발생하지 않으므로 LLM이 대기 상태로 멈춤
4. **왜?** → append-system-prompt의 "AskUserQuestion 도구를 사용하지 말고"가 sd-option-scoring.md의 "AskUserQuestion으로 질문한다"를 명시적으로 오버라이드하지 못함. LLM이 어느 지시를 따를지 가변적
5. **근본 원인:** append-system-prompt와 sd-option-scoring.md 사이의 **명시적 충돌 미해소** — "AskUserQuestion 사용 금지"와 "AskUserQuestion으로 질문한다"가 공존하여 LLM이 비결정적으로 동작

### 공통 근본 원인

```
sd-option-scoring.md (L7, L17):
  "한 번에 하나의 결정사항만 제시하고, 사용자 선택 후 다음으로 넘어간다"
  "AskUserQuestion으로 질문한다"
         ↕ 충돌
append-system-prompt:
  "AskUserQuestion 도구를 사용하지 말고, 해당 질문 내용을 텍스트로 출력 후,
   합리적인 기본값을 자동 선택하여 선택한 것을 출력후 계속 진행하라"
```

append-system-prompt는 AskUserQuestion을 **금지**하지만, sd-option-scoring.md의 per-question 블로킹 루프를 **대체하는 동등한 절차를 정의하지 않는다**. 결과적으로:
- LLM이 "자동 선택 후 빠르게 진행" 모드로 빠지면 → 증상 A (선택지 생략)
- LLM이 sd-option-scoring.md를 우선시하면 → 증상 B (AskUserQuestion 대기)

## 해결 방안

### 방안 A: append-system-prompt에서 sd-option-scoring.md를 명시적 오버라이드

- **설명:** append-system-prompt 문구를 강화하여, sd-option-scoring.md의 AskUserQuestion 의존을 이름으로 지목하고 대체 절차를 명시한다.

- **코드 예시:**
  ```
  # Before
  --append-system-prompt "이것은 Eval 테스트 환경이다. CRITICAL: 현재 작업 디렉토리
  외부의 파일을 절대 수정하지 않는다 — eval workspace 오염 방지를 위해 절대 경로로
  다른 프로젝트의 파일에 접근하지 않는다. AskUserQuestion 도구를 사용하지 말고,
  해당 질문 내용을 텍스트로 출력 후, 합리적인 기본값을 자동 선택하여 선택한 것을
  출력후 계속 진행하라. (절대 질문 자체를 생략하지 말것)"

  # After
  --append-system-prompt "이것은 Eval 테스트 환경이다. CRITICAL: 현재 작업 디렉토리
  외부의 파일을 절대 수정하지 않는다 — eval workspace 오염 방지를 위해 절대 경로로
  다른 프로젝트의 파일에 접근하지 않는다. AskUserQuestion 도구를 사용하지 않는다.
  sd-option-scoring.md의 'AskUserQuestion으로 질문한다' 규칙을 다음으로 대체한다:
  각 결정사항에 대해 (1) 선택지 테이블(장단점/점수 포함)을 텍스트로 출력하고
  (2) 합리적인 기본값을 자동 선택하여 선택 결과를 명시한 뒤
  (3) 다음 결정사항으로 넘어간다.
  모든 결정사항에 대해 이 절차를 반복한다. 질문이나 선택지를 생략하지 않는다."
  ```

- **장점:** sd-prompt SKILL.md 한 곳만 수정. 다른 스킬/규칙에 영향 없음. 충돌하는 규칙을 이름으로 지목하여 LLM이 우선순위를 명확히 판단 가능
- **반론:** append-system-prompt가 sd-option-scoring.md의 내부 구현을 알아야 하는 커플링 발생. sd-option-scoring.md 문구가 변경되면 append도 업데이트 필요. 또한 append-system-prompt 대 SKILL.md 본문의 우선순위 경쟁이 여전히 존재하므로 LLM 가변성을 완전히 제거할 수 없음
- **점수:**
  - 근본성: 7/10 — 충돌을 명시적으로 지목하여 해소
  - 유지보수성: 7/10 — 한 곳 수정이지만 커플링 존재
  - 신뢰도: 6/10 — 명시적 오버라이드로 개선되나, append vs 본문 우선순위 경쟁 잔존
  - → **평균 6.7/10**

### 방안 B: eval workspace에서 sd-option-scoring.md를 eval 버전으로 교체

- **설명:** sd-prompt의 Step 4-2(workspace 준비) 단계에서, `.claude/rules/sd-option-scoring.md`를 eval 전용 버전으로 교체한다. eval 버전은 AskUserQuestion 대신 텍스트 출력 + 자동 선택 절차를 사용하도록 수정된 원본이다.

- **코드 예시:**
  ```markdown
  # sd-option-scoring.md (eval 버전) — 변경 부분만 표시

  ## 필수 항목
  - 각 선택지에 대해 **장단점/트레이드오프/10점 만점 점수**를 포함한다
  - **"수행 안 함"** 옵션을 반드시 포함한다
  - 선택지 정보를 텍스트로 출력한 뒤 `---` 구분선을 출력하고,
    합리적인 기본값을 자동 선택하여 선택 결과를 명시한다   ← 변경

  ## 복수 결정사항 처리
  - 한 번에 하나의 결정사항만 제시하고,
    자동 선택 후 다음으로 넘어간다                          ← 변경
  ```

  ```
  # sd-prompt SKILL.md Step 4-2 workspace 준비에 추가:
  4. `.claude/rules/sd-option-scoring.md`를 eval 버전으로 교체한다:
     - "AskUserQuestion으로 질문한다" → "합리적인 기본값을 자동 선택하여 선택 결과를 명시한다"
     - "사용자 선택 후 다음으로 넘어간다" → "자동 선택 후 다음으로 넘어간다"
  ```

- **장점:** 충돌 자체가 소멸 — eval workspace 안에서 LLM이 받는 모든 지시가 일관됨. append-system-prompt를 단순하게 유지 가능. LLM 가변성을 가장 효과적으로 억제
- **반론:** sd-option-scoring.md 원본이 변경되면 eval 버전도 수동 동기화 필요 (유지보수 부담). sd-prompt SKILL.md에 파일 교체 로직이 추가되어 복잡도 증가. 다만 교체 대상은 2줄뿐이라 sed로 처리 가능
- **점수:**
  - 근본성: 9/10 — 충돌 원인을 원천 제거
  - 유지보수성: 6/10 — 원본 변경 시 동기화 필요
  - 신뢰도: 9/10 — LLM이 받는 지시에 모순이 없으므로 가변성 최소
  - → **평균 8.0/10**

## 추천

**방안 B** (평균 8.0/10)

충돌의 근원(sd-option-scoring.md)을 eval workspace 안에서 직접 교체하여 LLM이 받는 지시의 모순을 원천 제거한다. 교체 대상이 2줄뿐이라 sed 한 줄로 처리 가능하며, append-system-prompt를 단순하게 유지할 수 있다.
