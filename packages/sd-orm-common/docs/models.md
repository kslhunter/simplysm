# Models

Built-in entity models used by the ORM framework.

## Class: SystemMigration

**Source:** `src/models/SystemMigration.ts`

Built-in model for the `_migration` system table that tracks which migrations have been applied. This table is automatically created during `DbContext.initializeAsync()`.

### Table Definition

```typescript
@Table({ name: "_migration", description: "Migration tracking" })
class SystemMigration {
  @Column({ primaryKey: 1, description: "Migration code (class name)" })
  code!: string;
}
```

### Columns

| Column | Type | Primary Key | Description |
|--------|------|-------------|-------------|
| `code` | `string` | Yes (order 1) | The migration class name, used to identify which migrations have been applied |

### Usage

`SystemMigration` is used internally by `DbContext` and exposed as `db.systemMigration`:

```typescript
class AppDbContext extends DbContext {
  get migrations() {
    return [Migration001, Migration002];
  }
  // ...
}

// The systemMigration queryable is automatically available
await db.connectAsync(async () => {
  // Check applied migrations
  const applied = await db.systemMigration.resultAsync();
  // applied => [{ code: "Migration001" }, { code: "Migration002" }]
});
```

During `initializeAsync()`:
- On first creation: all migration class names are inserted into `_migration`
- On subsequent runs: only unapplied migrations are run and their names are inserted
