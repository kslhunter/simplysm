---
name: sd-usm
description: Requirement Source 를 User Story Map 으로 구조화. Use when "USM", "분석" 요청 시
---

# sd-usm

USM (Frame → Walking Skeleton → Stories) 으로 Requirement Source 를 구조화.

## 산출물

```
.story-maps/{yyMMddHHmmss}_{slug}/
  story-map.md          ← Frame, Walking Skeleton
  TASK-001-slug/
    task.md             ← Stories (발췌 + Open Question)
```

폴더명 = `{Bash(date +%y%m%d%H%M%S)}_{slug}` (slug: 한글). 템플릿: [story-map](references/story-map-template.md), [task](references/task-template.md).

## 워크플로

1단계 결과로 story-map 이 복수로 분리된 경우, 2~3단계는 각 story-map (Frame) 별 반복 진행.

### 1단계: Framing

Requirement Source 의 모든 요구를 Frame 후보로 평면 분류 → 채팅으로만 제시.

**절차** (내부 수행, 사용자에겐 3번 결과만 제시):

1. **평면화**: source 모든 요구 후보를 평면 목록으로. 메일 항목·슬라이드·첨부·원본 카테고리 구조는 분류 단위와 무관.

2. **항목별 자문 1줄**: "최종 사용자가 독립된 작업 단위로 인식하는가?"
   - **독립 작업 단위** → 별도 Frame 후보 (미세 변경·운영 잔손·범위 밖 포함)
   - **다른 Frame 의 사전·부수·서브 케이스** → 별도 Frame X. 그 Frame 안 Activity/Task 로 흡수

3. **제시**: Frame 후보 표 + story-map 구성 추천.

   | # | 명칭 | 설명 |
   |---|---|---|
   | 1 | <이름> | <한 줄> |

   추천 — Frame 을 어떻게 story-map 으로 묶을지 LLM 임의안 1줄 (예: "Frame 1·2 를 별도 story-map 으로 분리 추천. 트리거·산출물 다름"). 사용자 자유 응답 → 합의 도달 시 다음 단계.

   Frame 단위: 최종 사용자(business actor) 관점의 end-to-end 흐름.

### 2단계: Business Flow

업무 프로세스(다중 actor·분기·트리거·데이터 흐름) 케이스에서만. 단순 CRUD·단일 화면 등은 생략.

`## Business Flow` 다이어그램 임의안 — 사용자에겐 ASCII, 확정 후 mermaid 로 story-map.md 에 저장.

### 3단계: Walking Skeleton

Walking Skeleton 임의안 — story-map-template.md 의 `## Walking Skeleton` 양식 (`### A<n>. <Activity 이름>` 헤더 + Task 표) 그대로. 업무 프로세스 케이스에선 Business Flow 노드를 Activity·Task 로 분해.

확정 후 story-map.md 갱신 + TASK-XXX-{slug} 폴더·task.md 생성 (각 Task = Stories 발췌 + Open Question).

## 운용

- **선행**: Requirement Source 의 모든 파일(첨부·unpack 산출물 포함) 전체 Read 후 진행. 발췌·파일명 추측·메타데이터만 보고 진행 금지.
- **Requirement Source 보존**: 채팅 paste / 구두 요청 등 외부 파일이 없는 경우 `.story-maps/{slug}/source.md` 로 원문 그대로 저장 후 story-map.md 의 `Requirement Source` 가 이를 참조.
- **Requirement Source 부정확성** (STT 오타 / 화자 추정 / 모호 발화 / 도메인 용어 다의성): [.claude/references/sd-requirement-source-handling.md](../../references/sd-requirement-source-handling.md).
- **결정 근거**: sd-base-rules.md "결정 근거" 적용. 근거 없는 항목은 story-map.md / task.md 에 Open Question 인라인.
