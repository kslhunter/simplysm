# SFTP SSH Key Authentication for Publish

## Overview

Automate SSH key authentication for SFTP publishing so users don't need to enter a password every time. When `pass` is omitted from sd.config.ts SFTP settings, the CLI automatically uses SSH key authentication.

## User Experience

### sd.config.ts configuration

```typescript
// No pass field needed for SFTP
{ type: "sftp", host: "simplysm.co.kr", user: "simplysm", path: "/deploy" }
```

### First `pnpm pub` run

```
✔ npm auth verified: kslhunter
⚠ SSH key not found. Generating... (~/.ssh/id_ed25519)
✔ SSH key generated
? simplysm@simplysm.co.kr password: ******
✔ SSH public key registered (simplysm.co.kr)
✔ Git status clean
... (build and deploy proceeds)
```

### Subsequent runs

```
✔ npm auth verified: kslhunter
✔ SSH key auth verified (simplysm.co.kr)
✔ Git status clean
... (no password prompt, proceeds automatically)
```

## Architecture

### Files Changed (2 files, no new files)

1. **`packages/sd-cli/src/commands/publish.ts`** — Add SSH pre-auth in Phase 1
2. **`packages/storage/src/clients/sftp-storage-client.ts`** — SSH key fallback when `pass` is absent

### No new dependencies

- SSH key generation: Node.js built-in `crypto.generateKeyPairSync('ed25519')`
- SSH connection/key registration: existing `ssh2` library (via `ssh2-sftp-client`)

### StorageConnConfig — No changes

`sftp-storage-client.ts` reads `~/.ssh/id_ed25519` automatically when `pass` is not provided. No need to add `privateKey` to the config interface.

## Phase 1: SSH Pre-auth Logic (publish.ts)

New function `ensureSshAuth()` added to Phase 1, between npm auth check and Git status check.

```typescript
async function ensureSshAuth(
  publishPackages: Array<{ config: SdPublishConfig }>,
): Promise<void> {
  // 1. Collect SFTP servers without pass, deduplicate by user@host
  // 2. Check/generate SSH key at ~/.ssh/id_ed25519
  // 3. For each server:
  //    - Try privateKey auth
  //    - On failure: prompt password → connect → append public key to authorized_keys
}
```

### Call site in runPublish()

```typescript
// npm auth check (existing)
if (publishPackages.some((p) => p.config === "npm")) { ... }

// SSH key auth check (new)
await ensureSshAuth(publishPackages);

// Git status check (existing)
if (!noBuild && hasGit) { ... }
```

## sftp-storage-client.ts Changes

When `pass` is not provided, use SSH private key instead:

```typescript
await client.connect({
  host: config.host,
  port: config.port,
  username: config.user,
  ...(config.pass != null
    ? { password: config.pass }
    : { privateKey: fs.readFileSync(path.join(os.homedir(), ".ssh", "id_ed25519")) }),
});
```

## SSH Key Management

- **Key type**: ed25519 (modern, secure, compact)
- **Key location**: `~/.ssh/id_ed25519` (OS standard path)
- **Existing key**: Reuse if present, never overwrite
- **New key**: Generate with Node.js `crypto.generateKeyPairSync('ed25519')`, save both private and public key
- **Directory**: Create `~/.ssh/` with mode 0o700 if missing
- **File permissions**: Private key 0o600 (Unix standard)

## Server Key Registration

When SSH key auth fails (key not registered on server):

1. Prompt for password using `@inquirer/prompts` `password()`
2. Connect to server with password via `ssh2`
3. Read remote `~/.ssh/authorized_keys`
4. Append public key content
5. Ensure correct permissions on remote `.ssh/` directory

## Error Handling

| Scenario | Behavior |
|----------|----------|
| SSH key generation failure | Error message + abort publish |
| Wrong password | Error message + abort publish |
| Public key registration failure (permissions etc.) | Error message + abort publish |
| Key file exists but not registered on server | Password prompt → registration attempt |
| `user` field missing in config | Config error message + abort publish |

No retries on password failure. User re-runs `pnpm pub` to try again.

All failures happen in Phase 1 (before build/deploy), so no partial state to clean up.

## Cross-Platform Support

- **Windows**: Node.js crypto for key gen (no `ssh-keygen`), `ssh2` for connection (no `ssh-copy-id`)
- **Linux/Mac**: Same Node.js-only approach, no OS command dependencies
- **WSL**: Works as Linux

## Design Decisions

1. **No `login-ssh` CLI command**: Integrated into publish flow for simplicity
2. **No `StorageConnConfig` changes**: `sftp-storage-client` handles key file reading internally
3. **No new packages**: Uses Node.js `crypto` + existing `ssh2`
4. **Standard key path**: `~/.ssh/id_ed25519` for compatibility with other SSH tools
5. **Phase 1 pre-auth**: Handles all interactive prompts before parallel deploy phase
