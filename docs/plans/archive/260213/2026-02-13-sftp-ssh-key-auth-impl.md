# SFTP SSH Key Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** When SFTP publish config has no `pass`, automatically use SSH key authentication — generating keys and registering them on the server if needed.

**Architecture:** Two files changed. `sftp-storage-client.ts` falls back to `~/.ssh/id_ed25519` when `pass` is absent. `publish.ts` Phase 1 pre-verifies SSH auth for all passwordless SFTP targets, prompting for password and registering keys on first use.

**Tech Stack:** `ssh2` (key generation via `utils.generateKeyPairSync`, `Client` for key registration), `@inquirer/prompts` (password input), existing `ssh2-sftp-client`.

---

### Task 1: Add `ssh2` dependency to sd-cli

**Files:**
- Modify: `packages/sd-cli/package.json`

**Step 1: Install ssh2 and types**

```bash
cd /home/kslhunter/projects/simplysm
pnpm --filter @simplysm/sd-cli add ssh2
pnpm --filter @simplysm/sd-cli add -D @types/ssh2
```

**Step 2: Verify import works**

```bash
node -e "import('ssh2').then(m => console.log('ssh2 OK, has utils:', !!m.utils))"
```

Expected: `ssh2 OK, has utils: true`

**Step 3: Commit**

```bash
git add packages/sd-cli/package.json pnpm-lock.yaml
git commit -m "chore(sd-cli): add ssh2 dependency for SSH key auth"
```

---

### Task 2: Modify `sftp-storage-client.ts` — SSH key fallback

When `pass` is not provided, read `~/.ssh/id_ed25519` as private key for authentication.

**Files:**
- Modify: `packages/storage/src/clients/sftp-storage-client.ts:27-45`

**Step 1: Update the `connect` method**

Replace the existing connect method body (lines 27-45) with:

```typescript
async connect(config: StorageConnConfig): Promise<void> {
  if (this._client !== undefined) {
    throw new SdError("이미 SFTP 서버에 연결되어 있습니다. 먼저 close()를 호출하세요.");
  }

  const client = new SftpClient();
  try {
    if (config.pass != null) {
      await client.connect({
        host: config.host,
        port: config.port,
        username: config.user,
        password: config.pass,
      });
    } else {
      const fs = await import("fs");
      const os = await import("os");
      const path = await import("path");
      const keyPath = path.join(os.homedir(), ".ssh", "id_ed25519");
      await client.connect({
        host: config.host,
        port: config.port,
        username: config.user,
        privateKey: fs.readFileSync(keyPath),
      });
    }
    this._client = client;
  } catch (err) {
    await client.end();
    throw err;
  }
}
```

**Key points:**
- Dynamic `import("fs")` etc. to avoid adding new top-level imports (keeps existing import style)
- `fs.readFileSync(keyPath)` returns a Buffer which `ssh2-sftp-client` accepts as `privateKey`
- If the key file doesn't exist, `readFileSync` throws — this is fine because Phase 1 in `publish.ts` ensures the key exists before we get here

**Step 2: Verify typecheck**

```bash
pnpm typecheck packages/storage
```

Expected: PASS

**Step 3: Commit**

```bash
git add packages/storage/src/clients/sftp-storage-client.ts
git commit -m "feat(storage): support SSH key auth when pass is not provided"
```

---

### Task 3: Add `ensureSshAuth` to `publish.ts`

This is the core logic. Add a function that:
1. Collects SFTP targets without `pass`
2. Ensures SSH key exists (generates if needed)
3. Tests SSH key auth against each server
4. On failure: prompts for password, registers public key

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts`

**Step 1: Add imports at top of file (after existing imports)**

Add these after line 12 (`import { runBuild } from "./build";`):

```typescript
import os from "os";
import fs from "fs";
import { Client as SshClient, utils as sshUtils } from "ssh2";
import { password as passwordPrompt } from "@inquirer/prompts";
```

**Step 2: Add `ensureSshAuth` function**

Add this in the Utilities region (after `waitWithCountdown` function, before `//#endregion` of Utilities region at line 89):

