# sd-claude auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `sd-claude auth` CLI 명령어 그룹을 구현하여 Claude Code 다중 계정 인증 전환을 지원한다.

**Architecture:** yargs 기반 기존 `sd-claude` CLI에 `auth` 서브커맨드 그룹 추가. 공통 유틸리티(`auth-utils.ts`)를 통해 파일 I/O와 유효성 검사를 분리하고, 각 명령어(`auth-add/use/list/remove`)는 개별 파일로 구현한다. 테스트는 임시 디렉터리를 사용하여 실제 홈 디렉터리에 영향을 주지 않는다.

**Tech Stack:** Node.js built-in (`fs`, `path`, `os`), yargs 18, vitest

**Design doc:** `docs/plans/2026-02-25-sd-claude-auth-design.md`

---

### Task 1: auth-utils.ts — 공통 유틸리티

**Files:**
- Create: `packages/sd-claude/src/commands/auth-utils.ts`
- Test: `packages/sd-claude/tests/auth-utils.spec.ts`

**Step 1: Write the failing tests**

```typescript
// packages/sd-claude/tests/auth-utils.spec.ts
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getCurrentUserID,
  getProfileDir,
  listProfiles,
  profileExists,
  readCurrentAuth,
  readCurrentCredentials,
  validateName,
} from "@simplysm/sd-claude/commands/auth-utils.js";

describe("auth-utils", () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "sd-claude-test-"));
    // Setup fake ~/.claude.json
    fs.writeFileSync(
      path.join(tmpHome, ".claude.json"),
      JSON.stringify({
        numStartups: 1,
        oauthAccount: {
          accountUuid: "test-uuid",
          emailAddress: "test@example.com",
          organizationName: "TestOrg",
        },
        userID: "test-user-id",
      }),
    );
    // Setup fake ~/.claude/.credentials.json
    fs.mkdirSync(path.join(tmpHome, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpHome, ".claude", ".credentials.json"),
      JSON.stringify({
        claudeAiOauth: {
          accessToken: "test-token",
          refreshToken: "test-refresh",
          expiresAt: Date.now() + 3600000,
        },
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  describe("validateName", () => {
    it("accepts valid names", () => {
      expect(() => validateName("slkim")).not.toThrow();
      expect(() => validateName("my-profile")).not.toThrow();
      expect(() => validateName("test_01")).not.toThrow();
    });

    it("rejects invalid names", () => {
      expect(() => validateName("My Account")).toThrow("Invalid name");
      expect(() => validateName("한글")).toThrow("Invalid name");
      expect(() => validateName("")).toThrow("Invalid name");
      expect(() => validateName("UPPER")).toThrow("Invalid name");
    });
  });

  describe("getProfileDir", () => {
    it("returns correct path", () => {
      const result = getProfileDir("slkim", tmpHome);
      expect(result).toBe(path.join(tmpHome, ".sd-claude", "auth", "slkim"));
    });
  });

  describe("profileExists", () => {
    it("returns false when profile does not exist", () => {
      expect(profileExists("nonexistent", tmpHome)).toBe(false);
    });

    it("returns true when profile exists", () => {
      const dir = path.join(tmpHome, ".sd-claude", "auth", "slkim");
      fs.mkdirSync(dir, { recursive: true });
      expect(profileExists("slkim", tmpHome)).toBe(true);
    });
  });

  describe("listProfiles", () => {
    it("returns empty array when no profiles", () => {
      expect(listProfiles(tmpHome)).toEqual([]);
    });

    it("returns profile names", () => {
      const authDir = path.join(tmpHome, ".sd-claude", "auth");
      fs.mkdirSync(path.join(authDir, "slkim"), { recursive: true });
      fs.mkdirSync(path.join(authDir, "kslhunter"), { recursive: true });
      expect(listProfiles(tmpHome).sort()).toEqual(["kslhunter", "slkim"]);
    });
  });

  describe("readCurrentAuth", () => {
    it("returns oauthAccount and userID", () => {
      const result = readCurrentAuth(tmpHome);
      expect(result.userID).toBe("test-user-id");
      expect(result.oauthAccount.emailAddress).toBe("test@example.com");
    });

    it("throws when not logged in", () => {
      fs.writeFileSync(path.join(tmpHome, ".claude.json"), JSON.stringify({ numStartups: 1 }));
      expect(() => readCurrentAuth(tmpHome)).toThrow("Not logged in");
    });
  });

  describe("readCurrentCredentials", () => {
    it("returns credentials object", () => {
      const result = readCurrentCredentials(tmpHome);
      expect(result.claudeAiOauth.accessToken).toBe("test-token");
    });
  });

  describe("getCurrentUserID", () => {
    it("returns current userID", () => {
      expect(getCurrentUserID(tmpHome)).toBe("test-user-id");
    });

    it("returns undefined when no userID", () => {
      fs.writeFileSync(path.join(tmpHome, ".claude.json"), JSON.stringify({}));
      expect(getCurrentUserID(tmpHome)).toBeUndefined();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/sd-claude/tests/auth-utils.spec.ts --run --project node`
