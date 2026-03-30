# Eval: sd-dev-spec

## 행동 Eval

### 시나리오 1: wbs.md 기반 Feature 요구명세 작성
- 입력: "/sd-dev-spec .tasks/test-project/wbs.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Impact Mapping + Feature Breakdown 포함 (미완료 Feature 2개 이상)
- 체크리스트:
  - [ ] 출력이 wbs.md의 내용에 기반한 분석을 포함한다
  - [ ] 미완료(`[ ]`) Feature 목록을 출력에 포함했다
  - [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED 분류)을 출력에 포함했다
  - [ ] INFERRED 항목에 레벨(High/Medium/Low)이 표기되어 있다
  - [ ] INFERRED Medium 또는 Low 항목이 ASSUMED로 격상되어 Question으로 전환되었다
  - [ ] Example Mapping 프로세스를 수행하고 결과(Rule, Example, Question)를 출력에 포함했다
  - [ ] Example Mapping의 각 항목에 Confidence Tag([VERIFIED], [INFERRED], [ASSUMED])가 있다
  - [ ] ASSUMED 항목에서 Question이 도출되었다
  - [ ] 질문 텍스트가 출력에 포함되었다
  - [ ] Feature 문서 파일이 `.tasks/test-project/` 경로에 생성되었다
  - [ ] Feature 문서에 `## 요구명세` 섹션이 있다
  - [ ] Feature 문서에 `## 구현계획` 섹션이 없다
  - [ ] Feature 문서의 `## 참조 자료` 하위에 `### 설계 결정` 테이블(`# / 결정사항 / 선택 / 근거` 컬럼)이 있다
  - [ ] Question Loop에서 해소된 ASSUMED 항목이 1개 이상 `### 설계 결정` 테이블에 기록되어 있다

### 시나리오 2: 참조 자료가 포함된 wbs.md 기반 Feature 요구명세 작성
- 입력: "/sd-dev-spec .tasks/test-project/wbs.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Impact Mapping + Feature Breakdown + `## 참조 자료` 섹션 포함
  - wbs.md의 참조 자료에 다음 내용이 포함:
    ```
    ## 참조 자료

    ### 입고 업무 규칙
    - 바코드 스캔 필수, 수량 불일치 시 '입고 보류' 상태로 전환
    - SKU 코드 형식: AA-000-0000 (카테고리 2자리-서브 3자리-일련번호 4자리)

    ### 출고 업무 규칙
    - FIFO 원칙 적용, 유통기한 30일 미만 제품 우선 출고

    ### 기술 제약
    - 기존 ERP(SAP) 연동: RFC 인터페이스 사용
    ```
  - Feature Breakdown에 미완료 Feature로 "입고 처리" Feature가 있으며, 범위 힌트에 "바코드 스캔 입고", "입고 보류 처리"가 있다
- 체크리스트:
  - [ ] 출력이 wbs.md의 내용에 기반한 분석을 포함한다
  - [ ] 참조 자료 섹션의 내용을 Metacognitive Preamble 또는 Example Mapping에서 활용했다 (SKU 코드 형식, 입고 보류, SAP RFC 중 2개 이상이 VERIFIED/INFERRED 분류 또는 Rule/Example에 등장)
  - [ ] Example Mapping에 참조 자료의 구체적 업무 규칙(SKU 코드 형식 AA-000-0000, 입고 보류 상태 전환 중 1개 이상)이 Rule 또는 Example로 반영되었다
  - [ ] Feature 문서 파일이 `.tasks/test-project/` 경로에 생성되었다
  - [ ] Feature 문서에 `## 참조 자료` 섹션이 있고, wbs.md 링크가 포함되어 있다
  - [ ] Feature 문서에 `## 요구명세` 섹션이 있다
  - [ ] Feature 문서의 `## 참조 자료` 하위에 `### 설계 결정` 테이블이 있다

