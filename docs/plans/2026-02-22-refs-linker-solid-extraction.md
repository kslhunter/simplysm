# SolidJS 규칙을 .claude/refs로 추출

## 배경

- `.claude/refs/` + linker 패턴 도입 완료 (테스트 통과)
- CLAUDE.md의 SolidJS/Tailwind 규칙은 @simplysm/solid를 사용하는 다른 프로젝트에서도 공유 가능
- 그러나 solid를 안 쓰는 프로젝트에서는 불필요 → rules 직접 승격 불가
- refs + linker 패턴으로 조건부 로딩 가능

## 변경 사항

### 1. 신규: `.claude/refs/sd-solid.md`

CLAUDE.md에서 아래 섹션을 추출:
- Core Concepts
- Props Design
- Implementation Rules
- Hook Naming
- Compound Components
- Tailwind CSS

**제외 (CLAUDE.md에 잔류):** Demo Page Rules (이 프로젝트 전용)

### 2. 수정: `.claude/rules/sd-refs-linker.md`

linker 테이블에 항목 추가:

```
| SolidJS / @simplysm/solid / Tailwind 작업 시 | `.claude/refs/sd-solid.md` |
```

### 3. 수정: `CLAUDE.md`

SolidJS Guidelines 섹션에서 추출된 내용 제거, Demo Page Rules만 유지.

## 설계 원칙

- ORM/Service 규칙은 이 라이브러리 개발 규칙이므로 CLAUDE.md 유지
- README.md는 API 사용법, refs는 코딩 규칙 — 역할 분리
- `sd-language.md`는 항상 필요하므로 rules에 유지
