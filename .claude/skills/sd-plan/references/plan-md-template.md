# plan.md 템플릿

위치: `.specs/{yyMMdd_HHmmss}/REQ-XXX-슬러그/plan.md`

## 템플릿

```markdown
# REQ-001-슬러그 / Plan

## 메타
- 상태: planning | planned
- 생성일: YYYY-MM-DD
- 마지막 갱신: YYYY-MM-DD
- 결과: proceed | skip-to-verify

## 결과 사유
<proceed/skip 결정 근거 한두 줄>

## R 단위 계획
- [ ] R1: <요구 제목>
  - **현황**: 구현 / 부분 / 미구현 / 차이있음 (사유)
    - 근거: <항상 명시. 사용자 답변 (YYYY-MM-DD) / 코드경로:L범위 등>
  - **설계**: (UI/API/데이터 모델/외부 연동에서 필요. 단순 변경은 생략)
    - <자연어 우선. UI에 demo.md 있으면 "demo.md 참조" + 추가 결정 사항만>
    - 근거: <항상 명시>
  - **변경 위치**:
    - `<파일경로>` - `<함수/컴포넌트명>`
    - 근거: <항상 명시>
  - **변경 방식**:
    - <자연어 변경 방식>
    - 근거: <항상 명시>
  - **테스트**:
    - 방식: TDD / 사후 / 생략
    - 케이스: <시나리오>
    - 근거: <항상 명시. 모드 결정 출처>
  - [ ] **Q**: <확인 필요 사항> (있을 때만)

- [ ] R2: ...

## 작업 순서
- **의존**:
  - R3는 R1에 의존 (사유)
  - R2는 독립
- **권장 순서**: R1, R2, R3
- **병렬 가능**: R1과 R2

## 통합/E2E 테스트
- <시나리오 1>
- <시나리오 2>
```

## 섹션별 역할

| 섹션 | 용도 |
|---|---|
| `## 메타` | 상태, 결과 분기 |
| `## 결과 사유` | 분기 결정 근거 |
| `## R 단위 계획` | R별 현황/변경/테스트 인라인 통합 |
| `## 작업 순서` | R 간 의존성, 권장 순서, 병렬 가능 |
| `## 통합/E2E 테스트` | R 간 흐름 검증 |

## R 항목 내부 요소

| 요소 | 의미 |
|---|---|
| **현황** | 4단계 분류 (구현/부분/미구현/차이있음) |
| **설계** | (R 성격별 조건부) UI 레이아웃·이벤트 흐름 / API 엔드포인트·스키마 / 데이터 모델 / 외부 연동 시퀀스. 단순 변경은 생략 |
| **변경 위치** | 파일 경로 + 함수/컴포넌트 이름 (라인 번호 X) |
| **변경 방식** | 자연어. 복잡한 로직만 의사코드 |
| **테스트** | 방식(TDD/사후/생략) + 케이스 |
| **Q** | (있을 때만) 사용자 확인 필요 |

각 요소(현황/설계/변경 위치/변경 방식/테스트) 아래에 들여쓴 `근거:` 줄로 출처를 항상 한 줄 명시한다.

## 예시

```markdown
- [ ] R1: 입고지시서 관리 화면 — 좌우 분할, 우측 신규 등록 시 품목 선택 모달
  - **현황**: 미구현
    - 근거: src/pages/ 전수 grep 결과 InboundOrder 관련 파일 없음
  - **설계**:
    - 레이아웃: 좌측 입고지시서 목록(검색/페이징), 우측 선택 항목 상세 폼. 우상단 [+ 신규] 버튼.
    - 이벤트 흐름:
      - [+ 신규] 클릭 → 우측 폼 빈 상태로 초기화 → 폼 안 [품목 선택] 버튼 클릭 → 품목 선택 모달 오픈
      - 모달에서 품목 선택 → 닫힘 → 폼의 품목 영역에 반영
      - [저장] 클릭 → 검증 통과 시 API 호출 → 성공하면 좌측 목록에 새 항목 추가 + 우측 폼 그대로 유지(편집 모드)
    - 상태: `selectedId | null`, `formMode = 'create' | 'edit'`, `pickerOpen`
    - 근거: DEMO-001 demo.md 시나리오 그대로
  - **변경 위치**:
    - `src/pages/InboundOrder.tsx` - `InboundOrderPage` (분할 레이아웃)
    - `src/pages/InboundOrder/PickerModal.tsx` - 신규 (품목 선택 모달)
    - 근거: src/pages/Outbound.tsx:L10-L40 동일 좌우 분할 패턴
  - **변경 방식**:
    - 좌측은 기존 `InboundOrderList` 재사용, 우측은 `InboundOrderForm`을 페이지에 직접 임베드.
    - 근거: 사용자 답변 (2026-05-04)
  - **테스트**:
    - 방식: 사후 테스트 (UI)
    - 케이스: 신규 → 품목 선택 → 저장 → 좌측 목록 반영 확인
    - 근거: UI 동작 → TDD 불가, 사후 검증 가능

- [ ] R2: 입고지시서 저장 API
  - **현황**: 미구현
    - 근거: src/server/routes/ 에 inbound-order 라우트 파일 없음
  - **설계**:
    - 엔드포인트: `POST /api/inbound-orders`
    - 요청: `{ itemId: string, quantity: number, urgent: boolean, note?: string }`
    - 응답 200: `{ id: string, createdAt: string }`
    - 에러: 400(검증 실패 — 필드별 메시지), 401(미인증), 409(중복 키)
    - 권한: `inbound-order.write` 롤 필요
    - 근거: 사용자 답변 (2026-05-04, 권한·중복 키 정책)
  - **변경 위치**:
    - `src/server/routes/inbound-order.ts` - `registerInboundOrderRoutes`
    - `src/server/services/inbound-order-service.ts` - `createInboundOrder`
    - 근거: src/server/routes/outbound.ts:L1-L30 동일 라우트·서비스 분리 패턴
  - **변경 방식**:
    - 라우트는 zod 스키마 검증 → 서비스 호출 → 결과 반환. 트랜잭션은 서비스 레이어.
    - 근거: src/server/services/outbound-service.ts:L20 동일 트랜잭션 위치 패턴
  - **테스트**:
    - 방식: TDD
    - 케이스: 정상 생성 / 필수 누락 400 / 권한 없음 401 / 중복 409
    - 근거: 입력→출력 단언 가능 → TDD

- [ ] R3: 긴급 표시 PDF 빨간색 강조
  - **현황**: 부분 (PDF 출력 로직 있음, 색상 처리 없음)
    - 근거: src/pdf/InboundOrderPdf.tsx:L40-L88 `renderHeader` 색상 분기 없음
  - **변경 위치**:
    - `src/pdf/InboundOrderPdf.tsx` - `renderHeader` 함수
    - 근거: 색상 분기 들어갈 유일한 함수
  - **변경 방식**:
    - urgent === true 인 경우 헤더 배경색 #D32F2F 적용
    - 근거: spec.md R2 A "PDF는 #D32F2F"
  - **테스트**:
    - 방식: 사후 테스트
    - 케이스: 긴급 표시된 데이터 PDF 출력 → 빨간색 확인
    - 근거: PDF 렌더 결과 픽셀 검증 비용 큼 → TDD 대신 사후
```

R1(UI), R2(API)는 성격에 따라 **설계** 추가, R3(단순 변경)은 생략.
