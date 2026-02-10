---
name: sd-api-name-review
description: Use when reviewing a library or module's public API naming for consistency and industry standard alignment - function names, parameter names, option keys, enum values, type names
---

# sd-api-review

## Overview

라이브러리/모듈의 public API 명칭을 업계 표준과 비교하고 내부 일관성을 검토하여 표준화 보고서를 생성한다. 코드 수정 없이 분석만 수행한다.

## 대상 결정

1. args에 경로가 있으면 해당 경로
2. 없으면 사용자에게 대상 경로를 질문

## Phase 1: API 추출

Explore agent로 대상의 public API surface를 추출한다.

- export된 모든 식별자 (함수, 클래스, 타입, 상수 등)
- 사용자가 직접 다루는 파라미터/옵션/설정의 이름과 타입
- 네이밍 패턴 분류 (접두어, 접미어, 동사/형용사/명사 구분, 축약 여부 등)

## Phase 2: 업계 표준 조사

Phase 1 결과를 기반으로 비교 대상과 비교 관점을 결정한다.

1. 추출된 API에서 **반복되는 네이밍 패턴**을 식별한다
2. 대상의 도메인과 기술 스택을 파악하여 **비교할 유사 라이브러리**를 선정한다
3. **병렬 agent**로 각 라이브러리의 공식 문서를 웹 검색/fetch하여 동일 패턴 카테고리의 명칭을 조사한다

## Phase 3: 비교 분석 및 보고서

Phase 1과 Phase 2를 교차 비교하여 보고서를 작성한다.

| 우선순위 | 기준 |
|---------|------|
| **P0** | 조사한 라이브러리 대다수와 불일치 |
| **P1** | 내부 일관성 문제 (같은 의미, 다른 이름) |
| **P2** | 더 적합한 업계 용어 존재 (선택적) |
| **유지** | 이미 표준과 일치 |

각 항목에 현재 명칭, 권장 변경, 근거(라이브러리별 사용 패턴)를 포함한다.

## 완료 조건

보고서를 사용자에게 제시하면 완료. 코드 수정은 하지 않는다.
