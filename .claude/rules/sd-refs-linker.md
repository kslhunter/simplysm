# Reference Guide

Before starting work, **Read** the relevant reference files from `.claude/refs/`.

## Version Detection

`package.json`의 `version` 필드로 메이저 버전을 판별한다.

- `12.x.x` → **v12** (< 13)
- `13.x.x` → **v13** (>= 13)

## Common (all versions)

| When                                             | Read this file                        |
| ------------------------------------------------ | ------------------------------------- |
| Writing or modifying code                        | `.claude/refs/sd-code-conventions.md` |
| Working with `.cache/` or Playwright screenshots | `.claude/refs/sd-directories.md`      |
| Using `@simplysm/*` package APIs                 | `.claude/refs/sd-simplysm-docs.md`    |
| Debugging, problem-solving, or planning approach | `.claude/refs/sd-workflow.md`         |
| @simplysm/service-\* 사용 시                     | `.claude/refs/sd-service.md`          |

## v12 only (< 13)

| When                                   | Read this file               |
| -------------------------------------- | ---------------------------- |
| Angular / @simplysm/sd-angular 작업 시 | `.claude/refs/sd-angular.md` |
| @simplysm/sd-orm-\* 사용 시            | `.claude/refs/sd-orm-v12.md` |

- v12는 **Angular** 기반 (SolidJS 없음)
- ORM은 **데코레이터** 패턴 (`@Table`, `@Column`)
- 패키지명: `sd-` prefix 사용 (`sd-core-common`, `sd-orm-common` 등)
- 패키지 매니저: **yarn**

## v13 only (>= 13)

| When                                         | Read this file             |
| -------------------------------------------- | -------------------------- |
| SolidJS / @simplysm/solid / Tailwind 작업 시 | `.claude/refs/sd-solid.md` |
| @simplysm/orm-\* 사용 시                     | `.claude/refs/sd-orm.md`   |

- v13는 **SolidJS** 기반 (Angular 없음)
- ORM은 **함수형 빌더** 패턴 (`Table().columns().primaryKey()`)
- 패키지명: prefix 없음 (`core-common`, `orm-common` 등)
- 패키지 매니저: **pnpm**

## Rules

- Read the reference BEFORE starting the related work (not after)
- You may read multiple references if the task spans multiple areas
- If unsure whether a reference applies, read it — the cost of reading is low
