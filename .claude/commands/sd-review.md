---
allowed-tools: Read, Glob, Grep, Task
description: 코드 리뷰 보고서 생성 (수정 없이 분석만)
---

## 사용법

- `/sd-review` — 현재 브랜치의 변경사항 전체 리뷰
- `/sd-review packages/solid` — 특정 경로만 리뷰

인자(`$ARGUMENTS`)가 있으면 해당 경로를 대상으로 리뷰합니다.

## 코드 리뷰

`superpowers:code-reviewer` 에이전트를 사용하여 현재 변경사항을 분석합니다.
*
- 코드 컨벤션, 성능, 안정성, 유지보수성, 가독성, 사용성
- 코드를 수정하지 않습니다. 보고서만 출력합니다.
