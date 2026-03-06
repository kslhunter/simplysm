# Project Structure

## Packages (`packages/`)

| Package | Target |
|---------|--------|
| `core-common` | neutral |
| `core-browser` | browser |
| `core-node` | node |
| `cli` | node |
| `lint` | node |
| `orm-common` | neutral |
| `orm-node` | node |
| `service-common` | neutral |
| `service-client` | neutral |
| `service-server` | node |
| `solid` | browser |
| `solid-demo` | client |
| `excel` | neutral |
| `storage` | node |

## Custom Types (`core-common`)

Immutable types: `DateTime`, `DateOnly`, `Time`, `Uuid`, `LazyGcMap`

## Dependency Layers

```
core-common → core-browser / core-node → orm-common / service-common → orm-node / service-server / service-client → solid
```

## Build Targets (sd.config.ts)

- `node`: Node.js only (no DOM, includes `@types/node`)
- `browser`: Browser only (includes DOM, excludes `@types/node`)
- `neutral`: Node/browser shared
- `client`: Vite dev server
