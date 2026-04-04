# 디버그: Table() 양방향 관계(FK↔FKTarget)에서 TS7022 순환 참조 에러

## 출처

- **origin:** `kslhunter/simplysm#14`
- **완료 시 참고:** 재현 불가 판정으로 이슈 close 및 comment 필요

## 에러 증상

- **에러 메시지:** `TS7022: 'User' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.`
- **위치:** `User.ts:4:14`, `UserConfig.ts:4:14`
- **재현:** 두 파일에서 양방향 FK↔FKTarget 관계 정의 후 `tsc --noEmit` 실행

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: v13/v14 소스 diff | E2: v14 테스트 모델 타입체크 | E3: npm 14.0.15로 재현 | E4: TS lazy 추론 |
|----|----------------------|--------------------------|----------------------|-----------------|
| H1: v13→v14 마이그레이션 시 타입 변경 | I → 폐기 | I → 폐기 | I → 폐기 | N |
| H2: TS lazy 추론이 순환 참조 처리 실패 | N | I → 폐기 | I → 폐기 | I → 폐기 |
| H3: 리포터 프로젝트 고유 환경 문제 | N | N | C(infer) | C(infer) |

### 결과: 미확정 — H3

C(infer)만 존재하여 확정 불가.

검증 내용:
- v13/v14 소스 diff: 주석(영→한 번역)만 변경, 로직/타입 시그니처 동일
- v14 테스트 모델(`User↔Post` 양방향 관계): 타입체크 통과
- npm `@simplysm/orm-common@14.0.15` + TypeScript 5.9.3: 이슈 재현 코드로 **에러 미발생**
- TypeScript는 `() => Table` lazy 패턴에서 `TableBuilder<any, any>` 제약만 검증하며, 대상 타입의 전체 해석 없이 구조적으로 판단

## 해결 방안

### 원인 1: 이슈 리포터의 프로젝트 고유 설정 문제

- **반론:** 리포터의 환경을 직접 확인 불가

- 1.1 이슈에 재현 프로젝트 요청: 정확성 9, 안정성 10 → **평균 9.5/10**
- 1.2 이슈 클로즈 (재현 불가 판정): 정확성 5, 안정성 8 → **평균 6.5/10**

### 원인 2: $inferSelect 재귀적 타입 해석이 특정 조건에서 순환 참조 유발

- **반론:** TS 5.9.3에서 lazy 패턴 정상 동작 확인

- 2.1 README 가이드 추가: 정확성 6, 안정성 8 → **평균 7/10**
- 2.2 재귀 깊이 제한: 정확성 4, 안정성 6 → **평균 5/10**

## 선택 결과

**1.2 이슈 클로즈** (평균 6.5/10)

사용자 판단: 재현 불가 상태에서 이슈를 열어둘 이유 없음. 클로즈 처리.
