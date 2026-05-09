# impl.md 템플릿

`.story-maps/{yyMMddHHmmss}_{slug}/TASK-XXX-slug/impl.md`

## 템플릿

```markdown
# TASK-001-입고지시서수정 Implementation

## 메타
- implemented: <pending | YYYY-MM-DD>  ← 워크플로 완료 시 YYYY-MM-DD, 도중 중단 시 pending

## 구현 결과
- Story 1:
  - 변경 파일: <파일경로 + 변경 내용 자유 서술>
  - design 대비 차이: (있을 때만) <차이 서술>
  - 이슈/결정: (있을 때만) <기록>
- Story 2: ...

## 패키지 레벨 검증
<typecheck / lint / test 결과 자유 서술>

## 정방향 검토 (있을 때만)
<변질 / 누락 발견 시 항목 + 보고>

## 안내
<시연 필요 Story + 시나리오. 없으면 완료 보고>
```
