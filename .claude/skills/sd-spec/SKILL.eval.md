# Eval: sd-spec

## 행동 Eval

### 시나리오 1: wbs.md 기반 Feature 요구명세 작성
- 입력: "/sd-spec .tasks/test-project/wbs.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Impact Mapping + Feature Breakdown 포함 (미완료 Feature 2개 이상)
- 체크리스트:
  - [ ] 출력이 wbs.md의 내용에 기반한 분석을 포함한다
  - [ ] 미완료(`[ ]`) Feature 목록을 출력에 포함했다
  - [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED 분류)을 출력에 포함했다
  - [ ] INFERRED 항목에 레벨(High/Medium/Low)이 표기되어 있다
  - [ ] INFERRED Medium 또는 Low 항목이 ASSUMED로 격상되어 Question으로 전환되었다
  - [ ] Example Mapping이 출력에 포함되었다 (Rule, Example 항목이 각각 1개 이상)
  - [ ] Example Mapping의 각 항목에 Confidence Tag([VERIFIED], [INFERRED], [ASSUMED])가 있다
  - [ ] ASSUMED 항목에서 Question이 도출되었다
  - [ ] 질문 텍스트가 출력에 포함되었다
  - [ ] Feature 문서 파일이 `.tasks/test-project/` 경로에 생성되었다
  - [ ] Feature 문서에 `## 요구명세` 섹션이 있다
  - [ ] Feature 문서에 `## 구현계획` 섹션이 없다

### 시나리오 2: 참조 자료가 포함된 wbs.md 기반 Feature 요구명세 작성
- 입력: "/sd-spec .tasks/test-project/wbs.md"
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

### 시나리오 3: wbs.md 없이 자연어로 Feature 지정 (참조 자료 없음)
- 입력: "/sd-spec 사용자가 이메일/비밀번호로 로그인하는 기능"
- 사전 조건:
  - `.tasks/` 디렉토리만 존재 (wbs.md 없음)
- 체크리스트:
  - [ ] wbs.md가 없음을 인지하고 사용자 입력에서 Feature 정보를 추출했다
  - [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED 분류)을 출력에 포함했다
  - [ ] Example Mapping이 출력에 포함되었다 (Rule 2개 이상, Example 2개 이상)
  - [ ] Example Mapping의 각 항목에 Confidence Tag가 있다
  - [ ] Question 도출 기법(Decision Table, Boundary Value Analysis, Equivalence Partitioning, State Transition, Perspective-Based Reading) 중 1개 이상의 이름을 언급하거나 적용했다
  - [ ] Gherkin에 Background 섹션이 있다
  - [ ] Feature 문서 파일이 `.tasks/` 하위 경로에 생성되었다
  - [ ] Feature 문서에 `## 참조 자료` 섹션이 있고, 대화에서 수집한 구체적 정보(이메일/비밀번호 로그인 관련)가 기록되어 있다
  - [ ] Feature 문서에 `## 요구명세` 섹션이 있다

### 시나리오 4: 대화 맥락에 Feature 논의가 있는 상태에서 인자 없이 실행
- 입력: "우리 프로젝트에서 사용자 로그인 기능을 만들어야 해. 이메일/비밀번호 기반 로그인이고, 소셜 로그인(Google, Kakao)도 지원해야 해. 비밀번호 찾기 기능도 필요하고, 로그인 5회 실패하면 계정 잠금이야.\n\n/sd-spec"
- 사전 조건:
  - `.tasks/` 디렉토리만 존재 (wbs.md 없음, 기존 Feature 문서 없음)
- 체크리스트:
  - [ ] 대화 맥락에서 Feature 정보(로그인 기능 관련 키워드: 이메일, 비밀번호, 소셜 로그인, 계정 잠금 중 2개 이상)를 추출하여 Example Mapping의 seed로 사용했다
  - [ ] Feature가 무엇인지 다시 물어보지 않았다 ("어떤 기능을 만드시겠습니까?" 류의 질문 텍스트가 없다)
  - [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED 분류)을 출력에 포함했다
  - [ ] Example Mapping이 출력에 포함되었다 (Rule 2개 이상, Example 2개 이상)
  - [ ] Example Mapping의 각 항목에 Confidence Tag가 있다
  - [ ] Feature 문서 파일이 `.tasks/` 하위 경로에 생성되었다
  - [ ] Feature 문서에 `## 참조 자료` 섹션이 있고, 대화에서 수집한 구체적 정보(이메일/비밀번호, 소셜 로그인, 계정 잠금 중 2개 이상)가 기록되어 있다
  - [ ] Feature 문서에 `## 요구명세` 섹션이 있다

## 안티패턴 Eval

- [ ] Feature 문서에 `## 구현계획` 섹션을 작성한다
- [ ] ASSUMED 항목을 Example Mapping에서 `- Question:` 항목으로 명시하지 않고, 바로 확정된 Rule/Example로 작성한다
- [ ] Example Mapping 없이 바로 Gherkin을 작성한다
- [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED 분류) 없이 바로 Example Mapping을 작성한다
- [ ] Confidence Tag([VERIFIED], [INFERRED], [ASSUMED]) 없이 Example Mapping을 작성한다
- [ ] Metacognitive Preamble 분류 확인을 사용자에게 묻는다 (보여주기만 하고 즉시 진행해야 한다)
- [ ] 하나의 질문에 여러 결정사항을 한꺼번에 포함하여 질문한다
