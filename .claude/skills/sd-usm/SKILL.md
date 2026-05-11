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
- **Requirement Source 부정확성** (STT 오타 / 화자 추정 / 모호 발화 / 도메인 용어 다의성): [.claude/references/sd-requirement-source-handling.md](../../references/sd-requirement-source-handling.md).
- **1차확정 (Framing)**: Frame 후보 식별. 복수면 ① Map 분할 ② 스코프 축소 중 사용자 확정.
  - Frame 단위: 최종 사용자(business actor) 관점의 end-to-end 흐름.
- **2차확정 (Business Flow)**: 업무 프로세스(다중 actor·분기·트리거·데이터 흐름)인 경우에만. `## Business Flow` 작성 → 사용자 확정. 단순 CRUD·단일 화면 등은 생략.
- **3차확정 (Backbone + Walking Skeleton)**: Backbone + Walking Skeleton 작성 → Frame·Activity·Task 트리 사용자 확정. 업무 프로세스 케이스에선 Business Flow 노드를 Activity·Task 로 분해.
- **결정 근거**: sd-base-rules.md "결정 근거" 적용. 근거 없는 항목은 story-map.md / task.md 에 Open Question 인라인.
