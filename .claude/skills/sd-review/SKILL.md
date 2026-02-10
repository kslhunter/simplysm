---
name: sd-review
description: Use when performing a comprehensive code review of a package or path - uses a team of specialized agents with a code explorer as the single source of truth for fact-checking all findings
---

# sd-review

## Overview

패키지 또는 지정 경로의 코드를 다각도로 리뷰하여 종합 보고서를 생성한다. **코드 수정 없이 분석만 수행한다.**

Team 기반으로 동작한다. Explorer가 코드를 읽고 분석 결과를 공유하면, Reviewer들이 그 분석을 기반으로 이슈를 발견하고, Explorer에게 검증을 요청한다. Reviewer들은 코드를 직접 읽지 않는다.

## 사용법

- `/sd-review packages/solid` — 특정 경로의 소스코드 리뷰
- `/sd-review` — 인자 없으면 사용자에게 대상 경로를 질문

## 대상 결정

1. `$ARGUMENTS`에 경로가 있으면 해당 경로
2. 없으면 사용자에게 대상 경로를 질문

## 팀 구성

TeamCreate로 팀을 생성하고, 다음 4명의 teammate를 Task tool로 spawn한다:

| 이름 | Agent 타입 | 역할 |
|------|-----------|------|
| **explorer** | `feature-dev:code-explorer` | 코드 분석, 질문 응답, 팩트체크 (코드를 읽는 유일한 agent) |
| **code-reviewer** | `feature-dev:code-reviewer` | 버그, 보안, 로직 오류, 컨벤션 리뷰 |
| **simplifier** | `code-simplifier:code-simplifier` | 복잡성, 중복, 가독성 리뷰 |
| **dx-reviewer** | `sd-api-reviewer` | DX/사용성, 네이밍, 타입 힌트 리뷰 |

## 워크플로우

### Step 1: Explorer가 코드 분석

리더가 explorer에게 대상 경로의 코드 분석을 요청한다:
- 모듈 구조, 의존성 관계, 아키텍처 레이어
- 주요 실행 흐름, 데이터 변환 경로
- 에러 처리 패턴, public API surface
- **코드 수정 금지, 분석 결과만 반환**

Explorer의 분석이 완료되면 리더가 결과를 수신한다.

### Step 2: Reviewer들에게 분석 결과 전달

리더가 Explorer의 분석 결과를 3명의 reviewer에게 각각 SendMessage로 전달한다. 각 reviewer에게 다음을 지시한다:

- **code-reviewer**: 분석 결과를 기반으로 버그, 보안 취약점, 로직 오류, 컨벤션 이슈를 찾아라. 코드를 직접 읽지 말고, 확인이 필요하면 explorer에게 질문하라.
- **simplifier**: 분석 결과를 기반으로 불필요한 복잡성, 코드 중복, 가독성 이슈를 찾아라. 코드를 직접 읽지 말고, 확인이 필요하면 explorer에게 질문하라. **코드 수정 금지.**
- **dx-reviewer**: 분석 결과를 기반으로 API 직관성, 네이밍 일관성, 타입 힌트, 에러 메시지, 설정 복잡도를 리뷰하라. 코드를 직접 읽지 말고, 확인이 필요하면 explorer에게 질문하라.

### Step 3: Reviewer ↔ Explorer 대화

각 reviewer가 이슈를 발견하면 explorer에게 SendMessage로 검증을 요청한다:
- Reviewer: "X 파일에서 Y 이슈가 있는 것 같다"
- Explorer: 해당 코드를 직접 Read/Grep하여 확인 후 판정
  - **유효**: 실제로 문제 있음
  - **무효 — 이미 구현됨**: 다른 위치에서 이미 처리됨 (근거 제시)
  - **무효 — 의도된 패턴**: 설계상 의도된 구조
  - **무효 — 오인**: 코드를 잘못 해석한 지적

Reviewer는 검증된 findings만 최종 보고로 리더에게 전달한다.

### Step 4: 종합 보고서

리더가 3명의 reviewer로부터 **검증 완료된 findings**를 수집하여 종합 보고서를 작성한다.

### 보고서 구조

| 섹션 | 우선순위 | 출처 |
|------|---------|------|
| **아키텍처 요약** | — | Explorer 분석 결과 |
| **심각도 높은 이슈** | P0 | 버그, 보안 취약점 |
| **품질 이슈** | P1 | 로직 오류, 에러 처리 누락, 성능 |
| **DX/사용성 이슈** | P2 | API 직관성, 네이밍, 타입 힌트 |
| **단순화 기회** | P3 | 복잡성 제거, 중복 코드, 추상화 |
| **컨벤션 이슈** | P4 | 프로젝트 컨벤션 불일치 |

각 이슈에는 **파일:라인**, **설명**, **제안**을 포함한다.

선택적으로 **무효 판정 요약**도 부록으로 포함하여 어떤 지적이 걸러졌는지 투명하게 보여준다.

### Step 5: 팀 종료

보고서 작성 후 모든 teammate에게 shutdown_request를 보내고 TeamDelete로 정리한다.

## 완료 조건

종합 보고서를 사용자에게 제시하면 완료. 코드 수정은 하지 않는다.