### 시나리오 3: wbs.md 없이 자연어로 Feature 지정 (참조 자료 없음)
- 입력: "/sd-dev-spec 사용자가 이메일/비밀번호로 로그인하는 기능"
- 사전 조건:
  - `.tasks/` 디렉토리만 존재 (wbs.md 없음)
- 체크리스트:
  - [ ] wbs.md가 없음을 인지하고 사용자 입력에서 Feature 정보를 추출했다
  - [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED 분류)을 출력에 포함했다
  - [ ] Example Mapping 프로세스를 수행하고 결과(Rule, Example, Question)를 출력에 포함했다
  - [ ] Example Mapping의 각 항목에 Confidence Tag가 있다
  - [ ] Question 도출 기법(Decision Table, Boundary Value Analysis, Equivalence Partitioning, State Transition, Perspective-Based Reading) 중 1개 이상의 이름을 언급하거나 적용했다
  - [ ] Gherkin에 Background 섹션이 있다
  - [ ] Feature 문서 파일이 `.tasks/` 하위 경로에 생성되었다
  - [ ] Feature 문서에 `## 참조 자료` 섹션이 있고, 대화에서 수집한 구체적 정보(이메일/비밀번호 로그인 관련)가 기록되어 있다
  - [ ] Feature 문서에 `## 요구명세` 섹션이 있다
  - [ ] Feature 문서의 `## 참조 자료` 하위에 `### 설계 결정` 테이블이 있다
  - [ ] 크기 판단 후 WBS 제안이나 Feature 분리 제안 없이 Metacognitive Preamble로 진행했다

### 시나리오 4: 대화 맥락에 Feature 논의가 있는 상태에서 인자 없이 실행
- 입력: "우리 프로젝트에서 사용자 로그인 기능을 만들어야 해. 이메일/비밀번호 기반 로그인이고, 소셜 로그인(Google, Kakao)도 지원해야 해. 비밀번호 찾기 기능도 필요하고, 로그인 5회 실패하면 계정 잠금이야.\n\n/sd-dev-spec"
- 사전 조건:
  - `.tasks/` 디렉토리만 존재 (wbs.md 없음, 기존 Feature 문서 없음)
- 체크리스트:
  - [ ] 대화 맥락에서 Feature 정보(로그인 기능 관련 키워드: 이메일, 비밀번호, 소셜 로그인, 계정 잠금 중 2개 이상)를 추출하여 Example Mapping의 seed로 사용했다
  - [ ] Feature가 무엇인지 다시 물어보지 않았다 ("어떤 기능을 만드시겠습니까?" 류의 질문 텍스트가 없다)
  - [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED 분류)을 출력에 포함했다
  - [ ] Example Mapping 프로세스를 수행하고 결과(Rule, Example, Question)를 출력에 포함했다
  - [ ] Example Mapping의 각 항목에 Confidence Tag가 있다
  - [ ] Feature 문서 파일이 `.tasks/` 하위 경로에 생성되었다
  - [ ] Feature 문서에 `## 참조 자료` 섹션이 있고, 대화에서 수집한 구체적 정보(이메일/비밀번호, 소셜 로그인, 계정 잠금 중 2개 이상)가 기록되어 있다
  - [ ] Feature 문서에 `## 요구명세` 섹션이 있다
  - [ ] Feature 문서의 `## 참조 자료` 하위에 `### 설계 결정` 테이블이 있다

### 시나리오 5: spec 작성 중 Feature 범위 변경 시 WBS 동기화
- 입력: "/sd-dev-spec .tasks/test-project/wbs.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Feature Breakdown에 미완료 Feature 2개:
    - `[ ] Feature 1.1 사용자 인증` (범위 힌트: 이메일/비밀번호 로그인, 세션 관리, **권한 기반 접근 제어**)
    - `[ ] Feature 1.2 권한 관리` (범위 힌트: 역할 정의, 역할별 메뉴 접근)
  - 의도: "권한 기반 접근 제어"는 Feature 1.2의 영역이며, spec 과정에서 이를 인지하고 WBS를 수정해야 함
