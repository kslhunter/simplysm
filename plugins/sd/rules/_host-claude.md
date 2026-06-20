# 도구 사용 (Claude 전용 보강)

상위 행동 규칙 "도구 사용" 을 Claude 도구에 맞게 보강 (호스트별 주입 — Claude 세션에만 주입됨).

## 도구 선택

- `Read`·`Grep`·`Glob` 로 될 일을 PowerShell 로 하지 않음 (**IMPORTANT**).
- **서브에이전트(`Agent`) 보수적 사용**: base 시스템 프롬프트가 서브에이전트 위임을 권장하더라도, 평소엔 `Grep`·`Read`·`Glob` 로 직접 처리. `Agent` 는 단계지침에 명시됐거나 사용자가 명시적으로 지시할 때만 — 서브에이전트의 요약 return 은 원분석에서 정보가 누락됨(`fork` 포함).

## 서브에이전트 에러 처리

서브에이전트(`Agent`) 실행이 일시적 서버 오류(예: 529 overloaded)로 실패하면, 원인이 명확하므로 임의 재시도하지 않고 멈춰 사용자에게 보고. 사용자가 재시도를 확인하면 그때 재시도.

## Playwright CLI 도구 사용

- 산출물 저장 인자(`screenshot/pdf/snapshot/state-save/video-start --filename` 등)를 쓰지 않음 — 생략하면 자동 경로(`.playwright-cli/...`)에 저장됨.

## 도구 결과 수집 — Claude 도구 세부

상위 "도구 결과 수집 시" 의 Claude 도구별 파라미터:

- **Grep 절단**: 결과 줄 수가 `head_limit` 과 같으면 잘린 것으로 간주. 대응 — `pattern`·`glob`·`type` 으로 좁히기, `output_mode=count` 로 총량 파악, `offset` 추가 호출, `head_limit=0`(대량 주의).
- **Read 부분 읽기**: `offset`·`limit` 으로 안 읽은 영역을 "정보 없음" 으로만 취급, "거기엔 없다" 단정 금지.
- **Bash 출력 절단**(30000자 등): 파일로 빼서 나눠 `Read` 하거나 reporter 옵션으로 압축.
- 위반 예: `head_limit=250` 결과 250줄을 "검색 완료" 처리 / `Read` 1–200 만 보고 "201줄 이후엔 없음" 단정.
