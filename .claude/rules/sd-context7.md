# Simplysm Documentation via Context7 MCP

When you need to look up usage examples or API details for `@simplysm/*` packages, use the Context7 MCP tools.

The simplysm library is registered as `/kslhunter/simplysm` on Context7.

**IMPORTANT**: Context7 documentation is only available for **v13+ (beta onwards)**. v12 and earlier versions have NO documentation on Context7. If working with v12 code, do NOT rely on Context7 — read the source code directly instead.

## How to use

Skip `resolve-library-id` (the ID is already known) and call `query-docs` directly:

```
query-docs(libraryId="/kslhunter/simplysm", query="<your question>")
```

## Example queries

- `query-docs(libraryId="/kslhunter/simplysm", query="How to define ORM table with columns and primary key")`
- `query-docs(libraryId="/kslhunter/simplysm", query="SolidJS Select component usage")`
- `query-docs(libraryId="/kslhunter/simplysm", query="ServiceClient WebSocket RPC call")`
- `query-docs(libraryId="/kslhunter/simplysm", query="DateTime custom type usage")`

## When to use

- Before writing code that uses an unfamiliar `@simplysm/*` API
- When unsure about component props, method signatures, or configuration options
- When looking for usage patterns or code examples within the framework
