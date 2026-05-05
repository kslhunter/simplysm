# DB 모델 변경 표 작성 가이드

엔티티 섹션 안에 작성. 신규/수정 모델·컬럼·관계·인덱스를 하나의 매트릭스로 정리한다.

## 표현 형식

| 모델 | 변경 종류 | 컬럼·내용 | 인덱스 |
|---|---|---|---|

컬럼 단위 표현이 더 명확하면 컬럼 단위 행으로 풀어 쓴다.

## 작성 원칙

- 변경 종류: `신규` / `컬럼 추가` / `컬럼 수정` / `컬럼 삭제` / `인덱스 추가/삭제` / `관계 변경`
- 컬럼은 타입·NULL 여부·기본값·외래키·`ON DELETE` 동작을 모두 명시.
- 인덱스는 단일/복합 구분, 사용 목적(조회 빈번 컬럼) 명시.
- 외래키는 `FK → {대상모델}.{컬럼}` 형식. 카스케이드 동작 명시.
- 컬럼 길이·정밀도는 도메인 값 범위에 충분한지 검토 후 결정.

## 좋은 예 (작업 등록)

| 모델 | 변경 | 컬럼·내용 | 인덱스 |
|---|---|---|---|
| `Work` | 신규 | `id (uuid, PK)`, `title (varchar 200, NOT NULL)`, `dueDate (date, NULL)`, `assigneeId (uuid, NOT NULL, FK → User.id)`, `status (varchar 20, NOT NULL, default 'pending')`, `createdAt (datetime, NOT NULL, default NOW())` | `assigneeId`, `status` |
| `WorkLog` | 신규 | `id (uuid, PK)`, `workId (uuid, NOT NULL, FK → Work.id, ON DELETE CASCADE)`, `userId (uuid, NOT NULL, FK → User.id)`, `action (varchar 20)`, `createdAt (datetime, NOT NULL, default NOW())` | `workId`, `userId` |
| `User` | 컬럼 추가 | `lastWorkAt (datetime, NULL)` | — |

## 검증 체크리스트

작성 후 다음을 확인한다.

- 모든 외래키에 `ON DELETE` 동작 명시했는가 (`CASCADE` / `RESTRICT` / `SET NULL`)
- 조회 빈번한 컬럼에 인덱스가 있는가
- `NOT NULL` 컬럼에 기본값이 있거나 INSERT 시 반드시 채워지는가
- 신규 테이블의 PK가 정의됐는가
- 컬럼 타입·길이가 도메인 값 범위에 충분한가
- 복합 유일 제약(unique)이 필요한 케이스를 놓치지 않았는가

## 나쁜 예

- "Work 테이블 추가" — 컬럼 누락
- 외래키 동작 명시 안 함 — `ON DELETE CASCADE` vs `RESTRICT` vs `SET NULL` 모호
- 인덱스 누락 — 조회 자주 하는 컬럼인데 INDEX 없음
- `NOT NULL`인데 기본값·INSERT 경로 모호 (마이그레이션 시 실패 위험)
- 길이 미정 (`varchar`만 적고 길이 없음)
