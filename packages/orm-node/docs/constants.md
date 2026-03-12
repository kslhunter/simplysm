# Constants

Shared constants used across all connection implementations.

## `DB_CONN_CONNECT_TIMEOUT`

Connection establishment timeout.

- **Value:** `10000` (10 seconds)
- **Used by:** MSSQL (`connectTimeout`) and PostgreSQL (`connectionTimeoutMillis`)

## `DB_CONN_DEFAULT_TIMEOUT`

Default query execution timeout.

- **Value:** `600000` (10 minutes)
- **Used by:** All connection classes for query timeouts. Connections auto-close after `2x` this value (20 minutes) of inactivity.

## `DB_CONN_ERRORS`

Standard error messages for connection state violations.

| Key | Value | Description |
|-----|-------|-------------|
| `NOT_CONNECTED` | `"'Connection' is not connected."` | Thrown when operating on a disconnected connection |
| `ALREADY_CONNECTED` | `"'Connection' is already connected."` | Thrown when `connect()` is called on an active connection |
