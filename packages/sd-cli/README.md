# @simplysm/sd-cli

CLI tool for the Simplysm monorepo. Provides commands for building, developing, linting, type-checking, publishing, and initializing projects built on SolidJS + TailwindCSS + esbuild + Vite.

## Installation

```bash
npm install @simplysm/sd-cli
```

The CLI binary is exposed as `sd-cli`.

## Quick Start

```bash
# Initialize a new project
sd-cli init

# Start development mode
sd-cli dev

# Production build
sd-cli build

# Run all quality checks (typecheck + lint + test)
sd-cli check
```

## Configuration

All commands read `sd.config.ts` from the project root. This file must default-export a function returning an `SdConfig` object:

```typescript
import type { SdConfigFn } from "@simplysm/sd-cli";

const config: SdConfigFn = (params) => ({
  packages: {
    "core-common": { target: "neutral" },
    "core-node": { target: "node" },
    "my-client": { target: "client", server: "my-server" },
    "my-server": { target: "server" },
  },
});

export default config;
```

## Documentation

| Category | File |
|----------|------|
| CLI Commands | [docs/commands.md](docs/commands.md) |
| Configuration Types | [docs/configuration.md](docs/configuration.md) |
| Vite Config API | [docs/vite-config.md](docs/vite-config.md) |

## License

Apache-2.0
