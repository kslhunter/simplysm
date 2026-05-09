# Story Map 260509095811_엑셀폰트설정

## 메타
- 생성일: 2026-05-09 09:58
- Requirement Source: ./source.md

## Frame
- Persona: `@simplysm/excel` 사용자 (개발자)
- Outcome: 셀 단위 override 와 워크북 default 두 경로 모두로 폰트(size/family/bold)를 지정해, 워크북 전반에 일관된 텍스트 스타일과 강조 표시를 적용한다.

## Backbone

| #  | Activity         | Outcome                                                                          |
|----|------------------|----------------------------------------------------------------------------------|
| A1 | 폰트 스타일 적용 | 워크북 default 와 셀 override 두 경로로 폰트(size/family/bold)를 지정한다.       |

## Walking Skeleton

### A1. 폰트 스타일 적용

| 순서 | Task                | 한 줄 요약                                                                                       |
|------|---------------------|--------------------------------------------------------------------------------------------------|
| 1    | TASK-001-폰트스타일 | 워크북 default(`fonts[0]`) + 셀 override(`ExcelStyleOptions`) 두 진입점으로 폰트 지정 API 추가.  |
