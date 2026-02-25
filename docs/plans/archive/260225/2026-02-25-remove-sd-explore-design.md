# Remove sd-explore Skill Design

## Summary

`sd-explore` 스킬을 제거하고, 유일한 호출처인 `sd-review`의 Step 1을 내장 Explore 에이전트로 대체한다.

## Motivation

- `sd-explore`는 `sd-review`에서만 호출됨 (`user-invocable: false`)
- Claude Code 내장 Explore 에이전트가 동일한 역할 수행 가능
- 스킬 하나를 줄여 관리 포인트 감소

## Changes

### 1. Delete `sd-explore/SKILL.md`

`.claude/skills/sd-explore/` 폴더째 삭제.

### 2. Modify `sd-review/SKILL.md` Step 1

**Before:** `Skill: sd-explore`로 호출

**After:** `Task(subagent_type=Explore)` 호출, prompt에 핵심 분석 지침 포함:

- Entry points, core files, module boundaries
- Call chains, data transformations, state changes
- Abstraction layers, design patterns, dependency graph
- Error handling, public API surface

- Thoroughness: "very thorough" 명시
- Model: 지정 안 함 (기본 Haiku)
- 품질 부족 시 `model: "sonnet"` 추가로 전환 가능
- "sd-explore analysis" 등 참조 텍스트를 "Explore analysis"로 수정

### 3. Modify `sd-use/SKILL.md`

라우팅 테이블에서 `sd-explore` 행 삭제.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 분석 실행 방식 | Task(Explore) | 별도 context 격리 유지, 내장 기능 활용 |
| 모델 | Haiku (기본) | 속도/비용 우선. 부족 시 sonnet 전환 |
| 분석 지침 형식 | 핵심만 (~4줄) | 출력 형식은 Explore에 위임 |
| sd-use 처리 | 항목 삭제 | 리다이렉트 불필요 |
