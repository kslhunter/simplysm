# Korean to English Conversion Design

## Goal

Convert all Korean text (comments, error messages, log messages, test descriptions, UI text, etc.) to English across the entire codebase.

## Scope

### Included

| File type | What to convert |
|-----------|----------------|
| `.ts` / `.tsx` source | Comments, JSDoc, error messages, log messages, UI text |
| `.spec.ts` / `.spec.tsx` tests | `describe`/`it` descriptions, comments |
| `.css` | Comments |
| `.md` (inside packages) | Full content |
| `.json` (package.json) | `description` field |
| `.claude/**` | Rules, refs, skills Korean text |
| `.js` | Comments |

### Excluded

- `docs/` folder (project root)
- `.back/` folder (backups)
- `packages/solid/src/components/features/address/AddressSearch.tsx` — Korea-specific address component, keep Korean

## Conversion Rules

1. **Comments**: Translate meaningfully, remove unnecessary comments where code is self-explanatory
2. **Error/log messages**: Natural English. e.g., `"Table definition not found"`
3. **Test descriptions**: Natural English. e.g., `it("parses a date")`
4. **UI text (solid-demo)**: Convert to English
5. **package.json description**: Translate to English

## Conversion Order (bottom-up by dependency)

| Order | Package | Approx files |
|-------|---------|-------------|
| 1 | `core-common` | ~9 + docs |
| 2 | `core-node` | ~7 |
| 3 | `core-browser` | ~5 |
| 4 | `lint` | ~4 + README |
| 5 | `excel` | ~8 |
| 6 | `orm-common` | ~50+ docs |
| 7 | `service-common` | ~2 |
| 8 | `service-server` | ~2 |
| 9 | `service-client` | package.json only |
| 10 | `orm-node` | package.json only |
| 11 | `storage` | ~3 |
| 12 | `capacitor-plugin-*` | ~2 |
| 13 | `sd-cli` | ~16 |
| 14 | `solid` | ~76+ docs |
| 15 | `solid-demo` | ~25 |
| 16 | `tests/orm`, `tests/service` | ~10 |
| 17 | `.claude` | ~8 |
| 18 | root | package.json, eslint.config, vitest.config |

## Workflow per Package

```
Search Korean → Convert source → Convert tests → Convert md/json → /sd-check → Commit
```

## Commit Strategy

- One commit per package (commit = package complete)
- Run `/sd-check` for the specific package before committing
- Commit message format: `i18n(<package>): convert Korean to English`

## Expected Commits

1. `i18n(core-common): convert Korean to English`
2. `i18n(core-node): convert Korean to English`
3. `i18n(core-browser): convert Korean to English`
4. `i18n(lint): convert Korean to English`
5. `i18n(excel): convert Korean to English`
6. `i18n(orm-common): convert Korean to English`
7. `i18n(service-common): convert Korean to English`
8. `i18n(service-server): convert Korean to English`
9. `i18n(service-client): convert Korean to English`
10. `i18n(orm-node): convert Korean to English`
11. `i18n(storage): convert Korean to English`
12. `i18n(capacitor-plugins): convert Korean to English`
13. `i18n(sd-cli): convert Korean to English`
14. `i18n(solid): convert Korean to English`
15. `i18n(solid-demo): convert Korean to English`
16. `i18n(tests): convert Korean to English`
17. `i18n(.claude): convert Korean to English`
18. `i18n(root): convert Korean to English`