```typescript
/**
 * SSH 키 인증 사전 확인 및 설정
 *
 * pass가 없는 SFTP 서버에 대해:
 * 1. SSH 키 파일이 없으면 생성
 * 2. 키 인증을 테스트하고, 실패하면 비밀번호로 공개키 등록
 */
async function ensureSshAuth(
  publishPackages: Array<{ name: string; config: SdPublishConfig }>,
  logger: ReturnType<typeof consola.withTag>,
): Promise<void> {
  // pass 없는 SFTP 서버 수집 (user@host 중복 제거)
  const sshTargets = new Map<string, { host: string; port?: number; user: string }>();
  for (const pkg of publishPackages) {
    if (pkg.config === "npm") continue;
    if (pkg.config.type !== "sftp") continue;
    if (pkg.config.pass != null) continue;
    if (pkg.config.user == null) {
      throw new Error(`[${pkg.name}] SFTP 설정에 user가 없습니다.`);
    }
    const key = `${pkg.config.user}@${pkg.config.host}`;
    sshTargets.set(key, {
      host: pkg.config.host,
      port: pkg.config.port,
      user: pkg.config.user,
    });
  }

  if (sshTargets.size === 0) return;

  // SSH 키 파일 확인/생성
  const sshDir = path.join(os.homedir(), ".ssh");
  const keyPath = path.join(sshDir, "id_ed25519");
  const pubKeyPath = path.join(sshDir, "id_ed25519.pub");

  if (!fs.existsSync(keyPath)) {
    logger.info("SSH 키가 없습니다. 생성합니다...");

    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { mode: 0o700 });
    }

    const keyPair = sshUtils.generateKeyPairSync("ed25519");
    fs.writeFileSync(keyPath, keyPair.private, { mode: 0o600 });
    fs.writeFileSync(pubKeyPath, keyPair.public + "\n", { mode: 0o644 });

    logger.info(`SSH 키 생성 완료: ${keyPath}`);
  }

  const privateKey = fs.readFileSync(keyPath);
  const publicKey = fs.readFileSync(pubKeyPath, "utf-8").trim();

  // 각 서버에 대해 키 인증 확인
  for (const [label, target] of sshTargets) {
    const canAuth = await testSshKeyAuth(target, privateKey);
    if (canAuth) {
      logger.debug(`SSH 키 인증 확인: ${label}`);
      continue;
    }

    // 키 인증 실패 → 비밀번호로 공개키 등록
    logger.info(`${label}: SSH 키가 서버에 등록되어 있지 않습니다.`);
    const pass = await passwordPrompt({
      message: `${label} 비밀번호 (공개키 등록용):`,
    });

    await registerSshPublicKey(target, pass, publicKey);
    logger.info(`SSH 공개키 등록 완료: ${label}`);
  }
}

/**
 * SSH 키 인증 테스트 (접속 후 즉시 종료)
 */
function testSshKeyAuth(
  target: { host: string; port?: number; user: string },
  privateKey: Uint8Array,
): Promise<boolean> {
  return new Promise((resolve) => {
    const conn = new SshClient();
    conn.on("ready", () => {
      conn.end();
      resolve(true);
    });
    conn.on("error", () => {
      resolve(false);
    });
    conn.connect({
      host: target.host,
      port: target.port ?? 22,
      username: target.user,
      privateKey,
      readyTimeout: 10_000,
    });
  });
}

/**
 * 비밀번호로 서버에 접속하여 SSH 공개키를 등록
 */
function registerSshPublicKey(
  target: { host: string; port?: number; user: string },
  pass: string,
  publicKey: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new SshClient();
    conn.on("ready", () => {
      // authorized_keys에 공개키 추가
      const cmd = [
        "mkdir -p ~/.ssh",
        "chmod 700 ~/.ssh",
        `echo '${publicKey}' >> ~/.ssh/authorized_keys`,
        "chmod 600 ~/.ssh/authorized_keys",
      ].join(" && ");

      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          reject(new Error(`SSH 명령 실행 실패: ${err.message}`));
          return;
        }

        let stderr = "";
        stream.stderr.on("data", (data: Uint8Array) => {
          stderr += data.toString();
        });
        stream.on("close", (code: number | null) => {
          conn.end();
          if (code !== 0) {
            reject(new Error(`SSH 공개키 등록 실패 (exit code: ${code}): ${stderr}`));
          } else {
            resolve();
          }
        });
      });
    });
    conn.on("error", (err) => {
      reject(new Error(`SSH 접속 실패 (${target.host}): ${err.message}`));
    });
    conn.connect({
      host: target.host,
      port: target.port ?? 22,
      username: target.user,
      password: pass,
      readyTimeout: 10_000,
    });
  });
}
```

