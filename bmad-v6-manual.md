# BMAD v6 사용 매뉴얼

> 공식 문서: https://docs.bmad-method.org  
> GitHub: https://github.com/bmad-code-org/BMAD-METHOD

---

## 시작하기 전에

### BMAD 설치

```bash
# 프로젝트 폴더에서 실행
npx bmad-method install
```

설치가 완료되면 `.claude/commands/bmad/` 폴더에 명령어 파일들이 생성됩니다.

### 기본 사용법

BMAD는 AI IDE(Claude Code, Cursor, Windsurf 등)에서 **슬래시 명령어**를 입력하여 사용합니다.

```
/bmad-help          도움말 (다음에 뭘 해야 할지 모를 때)
/quick-spec         빠른 기술 사양 생성
/quick-dev          tech-spec 구현 (Quick Flow)
/dev-story          스토리 구현 (BMad Method)
```

워크플로우를 실행하면 해당 워크플로우에 맞는 에이전트가 자동으로 활성화됩니다.

---

## 시나리오 1: 버그 수정 / 작은 기능 추가 (Quick Flow)

> 예: "로그인 API에 rate limiting 추가", "null 체크 버그 수정", "리팩터링"

Quick Flow는 PRD, Architecture 없이 바로 구현으로 들어가는 빠른 경로입니다.

### Step 1: 새 채팅 시작

Claude Code 또는 사용 중인 AI IDE에서 새 채팅을 엽니다.

### Step 2: Quick Spec 생성

```
/quick-spec
```

에이전트가 질문합니다. 원하는 변경사항을 설명하세요:

```
로그인 API에 rate limiting을 추가하고 싶어.
- IP당 5분에 10회 제한
- 제한 초과시 429 응답
- Redis로 카운트 관리
```

에이전트가 코드베이스를 분석하고 `tech-spec.md`를 생성합니다.

### Step 3: 구현

```
/quick-dev
```

에이전트가 tech-spec 전체를 한 번에 구현합니다.

### Step 4: 완료

코드를 확인하고 커밋합니다.

> **참고**: `/code-review`는 Quick Flow에 포함되지 않습니다. 필요시 별도로 실행할 수 있습니다.

---

## 시나리오 2: 새 프로젝트 시작 (BMad Method)

> 예: "사내 휴가 관리 시스템 개발", "고객 피드백 수집 앱"
>
> 중규모 이상 프로젝트에서 체계적인 계획이 필요할 때 사용합니다.

### Phase 1: Analysis (선택)

아이디어가 명확하지 않거나, 시장/기술 검증이 필요한 경우 Phase 1부터 시작합니다.

#### Step 1-1: 브레인스토밍 (선택)

**새 채팅**:

```
/brainstorm-project
```

아이디어를 설명합니다:

```
사내 휴가 관리 시스템을 만들려고 해.
직원이 휴가 신청하고 매니저가 승인하는 기본 기능이 필요해.
```

에이전트가 여러 접근 방식을 제안합니다.

#### Step 1-2: 리서치 (선택)

**새 채팅**:

```
/research
```

시장, 기술, 경쟁사 분석을 진행합니다.

#### Step 1-3: Product Brief

**새 채팅**:

```
/product-brief
```

에이전트가 프로젝트에 대해 질문합니다:

```
사내 휴가 관리 시스템을 만들려고 해.

- 직원이 휴가 신청
- 매니저가 승인/반려
- 잔여 휴가일수 조회
- 팀별 휴가 현황 대시보드

사용자: 직원 50명 규모
```

완료되면 `product-brief.md`가 생성됩니다.

> **참고**: 요구사항이 이미 명확하다면 Phase 1을 건너뛰고 바로 Phase 2(PRD)부터 시작해도 됩니다.

### Phase 2: Planning

**새 채팅**:

```
/create-prd
```

Product Brief를 기반으로 상세 요구사항 문서(`PRD.md`)가 생성됩니다.

### Phase 3: Solutioning

#### Step 3-1: 아키텍처 설계

**새 채팅**:

```
/create-architecture
```

PRD를 읽고 기술적 결정사항을 질문합니다.
완료되면 `architecture.md`가 생성됩니다.

#### Step 3-2: Epic/Story 분해

**새 채팅**:

```
/create-epics-and-stories
```

PRD와 architecture를 기반으로 작업 단위가 분해됩니다.

### Phase 4: Implementation

#### Step 4-1: 스프린트 계획

**새 채팅**:

```
/sprint-planning
```

스프린트를 초기화합니다. `sprint-status.yaml`이 생성됩니다.

