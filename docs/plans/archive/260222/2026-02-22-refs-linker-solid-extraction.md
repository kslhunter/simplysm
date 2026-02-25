# SolidJS 규칙을 .claude/refs로 추출 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** CLAUDE.md의 SolidJS/Tailwind 사용 규칙을 `.claude/refs/sd-solid.md`로 추출하여 다른 프로젝트에서도 공유 가능하게 한다.

**Architecture:** linker 패턴을 활용하여 SolidJS/Tailwind 작업 시에만 ref 파일을 조건부 로드. CLAUDE.md에는 이 프로젝트 전용 규칙(Demo Page Rules)만 잔류.

---

### Task 1: `.claude/refs/sd-solid.md` 생성

**Files:**
- Create: `.claude/refs/sd-solid.md`

**Step 1: 파일 생성**

```markdown
# SolidJS Guidelines

**SolidJS is NOT React!**

## Core Concepts
- Component functions run **once** at mount (not on every state change)
- Fine-grained reactivity: unchanged signals don't re-evaluate expressions
- `createMemo`: only for expensive computations used in multiple places
- **Props destructuring prohibited** → use `props.xxx`
- Conditionals: `<Show>`, Lists: `<For>`
- No SSR → browser APIs usable directly
- Responsive: Mobile UI below 520px
- Chrome 84+ target
  - CSS NOT transpiled → no `aspect-ratio`, `inset`, `:is()`, `:where()`

## Props Design
- Props that don't need parameters must accept plain values (`editable={perms().edit}`), not wrapped in functions (`editable={() => perms().edit}`) — use function props only when parameters are needed (callbacks)

## Implementation Rules
- Prefer signals/stores over Provider/Context
- Check existing patterns before introducing abstractions
- Before modifying components: always Read the file to check existing props/patterns

## Hook Naming
- `create*`: Reactive hooks wrapping SolidJS primitives
- `use*`: Hooks depending on Provider Context
- Others: no hook prefix

## Compound Components
All sub-components via dot notation only (`Parent.Child`).
- Define `interface ParentComponent { Child: typeof ChildComponent }`
- Assign `Parent.Child = ChildComponent;`
- Don't export sub-components separately (export parent only)
- UI elements → compound sub-components, non-rendering config (state, behavior, callbacks) → props

## Tailwind CSS
- `darkMode: "class"`, `aspectRatio` plugin disabled (Chrome 84)
- Semantic colors: `primary`(blue), `info`(sky), `success`(green), `warning`(amber), `danger`(red), `base`(zinc) → never use `zinc-*` directly
- Heights: `field`, `field-sm`, `field-lg`
- z-index: `sidebar`(100), `sidebar-backdrop`(99), `dropdown`(1000)
- Default `rem`, use `em` for text-relative sizing (e.g., Icon)
- Use `clsx()` with semantic grouping + `twMerge()` for conflict resolution
- Before modifying styles: Read existing class patterns of the same component
```

**Step 2: Commit**

```bash
git add .claude/refs/sd-solid.md
git commit -m "docs(claude): add SolidJS/Tailwind usage rules to refs"
```

---

### Task 2: linker에 SolidJS 트리거 추가

**Files:**
- Modify: `.claude/rules/sd-refs-linker.md:10`

**Step 1: linker 테이블에 항목 추가**

`| Debugging, problem-solving, or planning approach |` 행 다음에 추가:

```markdown
| SolidJS / @simplysm/solid / Tailwind 작업 시 | `.claude/refs/sd-solid.md` |
```

**Step 2: Commit**

```bash
git add .claude/rules/sd-refs-linker.md
git commit -m "docs(claude): add SolidJS trigger to refs linker"
```

---

### Task 3: CLAUDE.md에서 추출된 섹션 제거

**Files:**
- Modify: `CLAUDE.md:92-138`

**Step 1: SolidJS Guidelines 섹션 축소**

기존 92-138행 전체를 아래로 교체:

```markdown
## SolidJS Guidelines

### Demo Page Rules
- No raw HTML elements → use `@simplysm/solid` components
- Read existing demos before writing new ones
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): extract SolidJS rules to refs, keep Demo Page Rules"
```
