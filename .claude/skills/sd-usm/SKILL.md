---
name: sd-usm
description: Requirement Source 를 User Story Map 으로 구조화. Use when "USM", "분석" 요청 시
---

# sd-usm

USM (Frame → Backbone → Walking Skeleton → Stories) 으로 Requirement Source 를 구조화.

## 산출물

```
.story-maps/{yyMMddHHmmss}_{slug}/
  story-map.md          ← Frame, Backbone, Walking Skeleton
  TASK-001-slug/
    task.md             ← Stories (발췌 + Open Question)
```

폴더명 = `{Bash(date +%y%m%d%H%M%S)}_{slug}` (slug: 한글). 템플릿: [story-map](references/story-map-template.md), [task](references/task-template.md).

## 운용

- **선행**: Requirement Source 의 모든 파일(첨부·unpack 산출물 포함) 전체 Read 후 진행. 발췌·파일명 추측·메타데이터만 보고 진행 금지.
- **Requirement Source 보존**: 채팅 paste / 구두 요청 등 외부 파일이 없는 경우 `.story-maps/{slug}/source.md` 로 원문 그대로 저장 후 story-map.md 의 `Requirement Source` 가 이를 참조.
- **1차확정 (Framing)**: Frame 후보 식별. 복수면 ① Map 분할 ② 스코프 축소 중 사용자 확정.
- **2차확정 (Backbone + Walking Skeleton)**: Backbone + Walking Skeleton 작성 → Frame·Activity·Task 트리 사용자 확정.
- 1, 2차 확정외 판단은 에이전트 자율 판단에 맡김.
- **Requirement Source 부정확성** (STT 오타 / 화자 추정 / 모호 발화 / 도메인 용어 다의성): [.claude/references/requirement-source-handling.md](../../references/requirement-source-handling.md).
