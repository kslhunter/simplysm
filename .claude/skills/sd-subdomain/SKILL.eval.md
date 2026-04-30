# Eval: sd-subdomain

## 행동 Eval

### 시나리오 1: 도서관 통합 시스템 신규 분해

- 입력: "/sd-subdomain 중견 도서관 통합 시스템을 새로 구축. 회원 가입·관리, 도서 등록·검색·대출·반납·예약. 차별화 핵심은 '회원 맞춤 도서 추천' 알고리즘. 통계 리포트, 결제(연체료/유료 회원권), 푸시알림, 외부 도서 API 연동(국립중앙도서관 등). 조직: 사서 5명 + 관장 1명, 회원 2만명."
- 성공 행동:
  - [ ] `.tasks/{ts}_*/subdomain-map.md` 형식의 산출물 파일이 생성된다
  - [ ] 산출물에 카테고리 헤더(`### 1.`, `### 2.` 등)와 Subdomain 헤더(`#### 1.1`, `#### 1.2` 등) 형태의 2단 트리 구조가 있다
  - [ ] 각 Subdomain에 Core/Supporting/Generic 중 하나의 분류 라벨이 ID·이름 옆에 표기된다 (예: `1.1 ... (Core)`)
  - [ ] Core 분류 Subdomain에 `**Vision:**` 필드가 작성된다
  - [ ] Supporting 또는 Generic 분류 Subdomain에는 `**Vision:**` 필드가 없다 (Core만 작성)
  - [ ] 모든 분류·차별화 점수·복잡도 점수 항목에 `[근거: ...]` 태그가 동반된다
  - [ ] Core/Generic 분류 Subdomain에 상대성 컨텍스트가 명시된다 ("이 회사 ~ 이유로 ~ 분류" 형식)
  - [ ] `## 의존성 매트릭스` 섹션이 존재하고, 의존 대상이 `없음`인 Subdomain이 최소 1개 있다
  - [ ] "회원 맞춤 도서 추천" 또는 동등 표현이 Core 분류 Subdomain으로 식별된다 (입력의 차별화 전략 반영)
  - [ ] 외부 도서 API 연동·결제·푸시알림 중 최소 2건이 Generic 분류 Subdomain으로 식별된다
  - [ ] 산출물의 `## 프로젝트 개요`에 회사 차별화 전략 또는 회원 추천 관련 항목이 명시된다
  - [ ] `## 격리 검증 결과` 섹션이 존재한다
  - [ ] `## 수행 순서 안내` 섹션이 존재하고 의존성 기반 단계별 묶음 형태가 포함된다
- 보조 assertion:
  - [ ] 산출물 파일이 `.tasks/` 하위 경로에 존재한다
  - [ ] 의존성 매트릭스가 Markdown 표(`| Subdomain | 의존 대상 |` 헤더) 형식으로 작성된다
- Judge rubric:
  - PASS: 모든 성공 행동 PASS + 안티패턴 0건
  - FAIL: 성공 행동 1개 이상 FAIL 또는 안티패턴 1건 이상 발생

## 안티패턴 Eval

각 항목은 *"발견되면 FAIL"* 인 행동 목록이다. 항목이 산출물·실행 로그에서 발견되지 않으면 PASS.

- [ ] 산출물에 Sub-subdomain 3단 ID(`1.1.1` 형태) 또는 그 헤더(`#### 1.1.1` 등)가 포함된다
- [ ] 카테고리·Subdomain 이름에 `Backend`/`Frontend`/`Admin Subdomain`/`User Subdomain`이 분류 기준으로 등장한다
- [ ] catch-all 이름(`기타`/`공통`/`Utility`/`Common`/`Misc`)이 카테고리·Subdomain 이름으로 사용된다
- [ ] sd-wbs 본체(`.claude/skills/sd-wbs/SKILL.md`)가 수정된다
- [ ] sd-dev 본체(`.claude/skills/sd-dev/SKILL.md`)가 수정된다
- [ ] 산출물 본문에 `추후 결정`/`협의 필요`/`별도 확정`/`미확정`/`보류` 같은 미루기 표현이 있다
