# REQ-001-union-array연산자-의미정리 / Verify

## 메타
- 상태: verified
- 생성일: 2026-05-07
- 마지막 갱신: 2026-05-07

## 검증 결과

### 코드 변경 검증
- `packages/orm-common/src/exec/queryable.ts` 에서 `Array.isArray(this.meta.from)` 패턴 grep 결과 **0건** — 14개 메서드의 분배 분기 모두 삭제 확인 ✓
- 14개 메서드(select/where/search/orderBy/limit/top/distinct/groupBy/having/lock/join/joinSingle/include/recursive) 일반 분기 그대로 유지 — union 결과 위 호출 시 일반 분기로 흘러가 외부 적용
- `.claude/references/sd-simplysm14/orm-union.md` 외부 적용 단일 룰 노트 추가 확인 ✓

### 테스트 직접 실행
- `pnpm exec vitest run --project node packages/orm-common/tests/select/subquery.spec.ts packages/orm-common/tests/select/order.spec.ts` → 102/102 PASS
- `pnpm exec vitest run --project node packages/orm-common/tests/` → 956/956 PASS (orm-common 단위 전체)
- impl.md 보고와 일치 ✓

## R 단위 충족 판정

### R1: union 결과 fluent 연산자의 의미 — 단일 룰 확정
- **판정**: 충족
- **근거**: 의미 정의 + spec/plan 의 영향 메서드 카운트 텍스트 정정 완료(13 → 14, 사용자 결정 A).

### R2: 외부 적용 동작 변경 — array-from 분배 분기 제거
- **판정**: 충족
- **근거**: 14개 메서드 분배 분기 모두 삭제 (코드 grep 0건). R4 의 9 신규 + 2 기존 갱신 케이스가 외부 적용 SQL 형태를 검증 (33 PASS).

### R3: ~~분배 유지 연산자의 회귀 보존~~
- **판정**: 충족 (spec 단계서 dropped, R1 단일 룰로 흡수)

### R4: 회귀 테스트 범위
- **판정**: 충족
- **근거**: plan R4 텍스트를 "9 신규 + 2 기존 갱신 = 11 케이스, recursive/include 는 실용성 부재로 미작성, 다른 메서드 검증으로 갈음"으로 정합 (사용자 결정 A). 분기 일괄 삭제 본질이라 한 메서드 검증이 곧 다른 메서드 검증.

### R5: 호환성·영향 범위 점검
- **판정**: 충족
- **근거**: 가이드 외부 적용 노트 추가. 모노레포 내 사용처 grep 결과 영향 범위 R4 갱신 + 무영향 사용처 명시. 전체 회귀 6670/6670 PASS.

## 발견·제안 (해소됨)

### 발견 1: spec.md R1 의 카운트 텍스트 "13개" — 실제 14개 → 해소
- **결정**: A — spec.md / plan.md 의 텍스트 "13개" → "14개" 로 정정. spec.md R1 본문 + 근거 줄 + R2 본문 정정 완료. plan.md R2 현황 근거 정정 완료.

### 발견 2: plan R4 "13개 케이스" 약속 vs impl 11 케이스 작성 → 해소
- **결정**: A — plan R4 의 케이스 작성 전략·신규 목록을 "11 케이스 (recursive/include 미작성, 다른 메서드 검증으로 갈음)" 로 정합 맞춤. plan.md R4 변경 방식 + 신규 목록 정정 완료.

## 시연
- 모든 R 의 plan 모드 = TDD → 시연 불필요.