**Key points:**
- `sshUtils.generateKeyPairSync("ed25519")` produces OpenSSH format keys directly
- `testSshKeyAuth`: connects with privateKey, resolves `true` on success, `false` on any error
- `registerSshPublicKey`: connects with password, runs shell commands to append public key
- `publicKey` is in `ssh-ed25519 AAAA...` format, safe for shell `echo` (no special chars)
- Timeout of 10 seconds for both operations

**Step 3: Verify typecheck**

```bash
pnpm typecheck packages/sd-cli
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/sd-cli/src/commands/publish.ts
git commit -m "feat(sd-cli): add SSH key auth pre-verification for SFTP publish"
```

---

### Task 4: Integrate `ensureSshAuth` into Phase 1

**Files:**
- Modify: `packages/sd-cli/src/commands/publish.ts:392-412`

**Step 1: Add ensureSshAuth call after npm auth check**

In `runPublish()`, after the npm auth check block (line 412) and before the Git check (line 414), insert:

```typescript
  // SSH 키 인증 확인 (pass 없는 SFTP publish 설정이 있는 경우)
  try {
    await ensureSshAuth(publishPackages, logger);
  } catch (err) {
    consola.error(`SSH 인증 설정 실패: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }
```

**Step 2: Verify typecheck and lint**

```bash
pnpm typecheck packages/sd-cli
pnpm lint packages/sd-cli
```

Expected: both PASS

**Step 3: Commit**

```bash
git add packages/sd-cli/src/commands/publish.ts
git commit -m "feat(sd-cli): integrate SSH pre-auth into publish Phase 1"
```

---

### Task 5: Manual end-to-end test

**Prerequisites:** An SFTP server to test against.

**Test 1: First-time SSH key setup**

1. Remove existing SSH key (backup first if needed):
   ```bash
   mv ~/.ssh/id_ed25519 ~/.ssh/id_ed25519.bak 2>/dev/null
   mv ~/.ssh/id_ed25519.pub ~/.ssh/id_ed25519.pub.bak 2>/dev/null
   ```

2. Ensure sd.config.ts has an SFTP publish config without `pass`:
   ```typescript
   publish: { type: "sftp", host: "example.com", user: "myuser", path: "/deploy" }
   ```

3. Run publish in dry-run mode:
   ```bash
   pnpm pub --dry-run
   ```

4. Expected:
   - "SSH 키가 없습니다. 생성합니다..." message
   - Password prompt appears
   - "SSH 공개키 등록 완료" message
   - `~/.ssh/id_ed25519` and `~/.ssh/id_ed25519.pub` exist
   - Publish proceeds (dry-run)

**Test 2: Subsequent publish (no password)**

1. Run publish again:
   ```bash
   pnpm pub --dry-run
   ```

2. Expected: No password prompt, SSH auth succeeds silently.

**Test 3: Existing `pass` still works**

1. Add `pass` back to config, run publish. Should use password auth as before.

**Step: Restore backup keys if applicable**

```bash
mv ~/.ssh/id_ed25519.bak ~/.ssh/id_ed25519 2>/dev/null
mv ~/.ssh/id_ed25519.pub.bak ~/.ssh/id_ed25519.pub 2>/dev/null
```
