# Delta Debugging — 1-minimal 케이스 축소

Phase 2-2 (L1 재현 가능 케이스)에서 사용한다. 재현된 실패 케이스를 최소화하여 가설 검증 비용을 낮추고 원인 식별 정확도를 높인다.

Andreas Zeller(1999)의 Delta Debugging 알고리즘 기반.

## 알고리즘

```
function dd(D):
  # D: 실패하는 입력/변경 집합
  if |D| == 1:
    return D                              # 1-minimal 도달
  D1, D2 = split(D, 2)
  if test(D1) == FAIL:
    return dd(D1)                         # D1로 좁힘
  if test(D2) == FAIL:
    return dd(D2)                         # D2로 좁힘
  return dd_with_complement(D, D1, D2)    # 양쪽 다 PASS면 더 작게 쪼개기

function dd_with_complement(D, D1, D2):
  # n등분으로 더 작게 쪼개고 보수 집합(complement) 테스트
  for n = 2, 4, 8, ...:
    parts = split(D, n)
    for each part p in parts:
      complement = D - p
      if test(complement) == FAIL:
        return dd(complement)
  return D                                # 더 줄일 수 없음
```

## 적용 대상별 예시

### 1. 입력 데이터

10000행 CSV가 깨뜨림 → 어떤 행이 원인?

1. 5000행 / 5000행 분할 → 첫 5000행에서 실패 재현
2. 2500행 / 2500행 분할 → 두 번째 2500행에서 실패 재현
3. 반복하여 단일 row까지 좁힘

### 2. 코드 변경 (`git bisect`)

100 commit 사이에서 회귀 도입 → 어떤 커밋이 원인?

```bash
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
# 자동으로 중간 커밋 체크아웃
git bisect run pnpm test          # 자동화: 테스트 결과로 good/bad 판정
git bisect reset                   # 종료
```

### 3. 파일/함수

테스트가 깨졌는데 어떤 import가 원인?

1. import의 절반을 주석 처리 → 깨짐 여부 확인
2. 깨진 절반을 다시 절반으로 → 반복
3. 단일 import까지 좁힘

### 4. 코드 라인

수십 줄 변경 후 회귀 → 어느 라인이 깨뜨리는가?

`git diff`로 변경 라인 집합을 만든 뒤, 라인 단위로 dd 알고리즘 적용.

## 종료 조건

- 한 글자/한 줄/한 커밋도 빼지 못하면 minimal
- 시간 제한 (사용자 부담 고려) — 상한선 설정 (예: 10분 또는 20회 반복)

## 함정과 주의사항

### 1-minimal은 globally minimal이 아니다

서로 다른 시작점에서 더 작은 케이스가 가능할 수 있음. 단, 가설 식별 목적에는 1-minimal로 충분.

### Non-deterministic 테스트

결과가 매번 달라지면 Delta Debugging이 작동 불가.

→ L4(간헐 발생)로 분류 후 `references/repro-collab.md`의 L4 절차 적용. Delta Debugging은 deterministic 케이스에서만 사용.

### Side effect

테스트 간 상태가 영향 미치면 매번 clean state로 시작.

- DB: 테스트 시작 시 초기화
- 파일 시스템: 임시 디렉토리 사용
- 네트워크: 모킹 또는 격리된 환경

### Bisect 중 빌드 실패

`git bisect run` 중 빌드 자체가 깨지는 커밋이 있으면 `git bisect skip`으로 건너뛰기.

## ACH 등록

축소된 1-minimal 케이스를 Phase 4 ACH 매트릭스의 증거로 등록.

```
E_n: [출처: Delta Debugging 결과]
"입력 [{age: 10}, {age: 2}] (2개 row)에서만 실패. 1개 row로는 재현 안 됨."
```

이 증거는 가설(예: "정렬 비교 함수 오류")의 C(code) 등급으로 표시.