#### Step 4-2: 스토리 구현 (반복)

##### 스토리 생성

```
/create-story
```

다음 구현할 스토리 파일이 생성됩니다.

##### 코드 작성

**새 채팅**:

```
/dev-story
```

에이전트가 스토리 파일을 읽고 코드를 작성합니다.

##### 코드 리뷰

```
/code-review
```

- **Approved** → 커밋 후 다음 스토리로
- **Changes requested** → 수정 후 다시 리뷰

##### 다음 스토리

"스토리 생성"으로 돌아가서 반복합니다.

---

## 시나리오 3: 기존 프로젝트에 기능 추가

> 예: "운영 중인 서비스에 알림 기능 추가"

### 규모에 따라 진행

**작은 기능** → [시나리오 1](#시나리오-1-버그-수정--작은-기능-추가-quick-flow) (Quick Flow)

**큰 기능** → [시나리오 2](#시나리오-2-새-프로젝트-시작-bmad-method)의 Phase 1부터 진행

---

## 시나리오 4: 기존 코드 리뷰 및 개선

> 예: "auth 모듈 품질 검토", "레거시 코드 리팩터링 검토"

BMAD의 `/code-review`는 스토리 구현 후 품질 검증 용도입니다.  
기존 패키지의 독립적인 리뷰는 AI에게 직접 요청합니다.

### Step 1: 새 채팅에서 직접 요청

```
src/auth 폴더의 코드를 리뷰해줘.
- 보안 취약점은 없는지
- 성능 개선할 부분은 없는지
- 코드 품질이나 구조적 문제점은 없는지
확인하고 개선점을 정리해줘.
```

### Step 2: 리뷰 결과 확인

에이전트가 분석 결과와 개선점을 제시합니다.

### Step 3: 수정 (선택)

**바로 수정하려면:**

```
지적한 문제점들 수정해줘.
```

**체계적으로 수정하려면:**

[시나리오 1](#시나리오-1-버그-수정--작은-기능-추가-quick-flow)의 Quick Flow를 사용합니다.

---

## 워크플로우 명령어 정리

### Quick Flow (버그픽스, 리팩터링, 소규모 기능)

| 명령어 | 설명 |
|--------|------|
| `/quick-spec` | 기술 사양 생성 (코드베이스 분석 포함) |
| `/quick-dev` | tech-spec 전체를 한 번에 구현 |
| `/code-review` | 코드 리뷰 (선택) |

**Quick Flow 순서**: `/quick-spec` → `/quick-dev` → 끝

### BMad Method (중규모 이상)

#### Phase 1: Analysis (선택)

| 명령어 | 설명 |
|--------|------|
| `/brainstorm-project` | 아이디어 탐색, 접근 방식 제안 |
| `/research` | 시장/기술/경쟁사 리서치 |
| `/product-brief` | 제품 비전 및 전략 정의 |

#### Phase 2: Planning

| 명령어 | 설명 |
|--------|------|
| `/create-prd` | PRD 작성 |

#### Phase 3: Solutioning

| 명령어 | 설명 |
|--------|------|
| `/create-architecture` | 아키텍처 설계 |
| `/create-epics-and-stories` | Epic/Story 분해 |

#### Phase 4: Implementation

| 명령어 | 설명 |
|--------|------|
| `/sprint-planning` | 스프린트 초기화 |
| `/create-story` | 스토리 생성 |
| `/dev-story` | 스토리 구현 |
| `/code-review` | 코드 리뷰 |

### 유틸리티

| 명령어 | 설명 |
|--------|------|
| `/bmad-help` | 도움말 (다음 단계 안내) |
| `/bmad-help [질문]` | 특정 질문에 대한 답변 |

---

## 핵심 원칙

1. **새 채팅에서 시작**: 워크플로우마다 새 채팅을 열어 컨텍스트 오염 방지
2. **한 번에 하나씩**: 스토리 하나를 완료한 후 다음으로 진행
3. **막히면 `/bmad-help`**: 다음 단계를 안내받을 수 있음

---

## `/bmad-help` 활용 예시

```
/bmad-help How should I build a web app for my TShirt Business?
```

```
/bmad-help I just finished the architecture, I am not sure what to do next
```

```
/bmad-help 휴가 관리 시스템을 만들려고 하는데 어떻게 시작해야 해?
```

---

## 참고 링크

- 공식 문서: https://docs.bmad-method.org
- Getting Started: https://docs.bmad-method.org/tutorials/getting-started/
- GitHub: https://github.com/bmad-code-org/BMAD-METHOD