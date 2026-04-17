# 코드 리뷰: check-test-removal

## CONSIST-001 [Low] sd-claude-docs 스킬 템플릿에 "test 병렬" 설명 잔존

- **위치:** .claude/skills/sd-claude-docs/SKILL.md:178

sd-claude-docs 스킬이 새 프로젝트에 CLAUDE.md를 생성할 때 사용하는 템플릿에 `pnpm check` 설명이 `typecheck + lint + test 병렬`로 남아있다. 이제 check에서 test가 제거되었으므로 이 설명은 부정확하다.

**개선 방향:** 템플릿의 check 설명을 `typecheck + lint 병렬`로 수정

---

## CONSIST-002 [Low] Feature 문서 D2에 `vitest --run` 오기

- **위치:** .tasks/260415112354_remove-check-test-type/1.1-remove-check-test-type.md:15

설계 결정 D2에 `vitest --run`이라고 기록되어 있으나, 실제 구현은 사용자 피드백에 따라 `vitest run`(서브커맨드 형태)으로 변경되었다. 문서와 구현이 불일치한다.

**개선 방향:** D2의 선택을 `vitest run`으로 수정
