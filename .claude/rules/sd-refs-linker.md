# Reference Guide

Before starting work, **Read** the relevant reference files from `.claude/refs/`.

## Version Detection

Determine the major version by the `version` field in `package.json`.

- `12.x.x` → **v12** (< 13)
- `13.x.x` → **v13** (>= 13)

## Common (all versions)

| When                                             | Read this file                        |
| ------------------------------------------------ | ------------------------------------- |
| Writing or modifying code                        | `.claude/refs/sd-code-conventions.md` |
| Working with `.cache/` or Playwright screenshots | `.claude/refs/sd-directories.md`      |
| Using `@simplysm/*` package APIs                 | `.claude/refs/sd-simplysm-docs.md`    |
| Debugging, problem-solving, or planning approach | `.claude/refs/sd-workflow.md`         |
| Using `@simplysm/service-*` packages            | `.claude/refs/sd-service.md`          |
| Migrating/porting code from another codebase     | `.claude/refs/sd-migration.md`        |
| Debugging in a project that uses `@simplysm/*` as an external dependency (not the simplysm monorepo itself) | `.claude/refs/sd-library-issue.md` |

## v12 only (< 13)

| When                                   | Read this file               |
| -------------------------------------- | ---------------------------- |
| Working on Angular / @simplysm/sd-angular | `.claude/refs/sd-angular.md` |
| Using `@simplysm/sd-orm-*` packages    | `.claude/refs/sd-orm-v12.md` |

- v12 is **Angular** based (no SolidJS)
- ORM uses **decorator** pattern (`@Table`, `@Column`)
- Package names: use `sd-` prefix (`sd-core-common`, `sd-orm-common`, etc.)
- Package manager: **yarn**

## v13 only (>= 13)

| When                                         | Read this file             |
| -------------------------------------------- | -------------------------- |
| Working on SolidJS / @simplysm/solid / Tailwind | `.claude/refs/sd-solid.md` |
| Using `@simplysm/orm-*` packages             | `.claude/refs/sd-orm.md`   |

- v13 is **SolidJS** based (no Angular)
- ORM uses **functional builder** pattern (`Table().columns().primaryKey()`)
- Package names: no prefix (`core-common`, `orm-common`, etc.)
- Package manager: **pnpm**

## Rules

- Read the reference BEFORE starting the related work (not after)
- You may read multiple references if the task spans multiple areas
- If unsure whether a reference applies, read it — the cost of reading is low
