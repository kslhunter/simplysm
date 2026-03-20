---
name: sd-debug
description: |
  Analyze root cause of bugs/errors and present multi-perspective solutions with competitive scoring in debug.md.
  Triggered by /sd-debug or requests like "디버그", "에러 분석", "버그 원인 찾아줘", "debug this error".
---

# sd-debug: 근본 원인 디버깅

Why Chain을 통해 버그/에러의 근본 원인을 추적하고, 다관점 해결 방안을 경쟁 채점하여 `.tasks/{yyMMddHHmmss}_debug-{topic}/debug.md`에 문서화한다.

코드를 직접 수정하지 않는다. 사용자가 리포트를 검토한 후 별도로 수정을 요청한다.

## 프로세스

```
1단계: 문제 식별 → 2단계: 컨텍스트 수집 → 3단계: 근본 원인 추적 → 4단계: 방안 경쟁 → 5단계: 문서화
```

## 1단계: 문제 식별

사용자 입력에서 다음을 추출한다:

- **에러 메시지** — 있으면 원문 그대로 인용
- **위치** — 파일 경로, 라인 번호
- **재현 조건** — 에러가 언제/어떻게 발생하는지

정보가 부족하면 `AskUserQuestion`으로 질문한다. 절대 추측하지 않는다.

## 2단계: 컨텍스트 수집

에러 관련 코드를 읽고 이해를 구축한다:

- 에러가 발생하는 파일 읽기
- 호출 체인 추적 — 해당 함수의 호출자와 피호출자
- 관련 타입 정의, 설정 파일 확인

## 3단계: 근본 원인 추적 (Why Chain)

### 편법/우회방법 엄격히 금지

근본 원인이란 "수정하면 에러가 원천적으로 사라지는 지점"이다. 증상을 숨기는 것은 수정이 아니다.

금지되는 편법 예시:
- `setTimeout`/`requestAnimationFrame`으로 타이밍 문제 회피
- `try-catch`로 에러 무시
- `as any`, `@ts-ignore`로 타입 에러 우회
- 플래그 변수(`isReady`, `isLoaded`)로 조건 우회
- `?.` 옵셔널 체이닝으로 undefined를 조용히 무시 (근본 원인이 데이터 흐름 자체에 있는 경우)

### Why Chain 수행

근본 원인에 도달할 때까지 "왜?"를 반복한다:

```
증상: TypeError: Cannot read properties of undefined (reading 'name')
  왜? → undefined인 user.profile에서 .name에 접근
  왜? → getUsers()가 profile이 없는 User를 반환할 수 있음
  왜? → User 인터페이스에서 profile이 optional(?)이지만 호출부에서 이를 고려하지 않음
  근본 원인: optional 필드에 대한 가드 누락
```

최소 3단계 이상 추적한다. 1~2단계에서 멈추면 직접 원인만 파악하고 근본 원인을 놓칠 위험이 있다.

## 4단계: 방안 경쟁

근본 원인에 대해 **최소 2개** 이상의 해결 방안을 제시하고 서로 경쟁시킨다.

### 방안별 구조

| 항목 | 설명 |
|------|------|
| 이름 | 간결한 한 줄 요약 |
| 설명 | 코드 예시를 포함한 구현 방향 |
| 장점 | 이 접근법의 강점 |
| 반론 | 이 접근법의 약점/리스크를 적극적으로 공격 |
| 점수 | 3개 축, 각 10점 만점 |

### 채점

`.claude/rules/sd-option-scoring.md`의 규칙을 따른다.

### 경쟁 규칙

- **모든 방안에 반론 필수** — 반론이 없는 방안은 검증되지 않은 것이다
- **동점 금지** — 평균이 같으면 근본성 관점으로 결정
- **최고 점수 방안을 명시적으로 추천** — 추천 사유를 한 줄로 요약

## 5단계: 문서화

### 출력 경로

`.tasks/{yyMMddHHmmss}_debug-{topic}/debug.md`

- `{yyMMddHHmmss}` — Bash `date +%y%m%d%H%M%S`로 취득. LLM이 생성한 타임스탬프 금지
- `{topic}` — 에러/이슈의 핵심을 나타내는 간결한 키워드 (예: `null-ref`, `race-condition`, `async-init`)

### debug.md 형식

```markdown
# 디버그: {에러 한 줄 요약}

## 에러 증상

- **에러 메시지:** `{원문}`
- **위치:** `{file_path:line_number}`
- **재현:** {설명}

## 근본 원인 추적 (Why Chain)

1. **증상:** {에러 메시지/동작}
2. **왜?** → {직접 원인}
3. **왜?** → {더 깊은 원인}
4. **근본 원인:** {최종 원인}

## 해결 방안

### 방안 A: {이름}

- **설명:** {구현 방향}
- **코드 예시:**
  ```typescript
  // Before
  ...
  // After
  ...
  ```
- **장점:** {강점}
- **반론:** {약점/리스크}
- **점수:** {관점별 N}/10 → **평균 {N}/10**

### 방안 B: {이름}

...

## 추천

**방안 {X}** (평균 {N}/10)

{한 줄 추천 사유}
```

### 완료 후 출력

대화에 다음을 표시한다:

- 근본 원인 한 줄 요약
- 추천 방안과 합계 점수
- `debug.md` 파일 경로
- 수정이 필요하면 `/sd-dev`로 개발을 진행할 수 있다는 안내
