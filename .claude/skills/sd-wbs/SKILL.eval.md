# Eval: sd-wbs

## 행동 Eval

### 시나리오 1: 상세한 요구사항으로 WBS 생성
- 입력: "/sd-wbs 사내 도서 관리 시스템을 만들려고 한다. 목표는 도서 대출 반납 처리 시간을 50% 단축하는 것이다. 사용자는 일반 직원(대출/반납)과 도서 관리자(도서 등록/재고 관리)이다. 직원은 모바일에서 바코드 스캔으로 대출하고, 관리자는 웹에서 재고를 관리한다. 알림 기능, 통계 대시보드는 제외한다."
- 체크리스트:
  - [ ] AskUserQuestion을 사용하지 않고 자율적으로 분석하여 WBS를 생성한다
  - [ ] `.tasks/` 하위에 `{yyMMddHHmmss}_{topic}/wbs.md` 경로로 파일을 생성한다
  - [ ] Impact Mapping에 Goal, Actor, Impact, Deliverable이 모두 포함된다
  - [ ] Goal이 측정 가능하게 기술된다 ("도서 대출 반납 처리 시간 50% 단축" 수준)
  - [ ] Impact가 기능이 아닌 행동 변화로 기술된다 ("바코드 스캔으로 대출한다"가 아닌 "대출 절차를 빠르게 완료한다" 수준)
  - [ ] Feature Breakdown에서 Feature가 의존성 순서로 정렬된다 (앞 Feature가 뒤 Feature의 기반)
  - [ ] Feature에 `[ ]` 체크박스가 있다
  - [ ] Feature 하위에 `-` 불릿의 범위 힌트가 있다
  - [ ] 제외 사항에 "알림 기능", "통계 대시보드"가 포함된다
  - [ ] MoSCoW 우선순위(Must/Should/Could/Won't)를 사용하지 않는다

### 시나리오 2: 모호한 요구사항으로 WBS 생성
- 입력: "/sd-wbs 할일 관리 앱 만들어줘"
- 체크리스트:
  - [ ] AskUserQuestion을 사용하지 않고 자율적으로 분석하여 WBS를 생성한다
  - [ ] 도메인 지식을 기반으로 합리적인 Goal, Actor, Impact를 자율 도출한다
  - [ ] `.tasks/` 하위에 `{yyMMddHHmmss}_{topic}/wbs.md` 경로로 파일을 생성한다
  - [ ] Impact Mapping에 Goal, Actor, Impact, Deliverable이 모두 포함된다
  - [ ] Feature Breakdown에서 Feature가 의존성 순서로 정렬된다

## 안티패턴 Eval

- [ ] AskUserQuestion을 사용하여 사용자에게 질문한다
- [ ] Impact Mapping 없이 Feature 목록만 나열한다
- [ ] Goal이 측정 불가능하다 ("효율화", "개선" 등 추상적 표현)
- [ ] MoSCoW 우선순위(Must/Should/Could/Won't)를 사용한다
- [ ] Feature에 `[ ]` 체크박스가 없다
- [ ] 산출물 경로가 `.tasks/{yyMMddHHmmss}_{topic}/wbs.md` 형식이 아니다
