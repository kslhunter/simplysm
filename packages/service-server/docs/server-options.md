# Server Options

## `ServiceServerOptions`

Server configuration options.

```typescript
export interface ServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?: {
    pfxBytes: Uint8Array;
    passphrase: string;
  };
  auth?: {
    jwtSecret: string;
  } | false;
  services: ServiceDefinition[];
}
```

| Field | Type | Description |
|-------|------|-------------|
| `rootPath` | `string` | Root directory path. Static files are served from `{rootPath}/www/`, config loaded from `{rootPath}/.config.json` |
| `port` | `number` | Server listen port |
| `ssl` | `{ pfxBytes: Uint8Array; passphrase: string }?` | SSL/TLS configuration using PFX certificate |
| `ssl.pfxBytes` | `Uint8Array` | PFX certificate file contents |
| `ssl.passphrase` | `string` | PFX certificate passphrase |
| `auth` | `{ jwtSecret: string } \| false` | Authentication configuration. `undefined` = auto-detect (error if auth-wrapped services exist). `false` = explicitly disable auth checks. `{ jwtSecret }` = enable JWT auth |
| `auth.jwtSecret` | `string` | JWT signing/verification secret (HS256) |
| `services` | `ServiceDefinition[]` | Array of service definitions to register |
