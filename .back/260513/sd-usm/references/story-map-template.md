# story-map.md 템플릿

`.story-maps/{yyMMddHHmmss}_{slug}/story-map.md`

## 템플릿

````markdown
# Story Map {yyMMddHHmmss}_{slug}

## 메타
- 생성일: YYYY-MM-DD HH:MM
- Requirement Source: <경로>

## Frame
- Persona: <단일이면 한 줄, 복수면 list>
- Outcome: <Persona 가 이 Mapping 으로 얻는 결과>
  - 근거: 사용자 답변 (YYYY-MM-DD)
- [ ] **Open Question**: <확인 필요 사항>

## Business Flow (업무 프로세스(다중 actor·분기·트리거·데이터 흐름)일 때만 작성.)

```mermaid
flowchart LR
    S([<트리거>]):::msg --> T1[<수행자>: <작업>]
    T1 -- creates --> D1[(<산출물>)]
    T1 --> T2[<수행자>: <작업>] --> G1{{AND-split}}
    G1 --> E1([<종료>])
    G1 --> E2([<외부 통보>]):::msg
    classDef msg stroke-dasharray: 5 5
```

## Walking Skeleton

### A1. <Activity 이름>

| 순서 | Task | 한 줄 요약 |
|---|---|---|
| 1 | TASK-001-<slug> | <요약> |
| 2 | TASK-002-<slug> | <요약> |

### A2. <Activity 이름>

| 순서 | Task | 한 줄 요약 |
|---|---|---|
| 1 | TASK-003-<slug> | <요약> |
| 2 | TASK-004-<slug> | <요약> |
````

## Business Flow 작성 규칙

- **시점**: 최종 사용자(business actor) 관점의 end-to-end 흐름. 시스템 내부 로직(데이터 변환·CRUD·검증 분기·서버 처리 등)은 쓰지 않음.
- **단위**: 한 프로세스 = 한 업무 단위(도메인 그룹·직무 흐름). 단위 작업(파일 1건·화면 1건·버튼 1개 등)을 별개 프로세스로 쪼개지 말 것.
- **구성**: Mermaid 다이어그램만.

### Mermaid 표기 규칙

- 노드 라벨 prefix `[<수행자>: <동작>]` (수행자는 Frame Persona/이해관계자에 정의된 역할)
- `[(...)]` = 데이터 객체, 점선 `-.uses.->` = 데이터 사용
- `{{AND-split}}` / `{{AND-join}}` = 병렬 게이트웨이
- `{XOR-split}` / `{XOR-join}` = 배타 게이트웨이 (조건 라벨 동반)
- `:::msg` 클래스 = 메시지 이벤트 (외부 시스템 송수신)

### 예시 (입고)

````
```mermaid
flowchart LR
    S([ERP 입고의뢰]):::msg --> T1[WEB: 입고지시 작성]
    T1 -- creates --> D1[(입고지시서)]
    T1 --> T2[WEB: 바코드 출력]
    T2 -- creates --> D2[(바코드 라벨)]
    D1 -.uses.-> T3[PDA: 입고지시 확인]
    T2 --> T3 --> T4[PDA: 바코드 부착]
    D2 -.uses.-> T4
    T4 --> T5[PDA: 입고 스캔/등록] --> G1{{AND-split}}
    G1 --> E1([입고처리 완료])
    G1 --> E2([ERP 입고의뢰 완료]):::msg
    classDef msg stroke-dasharray: 5 5
```
````
