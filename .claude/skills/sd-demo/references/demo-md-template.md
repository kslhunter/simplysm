# demo.md 템플릿

위치: `.specs/{yyMMdd_HHmmss}/DEMO-XXX-슬러그/demo.md`

## 템플릿

```markdown
# DEMO-001-슬러그 / Demo

## 메타
- 상태: drafting | demo-ready | reviewing | done
- 대상 REQ: REQ-001, REQ-002
- 생성일: YYYY-MM-DD
- 마지막 갱신: YYYY-MM-DD
- 라운드: 0 (산출물 소비자 피드백 라운드 진행 횟수)

## 시나리오
시연 흐름 (사용자가 산출물 소비자에게 보여줄 순서):
1. <화면명> → <액션> (<설명, mock 동작 등>)
2. ...

## 만든 파일
- `src/pages/<신규파일>.tsx` (신규)
- `src/data/mock-<도메인>.ts` (mock data, MOCK_ prefix)

## Mock Data 요약
- 위치: `src/data/mock-<도메인>.ts`
- 샘플: <간략 설명>

## 산출물 소비자 피드백 라운드
<!-- 라운드 진행 시 append-only로 추가. 초안 작성 시점엔 비어있음 -->

### 라운드 1 (YYYY-MM-DD)
- **산출물 소비자 피드백**:
  - <피드백 1>
  - <피드백 2>
- **분류** (사용자 확정):
  - <피드백 1> → UI 조정 / spec 변경
  - <피드백 2> → ...
- **처리**:
  - <적용 결과>
```

## 섹션별 역할

| 섹션 | 용도 |
|---|---|
| `## 메타` | 상태/대상 REQ/라운드 횟수 |
| `## 시나리오` | 시연 흐름 (사용자가 산출물 소비자에게 보여줄 순서) |
| `## 만든 파일` | demo가 생성/수정한 파일 목록 (audit) |
| `## Mock Data 요약` | 어떤 mock 사용했는지 |
| `## 산출물 소비자 피드백 라운드` | append-only 라운드 기록 (피드백/분류/처리) |

## 라운드 처리 흐름

라운드 한 번이 끝나면 `## 산출물 소비자 피드백 라운드` 섹션에 새 `### 라운드 N` 블록을 **추가만** (이전 라운드는 보존).

분류는 자동 판단 X. 사용자 확정 받기:
- UI 조정 → demo 코드 수정
- spec 변경 (R 단위) → spec.md 수정 + 메타 `이력` 기록
- REQ 구조 변경 → spec 재진입 후보 알림 (demo 단독 처리 X)

## 예시

```markdown
# DEMO-001-RTP / Demo

## 메타
- 상태: demo-ready
- 대상 REQ: REQ-001, REQ-002, REQ-003
- 생성일: 2026-05-03
- 마지막 갱신: 2026-05-03
- 라운드: 0

## 시나리오
1. RTP 입력 화면 → 필드 X 입력 → 저장 클릭 (저장은 안 됨, 말로 설명)
2. RTP 출력 화면 → 입력한 mock 데이터 표시
3. RTP 설정 화면 → 옵션 변경 (시각만 반영)

## 만든 파일
- `src/pages/RTPInput.tsx` (신규)
- `src/pages/RTPOutput.tsx` (신규)
- `src/pages/RTPSettings.tsx` (신규)
- `src/data/mock-rtp.ts` (mock data, MOCK_ prefix)

## Mock Data 요약
- 위치: `src/data/mock-rtp.ts`
- 샘플: 5건 (입력/출력 시나리오 커버)

## 산출물 소비자 피드백 라운드
<!-- 아직 진행 안 함 -->
```
