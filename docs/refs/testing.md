# Testing

## Test Projects

| Project | Environment | Pattern |
|---------|-------------|---------|
| node | Node.js | `packages/*/tests/**/*.spec.ts` |
| browser | Playwright | `packages/*/tests/**/*.spec.ts` |
| solid | Playwright + vite-plugin-solid | `packages/solid/tests/**/*.spec.tsx` |
| orm | Node.js + Docker | `tests/orm/**/*.spec.ts` |
| service | Playwright | `tests/service/**/*.spec.ts` |

## Integration Tests (`tests/`)

- `tests/orm/`: ORM integration tests (Docker DB required)
- `tests/service/`: Service integration tests (browser tests)

When modifying code, review and update related tests (`packages/{pkg}/tests/`) and demos (`packages/solid-demo/src/`).
