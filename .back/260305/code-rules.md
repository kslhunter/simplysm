# Code Rules

## ESLint Rules (`@simplysm/lint`)

- ECMAScript private fields (`#field`) prohibited → Use TypeScript `private`
- `@simplysm/*/src/` path imports prohibited → Read package's `index.ts` to check exports first
- `no-console`, `eqeqeq`, `no-shadow` enforced
- `Buffer` prohibited → Use `Uint8Array` (exception: `eslint-disable` with reason when library requires it)
- `await` required in async functions

## TypeScript Configuration

- `strict: true`, `verbatimModuleSyntax: true`
- Path aliases: `@simplysm/*` → `packages/*/src/index.ts`
- JSX: SolidJS (`jsxImportSource: "solid-js"`)
