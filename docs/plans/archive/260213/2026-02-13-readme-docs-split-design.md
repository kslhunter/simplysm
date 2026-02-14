# README Documentation Split Design

Split large README.md files into `docs/` directories for better Context7 indexing and discoverability.

## Pattern

Follows the pattern established in `packages/solid/`:
- **README.md**: Installation, core configuration, Caveats + individual item index (one-line description + doc link)
- **docs/**: Detailed documentation split by category
- **package.json**: Add `"docs"` to `files` array for npm publish

## Packages

### core-common (903 lines → 4 docs files)

```
docs/
  types.md       ← Errors, DateTime, DateOnly, Time, Uuid, LazyGcMap, Type Utilities
  features.md    ← DebounceQueue, SerialQueue, EventEmitter, ZipArchive
  utils.md       ← obj, json, xml, str, num, date-format, bytes, wait, transferable, path, template-strings
  extensions.md  ← Array, Map, Set extensions
```

README keeps: Installation, Initialization, Caveats, individual item index

### orm-common (899 lines → 3 docs files)

```
docs/
  schema.md       ← Table/View/Procedure definition, Column types, Relationships, DbContext, Type Inference
  queries.md      ← Connection, SELECT, JOIN, Grouping, Pagination, Search, UNION, CTE, INSERT/UPDATE/DELETE/UPSERT, Lock, DDL, Error Handling
  expressions.md  ← expr.* (Comparison, Logical, String, Numeric, Date, Conditional, Aggregate, Window, Other)
```

README keeps: Installation, Supported Databases, Core Modules overview, Security Notes, individual item index

### service-server (812 lines → 4 docs files)

```
docs/
  server.md            ← ServiceServer class, Options, SSL, Custom Service, Config, Routes, Full Example, Security, Caveats
  authentication.md    ← Authorize decorator, JWT, AuthTokenPayload
  built-in-services.md ← OrmService, CryptoService, SmtpService, AutoUpdateService, ConfigManager
  transport.md         ← ServiceSocket, HTTP API, File Upload, Event Publishing, ProtocolWrapper, Legacy
```

README keeps: Installation, Main Modules overview, individual item index

## package.json Changes

All three packages need `"docs"` added to the `files` array:

```json
{
  "files": ["dist", "docs"]
}
```

Also update `packages/solid/package.json` for consistency.
