# overview.md 템플릿 (세션 차원)

세션 폴더 안에 위치 (`.specs/{yyMMddHHmmss}/overview.md`).
spec 단계 워크플로 4번(전체 구조 잡기)에서 초안 작성. 이후 REQ 추가/폐기/분리/병합/번호 재배치/의존성 변경 시 즉시 갱신.

## 템플릿

```markdown
# Session {yyMMddHHmmss}

## 메타
- 생성일: YYYY-MM-DD HH:MM
- raw input 출처: <어디서 왔는지 — 폴더 경로/파일/채팅 paste 등>
- 입력 모드: Bulk | Direct | Mixed

## 요약
<세션 전체에 대한 1~2줄 요약>

## REQ 목록
- REQ-001-slug: <한 줄 요약>
- REQ-002-slug: <한 줄 요약>
- REQ-003-slug: <한 줄 요약>

## DEMO 매핑 (있을 때만)
<DEMO ↔ 대상 REQ 인덱스. demo 단계가 추가/갱신>
- DEMO-001-slug: REQ-001, REQ-002 (상태: done)
- DEMO-002-slug: REQ-003 (상태: demo-ready)

## 도메인 그룹 (있을 때만)
<같은 도메인의 REQ들이 명확히 묶이면 표시>
- RTP: REQ-001, REQ-002
- WMS: REQ-003

## 의존성 (있을 때만)
- REQ-002 depends on REQ-001 (이유)
- REQ-003 depends on REQ-001 (이유)

## Cross-cutting concerns (있을 때만)
<여러 REQ를 가로지르는 메모. 예: "전체적으로 권한 체계 개편 필요">
```

## 섹션별 역할

| 섹션 | 용도 |
|---|---|
| `## 메타` | 세션 시작 시점/입력 출처/모드 |
| `## 요약` | 세션 전체 1~2줄 |
| `## REQ 목록` | 세션 안의 모든 REQ를 한눈에 |
| `## DEMO 매핑` | DEMO ↔ REQ 인덱스 + 상태 (있을 때만, demo 단계가 갱신) |
| `## 도메인 그룹` | 도메인 명확할 때 grouping (선택) |
| `## 의존성` | REQ 간 의존 (선택) |
| `## Cross-cutting concerns` | 가로지르는 메모 (선택) |

## 갱신 정책

- 초안: spec 워크플로 4번(전체 구조 잡기)
- 갱신 책임:
  - spec: REQ 변경(추가/폐기/분리/병합/번호 재배치/의존성)
  - demo: DEMO 생성·상태 변경(`demo-ready`/`done`/매핑 변경) 시 `## DEMO 매핑` 갱신
  - plan: spec 모순 발견 시 갱신

## 도메인 그룹/의존성 표기 정책

- **도메인 그룹**: 명확히 묶이는 경우만 표시. 단일 REQ는 grouping 생략.
- **의존성**: 한 REQ가 다른 REQ에 의존할 때만 표시. 독립 REQ는 표시 X.

## 예시

```markdown
# Session 20260503143025

## 메타
- 생성일: 2026-05-03 14:30
- raw input 출처: .docs/ 폴더 (메일 6개 + 회의록 5개)
- 입력 모드: Bulk

## 요약
ADTEK WMS 입고/출고 관련 5개 기능 개선 요청 정리.

## REQ 목록
- REQ-001-입고지시서수정: 긴급 표시 체크박스 + PDF 강조
- REQ-002-입고지시서Reporting: 입고 보고서 출력 기능
- REQ-003-출고관리상차: 상차 상태 추가
- REQ-004-WMS권한: 권한 체계 개편
- REQ-005-알림: 긴급 입고 시 알림

## DEMO 매핑
- DEMO-001-입고지시서: REQ-001, REQ-002 (상태: done)
- DEMO-002-출고상차: REQ-003 (상태: demo-ready)

## 도메인 그룹
- 입고: REQ-001, REQ-002
- 출고: REQ-003
- 시스템: REQ-004, REQ-005

## 의존성
- REQ-005 depends on REQ-001 (긴급 표시 후 알림)
```
