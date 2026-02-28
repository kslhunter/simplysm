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
| `src/connections/mssql-db-conn.ts` | `MssqlDbConn` | MSSQL database connection implementation using tedious | `tests/orm/src/db-conn/mssql-db-conn.spec.ts` |
| `src/connections/mysql-db-conn.ts` | `MysqlDbConn` | MySQL database connection implementation using mysql2 | `tests/orm/src/db-conn/mysql-db-conn.spec.ts` |
| `src/connections/postgresql-db-conn.ts` | `PostgresqlDbConn` | PostgreSQL database connection implementation using pg | `tests/orm/src/db-conn/postgresql-db-conn.spec.ts` |

### Core

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/create-db-conn.ts` | `createDbConn` | Factory function to create a dialect-specific database connection | `-` |
| `src/node-db-context-executor.ts` | `NodeDbContextExecutor` | DbContextExecutor that runs queries directly on a local database connection | `-` |
| `src/pooled-db-conn.ts` | `PooledDbConn` | Connection pool wrapper with configurable pool size and auto-release | `-` |
| `src/create-orm.ts` | `OrmOptions`, `Orm`, `createOrm` | High-level ORM factory that creates a typed DbContext manager with transaction and no-transaction connect helpers | `-` |

## License

Apache-2.0
