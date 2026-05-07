---
name: sd-spec
description: raw input(메일/회의록/사용자 요청)을 구조화된 REQ로 정리해 spec.md 산출물로 만드는 스킬. Use when 산출물 소비자 요청을 구조화하거나 새 기능 요구사항을 정리할 때
---

# spec 단계

raw input → 세션 폴더 + REQ별 spec.md 생성. 사용자와 다이얼로그로 Q를 풀어가며 specified 도달.

## 핵심 원칙

- **self-contained 블록**: R 블록 안에 인용/A/Q 인라인. (별도 파일/섹션 분리 X)
- **raw input 불변**: 어디 있든 수정·보정 X.
- **Append-only**: R/REQ 자체 삭제 X. 폐기는 dropped 상태. 번호 재배치는 허용.
- **자동 판단 금지**: 결정 근거 없으면 Q 등록. 모든 A에 근거 출처 명시.
- **한 번에 하나씩 Q**: REQ 번호 순.
- **즉시 갱신**: 매 답변마다 spec.md 갱신.
- **체크리스트 유지**: R 항목 산문화 X.
- **인용 출처 명시**: 파일경로:L범위 또는 채팅 paste + 일자.
- **단계 전환 동의**: 5→6, 6단계 안 REQ 전환 모두 사용자 동의 후.
- **specified 전환 전 전체 재검토**: 마지막 Q 답변 직후 전체 재검토 없이 specified 전환 X.

## 입력 형태 (raw input 모드)

| 형태 | 설명 |
|---|---|
| Bulk | 다중 출처 → 분류 작업 |
| Direct | 1줄~몇 줄 요청 → cascading implications 발굴 |
| Mixed | 둘 다 (분류 + 확장 병행) |

## 산출물 구조

```
.specs/
  {yyMMdd_HHmmss}/                       ← 세션 폴더
    overview.md
    REQ-001-슬러그/
      spec.md
```

- 세션 폴더명 = `6자리 숫자 + "_" + 6자리 숫자` Bash(`date +%y%m%d_%H%M%S`)
- REQ ID = `REQ-001` ... 슬러그는 한글 OK

## REQ 상태 (spec 단계 한정)

전체 라이프사이클은 spec.md 메타 참조. spec 단계가 다루는 4개:

| 상태 | 진입 조건 |
|---|---|
| draft | spec.md 생성 직후 |
| specifying | Q/A 진행 중 |
| specified | REQ 종료 통과 (Q 0개 + 전체 재검토) |
| dropped | 사용자 합의로 폐기 |

## 워크플로

1. 세션 폴더 `.specs/{yyMMdd_HHmmss}/` 생성 (raw input 모드만)

2. raw input 읽기 — **불변**. STT 오타/화자 추정/모호 발화: [references/raw-input-handling.md](references/raw-input-handling.md)

3. 입력 형태 식별 (Bulk/Direct/Mixed)

4. overview.md 초안 + **도메인 검토 게이트** — 도메인 구성/순서 노출 → 합의 → 확정. 도메인 1개면 생략. REQ 디테일은 5단계 게이트에서. [references/overview-md-template.md](references/overview-md-template.md)

5. REQ별 spec.md 작성 — 도메인 순서대로. 한 도메인 완료 → 다음 도메인 REQ 게이트로. **모든 도메인 5단계 완료 전 6단계 진입 금지.** [references/spec-md-template.md](references/spec-md-template.md)

   **REQ 분할/순서**
   - 분할 기준: 한 화면 / 독립 동작 가능 기능 / 응집된 입력·처리·출력 단위. 분할 모호 시 최대한 분할.
   - 도메인 자기 완결: 각 도메인 REQ는 그 도메인이 자기 시점에 동작하기 위한 최소 구현. 뒷 도메인에서 쓸 것을 미리 챙기지 않음. 뒷 도메인 진입 시 앞 도메인 산출물 확장이 필요하면 그 도메인의 증분 REQ로 정의.
   - REQ 검토 게이트: 각 도메인 첫 REQ 진입 시, REQ 구성/관계/순서를 도메인 성격에 맞춰 표현 → 합의 → 즉시 파급효과 반영 → spec.md 작성.

   **모드별 처리**
   - Bulk/Mixed: R 항목 추출 + 매핑 검증 + 충돌/모호 → Q 등록.
   - Direct: 코드베이스 분석 + cascading implications → Q 등록.

   **변경 시 동기화**
   - 의존성/REQ 변경 발생 시 즉시 번호 재배치 + overview.md 갱신.

   **5단계 종료**
   - 남은 단계(6) 간략 안내 + 6단계 진행 Y/N. "다른 세션에서도 진행 가능" 정보 노출.
   - 단, REQ 1개면 Y/N 묻지 않고 즉시 6단계 진입.

6. Q 다이얼로그 루프 (한 번에 하나씩, REQ 번호 순)
   - 관련자료 통독
   - 관련 R/T + 컨텍스트 같이 보여줌
   - 답변 → 즉시 spec.md 갱신 (Q 삭제 + A 전환 또는 항목 수정)
   - **답변 반영 후 파급 분석**: 다른 R/T 영향 점검 → 새 Q 등록 또는 기존 항목 수정. 의존성/REQ 변경 시 즉시 반영. (Q 총량 일시적 증가 정상)
   - **REQ 종료** (한 REQ Q 0개 도달 시):
     ```
     loop:
         spec.md 전체 재검토 (R 정합성 / 누락 결정거리 / 모호 표현 / 미해결 의존)
         if 신규 Q 등록됨:
             "Q 다이얼로그 루프" 재진입 → Q 0 도달
             continue
         break
     상태 ← specified
     남은 REQ 안내 + 다음 REQ 진행 Y/N
       ("다른 세션에서도 진행 가능 / specified 된 REQ 는 sd-plan 으로 바로 넘길 수 있음" 노출)
       마지막 REQ면 Y/N 묻지 않고 즉시 종료.
     ```
   - **6단계 종료**: 모든 REQ specified 도달 시 종료.

## 번호 재배치

의존성이 4단계 이후 새로 발견되면 즉시 재배치. 재배치 시 동시 갱신: REQ 폴더명, spec.md `## 메타` 의존, `## 이력` REQ ID, overview.md REQ 목록/도메인 그룹/의존성. 흔적은 남기지 않음 (drop과 달리 단순 재정렬).