Expected: FAIL — modules not found

**Step 3: Write the implementation**

```typescript
// packages/sd-claude/src/commands/auth-utils.ts
import fs from "fs";
import os from "os";
import path from "path";

const NAME_PATTERN = /^[a-z0-9_-]+$/;

export function validateName(name: string): void {
  if (!NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid name '${name}'. Use only lowercase letters, numbers, hyphens, underscores.`,
    );
  }
}

export function getProfileDir(name: string, homeDir: string = os.homedir()): string {
  return path.join(homeDir, ".sd-claude", "auth", name);
}

export function profileExists(name: string, homeDir: string = os.homedir()): boolean {
  return fs.existsSync(getProfileDir(name, homeDir));
}

export function listProfiles(homeDir: string = os.homedir()): string[] {
  const authDir = path.join(homeDir, ".sd-claude", "auth");
  if (!fs.existsSync(authDir)) return [];

  return fs
    .readdirSync(authDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export function readCurrentAuth(homeDir: string = os.homedir()): {
  oauthAccount: Record<string, unknown>;
  userID: string;
} {
  const claudeJsonPath = path.join(homeDir, ".claude.json");
  const data = JSON.parse(fs.readFileSync(claudeJsonPath, "utf-8")) as Record<string, unknown>;

  if (data["oauthAccount"] == null || data["userID"] == null) {
    throw new Error("Not logged in. Run /login first.");
  }

  return {
    oauthAccount: data["oauthAccount"] as Record<string, unknown>,
    userID: data["userID"] as string,
  };
}

export function readCurrentCredentials(homeDir: string = os.homedir()): Record<string, unknown> {
  const credPath = path.join(homeDir, ".claude", ".credentials.json");
  return JSON.parse(fs.readFileSync(credPath, "utf-8")) as Record<string, unknown>;
}

export function getCurrentUserID(homeDir: string = os.homedir()): string | undefined {
  const claudeJsonPath = path.join(homeDir, ".claude.json");
  if (!fs.existsSync(claudeJsonPath)) return undefined;

  const data = JSON.parse(fs.readFileSync(claudeJsonPath, "utf-8")) as Record<string, unknown>;
  return data["userID"] as string | undefined;
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/sd-claude/tests/auth-utils.spec.ts --run --project node`
Expected: PASS (all 9 tests)

**Step 5: Commit**

```bash
git add packages/sd-claude/src/commands/auth-utils.ts packages/sd-claude/tests/auth-utils.spec.ts
git commit -m "feat(sd-claude): add auth-utils with tests"
```

---

### Task 2: auth-add.ts — 계정 저장

**Files:**
- Create: `packages/sd-claude/src/commands/auth-add.ts`
- Test: `packages/sd-claude/tests/auth-add.spec.ts`

**Step 1: Write the failing tests**

```typescript
// packages/sd-claude/tests/auth-add.spec.ts
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runAuthAdd } from "@simplysm/sd-claude/commands/auth-add.js";

describe("auth-add", () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "sd-claude-test-"));
    fs.writeFileSync(
      path.join(tmpHome, ".claude.json"),
      JSON.stringify({
        numStartups: 1,
        oauthAccount: {
          accountUuid: "test-uuid",
          emailAddress: "test@example.com",
          organizationName: "TestOrg",
        },
        userID: "test-user-id",
      }),
    );
    fs.mkdirSync(path.join(tmpHome, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpHome, ".claude", ".credentials.json"),
      JSON.stringify({
        claudeAiOauth: { accessToken: "tok", refreshToken: "ref", expiresAt: 9999999999999 },
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it("saves auth.json and credentials.json to profile directory", () => {
    runAuthAdd("myprofile", tmpHome);

    const profileDir = path.join(tmpHome, ".sd-claude", "auth", "myprofile");
    expect(fs.existsSync(profileDir)).toBe(true);

    const auth = JSON.parse(fs.readFileSync(path.join(profileDir, "auth.json"), "utf-8"));
    expect(auth.userID).toBe("test-user-id");
    expect(auth.oauthAccount.emailAddress).toBe("test@example.com");

    const creds = JSON.parse(fs.readFileSync(path.join(profileDir, "credentials.json"), "utf-8"));
    expect(creds.claudeAiOauth.accessToken).toBe("tok");
  });

  it("throws when profile already exists", () => {
    runAuthAdd("myprofile", tmpHome);
    expect(() => runAuthAdd("myprofile", tmpHome)).toThrow("already exists");
  });

  it("throws with invalid name", () => {
    expect(() => runAuthAdd("Bad Name", tmpHome)).toThrow("Invalid name");
  });

  it("throws when not logged in", () => {
    fs.writeFileSync(path.join(tmpHome, ".claude.json"), JSON.stringify({}));
    expect(() => runAuthAdd("test", tmpHome)).toThrow("Not logged in");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/sd-claude/tests/auth-add.spec.ts --run --project node`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// packages/sd-claude/src/commands/auth-add.ts
import fs from "fs";
import path from "path";
import os from "os";
import {
  getProfileDir,
  profileExists,
  readCurrentAuth,
  readCurrentCredentials,
  validateName,
} from "./auth-utils.js";

export function runAuthAdd(name: string, homeDir: string = os.homedir()): void {
  validateName(name);

  if (profileExists(name, homeDir)) {
    throw new Error(
      `Profile '${name}' already exists. Remove it first with: sd-claude auth remove ${name}`,
    );
  }

  const { oauthAccount, userID } = readCurrentAuth(homeDir);
  const credentials = readCurrentCredentials(homeDir);

  const profileDir = getProfileDir(name, homeDir);
  fs.mkdirSync(profileDir, { recursive: true });
  fs.writeFileSync(path.join(profileDir, "auth.json"), JSON.stringify({ oauthAccount, userID }, null, 2));
  fs.writeFileSync(path.join(profileDir, "credentials.json"), JSON.stringify(credentials, null, 2));

  const email = (oauthAccount as Record<string, unknown>)["emailAddress"] ?? "unknown";
  // eslint-disable-next-line no-console
  console.log(`Saved profile '${name}' (${email})`);
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/sd-claude/tests/auth-add.spec.ts --run --project node`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add packages/sd-claude/src/commands/auth-add.ts packages/sd-claude/tests/auth-add.spec.ts
git commit -m "feat(sd-claude): add auth-add command with tests"
```

---

### Task 3: auth-use.ts — 계정 전환

**Files:**
- Create: `packages/sd-claude/src/commands/auth-use.ts`
- Test: `packages/sd-claude/tests/auth-use.spec.ts`

**Step 1: Write the failing tests**

```typescript
// packages/sd-claude/tests/auth-use.spec.ts
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runAuthUse } from "@simplysm/sd-claude/commands/auth-use.js";

describe("auth-use", () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "sd-claude-test-"));
    // Current claude.json
    fs.writeFileSync(
      path.join(tmpHome, ".claude.json"),
      JSON.stringify({
        numStartups: 99,
        oauthAccount: { emailAddress: "current@example.com" },
        userID: "current-id",
        someOtherField: "preserved",
      }),
    );
    fs.mkdirSync(path.join(tmpHome, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpHome, ".claude", ".credentials.json"),
      JSON.stringify({ claudeAiOauth: { accessToken: "current-tok" } }),
    );
    // Saved profile
    const profileDir = path.join(tmpHome, ".sd-claude", "auth", "other");
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, "auth.json"),
      JSON.stringify({
        oauthAccount: { emailAddress: "other@example.com", organizationName: "OtherOrg" },
        userID: "other-id",
      }),
    );
    fs.writeFileSync(
      path.join(profileDir, "credentials.json"),
      JSON.stringify({
        claudeAiOauth: { accessToken: "other-tok", expiresAt: Date.now() + 3600000 },
      }),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it("replaces oauthAccount and userID while preserving other fields", () => {
    runAuthUse("other", tmpHome);

    const claudeJson = JSON.parse(fs.readFileSync(path.join(tmpHome, ".claude.json"), "utf-8"));
    expect(claudeJson.oauthAccount.emailAddress).toBe("other@example.com");
    expect(claudeJson.userID).toBe("other-id");
    expect(claudeJson.numStartups).toBe(99);
    expect(claudeJson.someOtherField).toBe("preserved");
  });

  it("replaces credentials.json", () => {
    runAuthUse("other", tmpHome);

    const creds = JSON.parse(
      fs.readFileSync(path.join(tmpHome, ".claude", ".credentials.json"), "utf-8"),
    );
    expect(creds.claudeAiOauth.accessToken).toBe("other-tok");
  });

  it("warns when token is expired", () => {
    // Set expired token
    const profileDir = path.join(tmpHome, ".sd-claude", "auth", "other");
    fs.writeFileSync(
      path.join(profileDir, "credentials.json"),
      JSON.stringify({
        claudeAiOauth: { accessToken: "expired-tok", expiresAt: Date.now() - 1000 },
      }),
    );

    // Should not throw, just warn
    expect(() => runAuthUse("other", tmpHome)).not.toThrow();
  });

  it("throws when profile not found", () => {
    expect(() => runAuthUse("nonexistent", tmpHome)).toThrow("not found");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/sd-claude/tests/auth-use.spec.ts --run --project node`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// packages/sd-claude/src/commands/auth-use.ts
import fs from "fs";
import path from "path";
import os from "os";
import { getProfileDir, profileExists, validateName } from "./auth-utils.js";

export function runAuthUse(name: string, homeDir: string = os.homedir()): void {
  validateName(name);

  if (!profileExists(name, homeDir)) {
    throw new Error(`Profile '${name}' not found.`);
  }

  const profileDir = getProfileDir(name, homeDir);
  const auth = JSON.parse(fs.readFileSync(path.join(profileDir, "auth.json"), "utf-8")) as {
    oauthAccount: Record<string, unknown>;
    userID: string;
  };
  const credentials = JSON.parse(
    fs.readFileSync(path.join(profileDir, "credentials.json"), "utf-8"),
  ) as Record<string, unknown>;

  // Check token expiry
  const oauth = credentials["claudeAiOauth"] as Record<string, unknown> | undefined;
  if (oauth != null && typeof oauth["expiresAt"] === "number" && oauth["expiresAt"] < Date.now()) {
    // eslint-disable-next-line no-console
    console.warn("Warning: Token expired. Run /login after switching.");
  }

  // Replace only oauthAccount and userID in ~/.claude.json (preserve all other fields)
  const claudeJsonPath = path.join(homeDir, ".claude.json");
  const claudeJson = JSON.parse(fs.readFileSync(claudeJsonPath, "utf-8")) as Record<
    string,
    unknown
  >;
  claudeJson["oauthAccount"] = auth.oauthAccount;
  claudeJson["userID"] = auth.userID;
  fs.writeFileSync(claudeJsonPath, JSON.stringify(claudeJson, null, 2));

  // Replace credentials.json entirely
  const credPath = path.join(homeDir, ".claude", ".credentials.json");
  fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));

  const email = (auth.oauthAccount["emailAddress"] as string) ?? "unknown";
  // eslint-disable-next-line no-console
  console.log(`Switched to ${name} (${email})`);
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/sd-claude/tests/auth-use.spec.ts --run --project node`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add packages/sd-claude/src/commands/auth-use.ts packages/sd-claude/tests/auth-use.spec.ts
git commit -m "feat(sd-claude): add auth-use command with tests"
```

---

### Task 4: auth-list.ts — 계정 목록

**Files:**
- Create: `packages/sd-claude/src/commands/auth-list.ts`
- Test: `packages/sd-claude/tests/auth-list.spec.ts`

**Step 1: Write the failing tests**

```typescript
// packages/sd-claude/tests/auth-list.spec.ts
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAuthList } from "@simplysm/sd-claude/commands/auth-list.js";

describe("auth-list", () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "sd-claude-test-"));
    // Current user
    fs.writeFileSync(
      path.join(tmpHome, ".claude.json"),
      JSON.stringify({ userID: "user-a-id" }),
    );
    fs.mkdirSync(path.join(tmpHome, ".claude"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  function createProfile(
    name: string,
    email: string,
    org: string,
    userID: string,
    expiresAt: number,
  ): void {
    const dir = path.join(tmpHome, ".sd-claude", "auth", name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "auth.json"),
      JSON.stringify({
        oauthAccount: { emailAddress: email, organizationName: org },
        userID,
      }),
    );
    fs.writeFileSync(
      path.join(dir, "credentials.json"),
      JSON.stringify({ claudeAiOauth: { expiresAt } }),
    );
  }

  it("outputs profile list with active marker", () => {
    createProfile("alice", "alice@test.com", "AliceCorp", "user-a-id", Date.now() + 86400000);
    createProfile("bob", "bob@test.com", "BobInc", "user-b-id", Date.now() + 86400000);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    runAuthList(tmpHome);

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("* alice");
    expect(output).toContain("alice@test.com");
    expect(output).toContain("[AliceCorp]");
    expect(output).toContain("  bob");
    expect(output).not.toContain("* bob");

    consoleSpy.mockRestore();
  });

  it("outputs message when no profiles exist", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    runAuthList(tmpHome);

    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("No saved profiles");

    consoleSpy.mockRestore();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/sd-claude/tests/auth-list.spec.ts --run --project node`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// packages/sd-claude/src/commands/auth-list.ts
import fs from "fs";
import path from "path";
import os from "os";
import { getCurrentUserID, getProfileDir, listProfiles } from "./auth-utils.js";

export function runAuthList(homeDir: string = os.homedir()): void {
  const profiles = listProfiles(homeDir);
  if (profiles.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No saved profiles.");
    return;
  }

  const currentUserID = getCurrentUserID(homeDir);

  for (const name of profiles.sort()) {
    const profileDir = getProfileDir(name, homeDir);

    const auth = JSON.parse(fs.readFileSync(path.join(profileDir, "auth.json"), "utf-8")) as {
      oauthAccount: Record<string, unknown>;
      userID: string;
    };
    const credentials = JSON.parse(
      fs.readFileSync(path.join(profileDir, "credentials.json"), "utf-8"),
    ) as Record<string, unknown>;

    const email = (auth.oauthAccount["emailAddress"] as string) ?? "unknown";
    const org = (auth.oauthAccount["organizationName"] as string) ?? "Personal";
    const isActive = auth.userID === currentUserID;
    const prefix = isActive ? "* " : "  ";

    const oauth = credentials["claudeAiOauth"] as Record<string, unknown> | undefined;
    let expiresStr = "unknown";
    if (oauth != null && typeof oauth["expiresAt"] === "number") {
      const d = new Date(oauth["expiresAt"]);
      expiresStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    // eslint-disable-next-line no-console
    console.log(`${prefix}${name} (${email}) [${org}] expires: ${expiresStr}`);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/sd-claude/tests/auth-list.spec.ts --run --project node`
Expected: PASS (all 2 tests)

**Step 5: Commit**

```bash
git add packages/sd-claude/src/commands/auth-list.ts packages/sd-claude/tests/auth-list.spec.ts
git commit -m "feat(sd-claude): add auth-list command with tests"
```

---

### Task 5: auth-remove.ts — 계정 삭제

**Files:**
- Create: `packages/sd-claude/src/commands/auth-remove.ts`
- Test: `packages/sd-claude/tests/auth-remove.spec.ts`

**Step 1: Write the failing tests**

```typescript
// packages/sd-claude/tests/auth-remove.spec.ts
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAuthRemove } from "@simplysm/sd-claude/commands/auth-remove.js";

describe("auth-remove", () => {
  let tmpHome: string;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "sd-claude-test-"));
    fs.writeFileSync(
      path.join(tmpHome, ".claude.json"),
      JSON.stringify({ userID: "active-id" }),
    );
    // Create a profile
    const dir = path.join(tmpHome, ".sd-claude", "auth", "myprofile");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "auth.json"),
      JSON.stringify({ oauthAccount: { emailAddress: "test@test.com" }, userID: "other-id" }),
    );
    fs.writeFileSync(path.join(dir, "credentials.json"), JSON.stringify({}));
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it("removes profile directory", () => {
    runAuthRemove("myprofile", tmpHome);

    const dir = path.join(tmpHome, ".sd-claude", "auth", "myprofile");
    expect(fs.existsSync(dir)).toBe(false);
  });

  it("warns when removing active profile", () => {
    // Make profile the active one
    const dir = path.join(tmpHome, ".sd-claude", "auth", "myprofile");
    fs.writeFileSync(
      path.join(dir, "auth.json"),
      JSON.stringify({ oauthAccount: {}, userID: "active-id" }),
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    runAuthRemove("myprofile", tmpHome);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("currently active"));
    expect(fs.existsSync(dir)).toBe(false);

    warnSpy.mockRestore();
  });

  it("throws when profile not found", () => {
    expect(() => runAuthRemove("nonexistent", tmpHome)).toThrow("not found");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/sd-claude/tests/auth-remove.spec.ts --run --project node`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// packages/sd-claude/src/commands/auth-remove.ts
import fs from "fs";
import path from "path";
import os from "os";
import { getCurrentUserID, getProfileDir, profileExists, validateName } from "./auth-utils.js";

export function runAuthRemove(name: string, homeDir: string = os.homedir()): void {
  validateName(name);

  if (!profileExists(name, homeDir)) {
    throw new Error(`Profile '${name}' not found.`);
  }

  // Check if active
  const profileDir = getProfileDir(name, homeDir);
  const auth = JSON.parse(fs.readFileSync(path.join(profileDir, "auth.json"), "utf-8")) as {
    userID: string;
  };
  const currentUserID = getCurrentUserID(homeDir);
  if (auth.userID === currentUserID) {
    // eslint-disable-next-line no-console
    console.warn(`Warning: '${name}' is currently active.`);
  }

  fs.rmSync(profileDir, { recursive: true });

  // eslint-disable-next-line no-console
  console.log(`Removed profile '${name}'`);
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/sd-claude/tests/auth-remove.spec.ts --run --project node`
Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add packages/sd-claude/src/commands/auth-remove.ts packages/sd-claude/tests/auth-remove.spec.ts
git commit -m "feat(sd-claude): add auth-remove command with tests"
```

---

### Task 6: CLI 등록 — sd-claude.ts + index.ts

**Files:**
- Modify: `packages/sd-claude/src/sd-claude.ts`
- Modify: `packages/sd-claude/src/index.ts`

**Step 1: Update sd-claude.ts with auth command group**

```typescript
// packages/sd-claude/src/sd-claude.ts — full file
#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { runInstall } from "./commands/install.js";
import { runAuthAdd } from "./commands/auth-add.js";
import { runAuthUse } from "./commands/auth-use.js";
import { runAuthList } from "./commands/auth-list.js";
import { runAuthRemove } from "./commands/auth-remove.js";

await yargs(hideBin(process.argv))
  .help("help", "도움말")
  .alias("help", "h")
  .command(
    "install",
    "Claude Code 에셋을 프로젝트에 설치한다.",
    (cmd) => cmd.version(false).hide("help"),
    () => {
      runInstall();
    },
  )
  .command("auth", "인증 계정 관리", (sub) =>
    sub
      .command(
        "add <name>",
        "현재 로그인된 계정을 저장",
        (cmd) =>
          cmd.positional("name", { type: "string", demandOption: true, describe: "프로필 이름" }),
        (argv) => {
          runAuthAdd(argv.name);
        },
      )
      .command(
        "use <name>",
        "저장된 계정으로 전환",
        (cmd) =>
          cmd.positional("name", { type: "string", demandOption: true, describe: "프로필 이름" }),
        (argv) => {
          runAuthUse(argv.name);
        },
      )
      .command(
        "list",
        "저장된 계정 목록 표시",
        (cmd) => cmd,
        () => {
          runAuthList();
        },
      )
      .command(
        "remove <name>",
        "저장된 계정 삭제",
        (cmd) =>
          cmd.positional("name", { type: "string", demandOption: true, describe: "프로필 이름" }),
        (argv) => {
          runAuthRemove(argv.name);
        },
      )
      .demandCommand(1, "auth 서브 명령어를 지정해주세요."),
  )
  .demandCommand(1, "명령어를 지정해주세요.")
  .strict()
  .parse();
```

**Step 2: Update index.ts to export new commands**

```typescript
// packages/sd-claude/src/index.ts — full file
// Commands
export * from "./commands/install.js";
export * from "./commands/auth-utils.js";
export * from "./commands/auth-add.js";
export * from "./commands/auth-use.js";
export * from "./commands/auth-list.js";
export * from "./commands/auth-remove.js";
```

**Step 3: Build and verify**

Run: `pnpm sd-cli build sd-claude`
Expected: Build succeeds with no errors

**Step 4: Manual smoke test**

Run: `node packages/sd-claude/dist/sd-claude.js auth --help`
Expected: Shows auth subcommands (add, use, list, remove)

**Step 5: Commit**

```bash
git add packages/sd-claude/src/sd-claude.ts packages/sd-claude/src/index.ts
git commit -m "feat(sd-claude): register auth command group in CLI"
```
