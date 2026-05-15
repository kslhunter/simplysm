---
name: sd-development
description: usm/refinement/design/implementation 오케스트레이터. Use when "개발 진행" 요청 시
---

# SD 오케스트레이터 (Story Map 워크플로)

4개 sd-* 스킬(sd-usm/sd-refinement/sd-design/sd-implementation)을 입력 따라 자동 chain.

## 입력 분석 → 시작 스킬

| 입력 상태 | 시작 스킬 |
|---|---|
| design.md(`designed: <date>`) 존재 | sd-implementation |
| task.md(`specified: <date>`) 존재 | sd-design |
| story-map.md 또는 task.md(Open Question 잔존) 존재 | sd-refinement |
| 그 외 (Requirement Source / 없음) | sd-usm |

> 입력에 story-map.md / task.md / design.md 경로가 명시되어 있거나 사용자가 특정 TASK ID 지목한 경우 그대로 사용.
> 모호하면 사용자에게 확인.

## 자동 chain 분기

```
sd-usm 끝:
  ├─ FRAME 1개 → 자동 sd-refinement
  └─ FRAME N개 → 멈춤(보고)

sd-refinement 끝 (Story Map 의 모든 TASK specified):
  ├─ TASK 1개 → 자동 sd-design
  └─ TASK N개 → 멈춤(보고)

sd-design 끝 → 자동 sd-implementation

sd-implementation → 종료(보고)
```

## 운용

각 단계에서 해당 sd-* 스킬을 호출. sd-* 스킬 내부 동작/결정엔 개입 X