- 체크리스트:
  - [ ] Feature 1.1의 범위에서 "권한 기반 접근 제어"가 Feature 1.2의 영역임을 출력에서 언급했다
  - [ ] wbs.md의 Feature 1.1 범위 힌트에서 "권한 기반 접근 제어"가 제거되거나 Feature 1.2로 이동에 대한 언급이 있다
  - [ ] wbs.md 파일이 수정되었다
  - [ ] "권한 기반 접근 제어"가 wbs.md의 Feature 1.2 범위 힌트에 추가되었다

### 시나리오 6: 자연어 입력이 프로젝트 수준일 때 WBS 제안
- 입력: "/sd-dev-spec 쇼핑몰 시스템을 만들려고 한다. 사용자 회원가입/로그인, 상품 목록/검색, 장바구니, 결제, 주문 내역 조회, 관리자 상품 등록/재고 관리 기능이 필요하다."
- 사전 조건:
  - `.tasks/` 디렉토리만 존재 (wbs.md 없음)
- 체크리스트:
  - [ ] 입력이 단일 Feature가 아닌 프로젝트 수준(여러 독립 기능)임을 인식했다
  - [ ] `/sd-wbs`를 먼저 수행하도록 제안하는 내용이 출력에 포함되었다
  - [ ] "그대로 진행" 선택지도 출력에 포함되었다
  - [ ] 제안 단계에서 Example Mapping을 시작하지 않았다

### 시나리오 7: WBS Feature가 너무 클 때 분리 제안
- 입력: "/sd-dev-spec .tasks/test-project/wbs.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Feature Breakdown에 미완료 Feature:
    - `[ ] Feature 1.1 상품 관리` (범위 힌트: 상품 CRUD, 카테고리 관리, 재고 추적, 가격 정책, 할인/프로모션 관리, 상품 이미지 관리, 상품 검색/필터링)
- 체크리스트:
  - [ ] Feature 1.1의 범위가 너무 크다고 판단했다 (예상 Rule > 5)
  - [ ] Feature 분리를 제안하는 내용이 출력에 포함되었다
  - [ ] SPIDR 축 기반 분리안이 1개 이상 출력에 포함되었다
  - [ ] "그대로 진행" 선택지도 출력에 포함되었다
  - [ ] 크기 과대 판단과 분리 제안이 Example Mapping보다 먼저 출력에 등장했다

## 안티패턴 Eval

- [ ] Feature 문서에 `## 구현계획` 섹션을 작성한다
- [ ] ASSUMED 항목을 Example Mapping에서 `- Question:` 항목으로 명시하지 않고, 바로 확정된 Rule/Example로 작성한다
- [ ] Example Mapping 없이 바로 Gherkin을 작성한다
- [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED 분류) 없이 바로 Example Mapping을 작성한다
- [ ] Confidence Tag([VERIFIED], [INFERRED], [ASSUMED]) 없이 Example Mapping을 작성한다
- [ ] Metacognitive Preamble 분류 확인을 사용자에게 묻는다 (보여주기만 하고 즉시 진행해야 한다)
- [ ] 하나의 질문에 여러 결정사항을 한꺼번에 포함하여 질문한다
- [ ] Feature 범위를 변경했음에도 wbs.md를 수정하지 않는다
- [ ] Question Loop에서 해소된 결정사항을 Feature 문서의 `### 설계 결정`에 기록하지 않는다
- [ ] 다른 미완료 Feature에 영향을 주는 결정이 발생했음에도 해당 Feature의 범위 힌트나 문서를 수정하지 않는다
- [ ] 단일 Feature 수준의 적정 크기 요청에 대해 불필요하게 `/sd-wbs`를 제안한다
- [ ] Feature 크기가 적정함에도 분리를 제안한다
