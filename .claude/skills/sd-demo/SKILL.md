---
name: sd-demo
description: spec.md(요구사항) 기반으로 UI scaffold를 메인 코드베이스에 작성하고 산출물 소비자 시연용 demo.md를 생성하는 스킬. Use when 산출물 소비자에게 화면을 시연해 spec 검증이 필요할 때 (선택적 단계, spec과 plan 사이)
---

# demo 단계

spec.md 1+ REQ → UI scaffold(메인 코드베이스 직접) + demo.md(시나리오/만든 파일/라운드 기록).
production의 첫 단계 (throwaway 아님). plan/implement가 그 위에 기능을 입힘.

## 산출물

```
src/                                ← UI scaffold (메인 코드베이스 직접)
  pages/<신규>.tsx
  data/mock-<도메인>.ts             ← mock data 별도 파일

.specs/{yyMMddHHmmss}/DEMO-001-slug/
  demo.md                           ← 시나리오 / 만든 파일 / Mock 요약 / 피드백 라운드
```

세션 폴더(`{yyMMddHHmmss}`)는 spec 단계의 결과를 그대로 사용 (이미 존재).

## 워크플로

1. 입력 받기: 대상 REQ ID 목록 (예: `REQ-001`, 또는 여러 개)

2. 대상 REQ들의 spec.md 읽기 + 코드베이스(디자인 시스템 등) 파악

3. DEMO ID 부여(세션 폴더 내 `DEMO-001`부터 순번, slug: 한글) + 디렉토리/demo.md 초안(메타) 생성 + overview.md `## DEMO 매핑`에 `DEMO-XXX-slug: REQ-XXX, ... (상태: drafting)` 추가 (섹션 없으면 신규 생성)

4. UI scaffold 작성 (메인 코드베이스 직접)
   - 페이지 + 컴포넌트 배치 (디자인 시스템 활용)
   - mock data는 별도 파일 + `MOCK_` prefix + 상단 주석
   - 데모 흐름 필수 인터랙션만 (페이지 이동/폼 입력 시각/클릭 반응)
   - 결정거리(레이아웃 구조, 영역 배치, 요소 흐름 등) 모호 → 한 번에 하나씩 Q → 답변 즉시 반영

5. demo.md 잔여 섹션 채움 (시나리오 / 만든 파일 / Mock Data 요약). 템플릿: [references/demo-md-template.md](references/demo-md-template.md)

6. Q 다이얼로그 (잔여, 한 번에 하나씩) → 사용자 답변 → 즉시 갱신

7. demo 작성 끝 → 메타 `상태: demo-ready` (overview `## DEMO 매핑` 동기화) → 사용자에게 시연 알림

8. 사용자가 피드백 가져옴 → 메타 `상태: reviewing` (overview 동기화)

9. 피드백 분류 (UI 조정 / spec 변경 / 모호) — 사용자 확정
    - UI 조정 → demo 코드 수정
    - spec 변경 (R 단위) → spec.md 수정 + 메타 `이력` 기록
    - REQ 구조 변경(분리/병합) → spec 재진입 후보 알림 (demo 단독 처리 X)

10. 라운드 기록 (append-only) → "다음 라운드? 종료?"
    - 다음 → 7번으로
    - 종료 → demo.md 형식 점검 (시나리오 / 만든 파일 / 라운드 / 메타) → 역방향 자잘 갱신 → 메타 `상태: done` (overview 동기화)

## 책임 범위

만들 것: 페이지 레이아웃·컴포넌트 배치 / mock data 표시 / 페이지 이동·폼 입력 시각·클릭 반응

만들지 말 것: 실제 데이터 저장·삭제·수정 / API 호출(mock 포함) / 비즈니스 로직 / 인증·권한 처리

원칙: **말로 설명할 수 있는 건 만들지 않는다**

## Mock Data 정책 (3중 강한 표시)

```typescript
// src/data/mock-rtp.ts
// MOCK DATA - replaced in implement stage
export const MOCK_RTP_LIST = [...]
```

- 반드시 별도 파일 (페이지 inline 금지)
- 변수/상수 `MOCK_` prefix 필수
- 파일 상단 주석에 `MOCK` 키워드 필수

## 핵심 원칙

- self-contained 블록 (라운드 단위 demo.md)
- raw input 불변
- ID 불변 (DEMO-001 = 영원히 DEMO-001)
- 자동 판단 금지 (피드백 분류는 사용자)
- 한 번에 하나씩 Q

## 안티패턴

- ❌ throwaway로 만들기 (production 첫 단계)
- ❌ 실제 데이터 처리 로직 (저장/삭제/계산)
- ❌ Mock data를 페이지 inline에 굳히기
- ❌ 피드백 분류 자동 결정
- ❌ REQ 구조 변경을 demo 단독 처리
- ❌ 라운드 기록 누락
- ❌ 종료 결정 직후 demo.md 형식 점검 없이 done 전환
- ❌ DEMO 생성·상태 변경 시 overview `## DEMO 매핑` 갱신 누락
