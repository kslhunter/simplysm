# Eval: sd-dev-spec

## 행동 Eval

### 시나리오 1: wbs 기반 전체 흐름 (happy path + 역방향 피드백)

- 입력: "/sd-dev-spec .tasks/test-project/wbs.md 1.1"
- 사전 조건:
  - `.tasks/test-project/wbs.md`:
    - `[ ] Feature 1.1 사용자 인증` (범위 3개 항목, **권한 기반 접근 제어** 포함)
    - `[ ] Feature 1.2 권한 관리` (범위: 역할 정의, 역할별 메뉴 접근)
- 체크리스트:
  - [ ] 범위를 구체적 동작 수준으로 세분화하여 재나열했다
  - [ ] Metacognitive Preamble → Example Mapping → Question 루프 → Gherkin 순서로 진행했다
  - [ ] Feature 문서에 `## 참조 자료`, `### 설계 결정`, `## 요구명세` 섹션이 있고 `## 구현계획`은 없다
  - [ ] "권한 기반 접근 제어"가 Feature 1.2 영역임을 인지하고 wbs.md를 수정했다

### 시나리오 2: wbs 없이 자연어/문서 입력

- 입력: "/sd-dev-spec .tasks/test-project/review-report.md" (단일 Feature로 귀결되는 자유 형식 문서)
- 사전 조건: wbs 없음
- 체크리스트:
  - [ ] 문서에서 Feature 정보를 추출하고 세분화했다
  - [ ] Metacognitive Preamble → Example Mapping → Question 루프 → Gherkin 순서로 진행했다
  - [ ] Feature 문서가 `.tasks/` 하위에 생성되었다

### 시나리오 3: 복수 Feature → /sd-wbs 제안

- 입력: "/sd-dev-spec 쇼핑몰 시스템. 회원가입/로그인, 상품 목록, 장바구니, 결제, 주문 내역, 관리자 상품 등록이 필요하다."
- 체크리스트:
  - [ ] `/sd-wbs`를 제안했다
  - [ ] Example Mapping을 시작하지 않았다

### 시나리오 4: wbs Feature 크기 초과 → SPIDR 분리

- 입력: "/sd-dev-spec .tasks/test-project/wbs.md 1.1"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Feature 1.1 "상품 관리" (범위: 상품 CRUD, 카테고리 관리, 재고 추적, 가격 정책, 할인/프로모션 관리, 상품 이미지 관리)
- 체크리스트:
  - [ ] 세부 기능 5개 초과로 판단했다
  - [ ] SPIDR 축 기반 분리안을 제시했다 ("그대로 진행" 포함)
  - [ ] 수락 시 wbs.md의 Feature를 분리된 Feature들로 교체했다

## 안티패턴 Eval

- [ ] Metacognitive Preamble 또는 Example Mapping을 생략한다
- [ ] 입력 범위를 세분화하지 않고 그대로 사용한다
- [ ] 적정 크기인데 불필요하게 `/sd-wbs`를 제안한다
- [ ] wbs 문서의 범위를 변경했는데 wbs.md를 수정하지 않는다
