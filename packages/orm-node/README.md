# @simplysm/orm-node

Simplysm package - ORM module (node)

## Installation

pnpm add @simplysm/orm-node

**Peer Dependencies:** `mysql2` (optional), `pg` (optional), `pg-copy-streams` (optional), `tedious` (optional)

## Source Index

### Types

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/types/db-conn.ts` | `DB_CONN_CONNECT_TIMEOUT`, `DB_CONN_DEFAULT_TIMEOUT`, `DB_CONN_ERRORS`, `DbConn`, `DbPoolConfig`, `DbConnConfig`, `MysqlDbConnConfig`, `MssqlDbConnConfig`, `PostgresqlDbConnConfig`, `getDialectFromConfig` | Database connection interface, config types, and timeout constants for all dialects | `-` |

### Connections

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/connections/mssql-db-conn.ts` | `MssqlDbConn` | MSSQL database connection implementation using tedious | `-` |
| `src/connections/mysql-db-conn.ts` | `MysqlDbConn` | MySQL database connection implementation using mysql2 | `-` |
| `src/connections/postgresql-db-conn.ts` | `PostgresqlDbConn` | PostgreSQL database connection implementation using pg | `-` |

### Core

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/create-db-conn.ts` | `createDbConn` | Factory function to create a dialect-specific database connection | `-` |
| `src/node-db-context-executor.ts` | `NodeDbContextExecutor` | DbContextExecutor that runs queries directly on a local database connection | `-` |
| `src/pooled-db-conn.ts` | `PooledDbConn` | Connection pool wrapper with configurable pool size and auto-release | `-` |
| `src/create-orm.ts` | `OrmOptions`, `Orm`, `createOrm` | High-level ORM factory with connection pooling and migration support | `-` |

## License

Apache-2.0
