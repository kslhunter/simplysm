---
description: Plan 파일의 Phase를 순차 실행
argument-hint: [PLAN파일경로] [--phase N]
---

# /sd:task - Plan 실행

$ARGUMENTS

## 트리거

- `/sd:plan`으로 생성된 계획서 실행
- Phase 단위 구현 작업

## 인수 파싱

| 옵션          | 설명                                      |
|-------------|------------------------------------------|
| (생략)        | 세션에서 작업 중이던 Plan 파일로 계속 진행             |
| `{path}`    | Plan 파일 경로 지정                           |
| `--phase N` | 특정 Phase만 실행 (생략 시 미완료 Phase부터)         |

## 실행 절차

### 1. 진행 상태 확인

**우선순위:**
1. TodoWrite에 `in_progress` 항목 있으면 → 해당 작업 계속
2. 경로 지정 시 → 해당 Plan 파일 로드
3. TodoWrite에 `pending` 항목 있으면 → 해당 Plan 파일로 계속
4. 둘 다 없으면 → `PLAN_*.md` 검색 (여러 개면 선택 요청)

### 2. Plan 파일 동기화

- Plan 파일의 `- [x]` / `- [ ]` 상태와 TodoWrite 상태 동기화
- 불일치 시 Plan 파일 기준으로 TodoWrite 업데이트

### 3. Phase 실행

- 현재 Phase의 첫 `pending` 작업을 `in_progress`로 변경
- **복잡한 작업**: `sequential-thinking`으로 단계별 분석 후 진행
- **코드 탐색 필요 시**: `warpgrep_codebase_search`로 자연어 검색, 세부 검색은 `Grep` + `Glob`
- 해당 Phase의 작업 항목 순차 수행
- 각 작업 완료 시:
  - Plan 파일: `- [ ]` → `- [x]`
  - TodoWrite: `in_progress` → `completed`

### 4. 검증

- Phase의 **검증** 항목 실행 (`/sd:check` 등)
- 실패 시 원인 분석 → 수정 → 재검증

### 5. 완료 보고

- Phase 완료 상태 안내
- 다음 Phase 있으면 사용자 확인 후 진행 (자동 진행 금지)

## 예외 처리

| 상황 | 대응 |
|------|------|
| Plan 파일 없음 | `PLAN_*.md` 검색 → 없으면 `/sd:plan` 안내 |
| Plan 파일 여러 개 | 목록 표시 → 사용자 선택 |
| Phase 검증 실패 | 오류 분석 → 수정 → 재검증 (3회 실패 시 사용자 확인) |
| 작업 항목 모호 | 사용자에게 구체적 지시 요청 |
| 의존성 변경 감지 | 관련 파일 재확인 후 진행 |

## 주의사항

- **Phase 단위 실행**: 한 Phase 완료 후 사용자 확인 필수
- **Plan 파일 동기화**: 작업 완료 시 체크박스 업데이트
- **검증 필수**: Phase 검증 통과 후 다음 단계

## 다음 단계 제안

### Phase 완료 시

AskUserQuestion:

| 질문 | 옵션 |
|------|------|
| "다음 단계를 선택하세요" | `다음 Phase` - 다음 Phase 실행 |
| | `완료` - 작업 중단 |

### 전체 Phase 완료 시

AskUserQuestion:

| 질문              | 옵션                                                     |
|-----------------|--------------------------------------------------------|
| "다음 단계를 선택하세요"  | `Review 수행` - PLAN 삭제 + 관련 REVIEW 삭제 후 `/sd:review` 실행 |
|                 |  `파일 정리 후 종료` - PLAN 삭제 + 관련 REVIEW 삭제 후 종료            |
|                 | `그냥 종료` - 파일 유지하고 종료                                   |

**관련 REVIEW 파일**: PLAN과 같은 대상의 `REVIEW_{대상}_*.md` 파일

## 사용 예시

```bash
/sd:task                           # PLAN_*.md 자동 검색
/sd:task PLAN_MIGRATION.md         # 특정 파일
/sd:task --phase 2                 # Phase 2만 실행
/sd:task PLAN_REFACTOR.md --phase 1
```
