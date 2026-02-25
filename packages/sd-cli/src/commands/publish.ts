import path from "path";
import semver from "semver";
import { consola } from "consola";
import { StorageFactory } from "@simplysm/storage";
import { fsExists, fsRead, fsReadJson, fsWrite, fsGlob, fsCopy } from "@simplysm/core-node";
import { env, jsonStringify } from "@simplysm/core-common";
import "@simplysm/core-common";
import type { SdConfig, SdPublishConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { execa } from "execa";
import { runBuild } from "./build";
import { parseWorkspaceGlobs } from "../utils/replace-deps";
import os from "os";
import fs from "fs";
import ssh2 from "ssh2";
import { password as passwordPrompt } from "@inquirer/prompts";

const { Client: SshClient, utils } = ssh2;

//#region Types

/**
 * Publish command options
 */
export interface PublishOptions {
  /** Filter for packages to deploy (empty array deploys all packages with publish config) */
  targets: string[];
  /** Deploy without building (dangerous) */
  noBuild: boolean;
  /** Simulate deployment without actually deploying */
  dryRun: boolean;
  /** Additional options to pass to sd.config.ts */
  options: string[];
}

/**
 * package.json type (required fields only)
 */
interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

//#endregion

//#region Utilities

/**
 * Replace environment variables (%VAR% format)
 * @throws throws an error if any variable substitution is empty
 */
function replaceEnvVariables(str: string, version: string, projectPath: string): string {
  const result = str.replace(/%([^%]+)%/g, (match, envName: string) => {
    if (envName === "VER") {
      return version;
    }
    if (envName === "PROJECT") {
      return projectPath;
    }
    return (env[envName] as string | undefined) ?? match;
  });

  // Throw error if any unsubstituted environment variables remain
  if (/%[^%]+%/.test(result)) {
    throw new Error(`Environment variable substitution failed: ${str} → ${result}`);
  }

  return result;
}

/**
 * Wait with countdown
 */
async function waitWithCountdown(message: string, seconds: number): Promise<void> {
  for (let i = seconds; i > 0; i--) {
    if (i !== seconds && process.stdout.isTTY) {
      process.stdout.cursorTo(0);
    }
    process.stdout.write(`${message} ${i}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (process.stdout.isTTY) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
  } else {
    process.stdout.write("\n");
  }
}

/**
 * Pre-verify and configure SSH key authentication
 *
 * For SFTP servers without pass:
 * 1. Generate SSH key file if it doesn't exist
 * 2. Test key authentication, and if it fails, register public key using password
 */
async function ensureSshAuth(
  publishPackages: Array<{ name: string; config: SdPublishConfig }>,
  logger: ReturnType<typeof consola.withTag>,
): Promise<void> {
  // Collect SFTP servers without pass (deduplicate user@host)
  const sshTargets = new Map<string, { host: string; port?: number; user: string }>();
  for (const pkg of publishPackages) {
    if (pkg.config === "npm") continue;
    if (pkg.config.type !== "sftp") continue;
    if (pkg.config.pass != null) continue;
    if (pkg.config.user == null) {
      throw new Error(`[${pkg.name}] SFTP config missing user.`);
    }
    const key = `${pkg.config.user}@${pkg.config.host}`;
    sshTargets.set(key, {
      host: pkg.config.host,
      port: pkg.config.port,
      user: pkg.config.user,
    });
  }

  if (sshTargets.size === 0) return;

  // Check/create SSH key file
  const sshDir = path.join(os.homedir(), ".ssh");
  const keyPath = path.join(sshDir, "id_ed25519");
  const pubKeyPath = path.join(sshDir, "id_ed25519.pub");

  if (!fs.existsSync(keyPath)) {
    logger.info("SSH key not found. Creating one...");

    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { mode: 0o700 });
    }

    const keyPair = utils.generateKeyPairSync("ed25519");
    fs.writeFileSync(keyPath, keyPair.private, { mode: 0o600 });
    fs.writeFileSync(pubKeyPath, keyPair.public + "\n", { mode: 0o644 });

    logger.info(`SSH key created: ${keyPath}`);
  }

  const privateKeyData = fs.readFileSync(keyPath);
  const publicKey = fs.readFileSync(pubKeyPath, "utf-8").trim();

  // Check if privateKey is encrypted
  const parsed = utils.parseKey(privateKeyData);
  const isKeyEncrypted = parsed instanceof Error;
  const sshAgent = process.env["SSH_AUTH_SOCK"];

  // Verify key authentication for each server
  for (const [label, target] of sshTargets) {
    const canAuth = await testSshKeyAuth(target, {
      privateKey: isKeyEncrypted ? undefined : privateKeyData,
      agent: sshAgent,
    });
    if (canAuth) {
      logger.debug(`SSH key authentication verified: ${label}`);
      continue;
    }

    // Key authentication failed → register public key using password
    logger.info(`${label}: SSH key not registered on server.`);
    const pass = await passwordPrompt({
      message: `${label} password (to register public key):`,
    });

    await registerSshPublicKey(target, pass, publicKey);
    logger.info(`SSH public key registered: ${label}`);
  }
}

/**
 * Test SSH key authentication (connect and immediately disconnect)
 */
function testSshKeyAuth(
  target: { host: string; port?: number; user: string },
  auth: { privateKey?: Buffer; agent?: string },
): Promise<boolean> {
  if (auth.privateKey == null && auth.agent == null) {
    return Promise.resolve(false);
  }

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
      ...(auth.privateKey != null ? { privateKey: auth.privateKey } : {}),
      ...(auth.agent != null ? { agent: auth.agent } : {}),
      readyTimeout: 10_000,
    });
  });
}

/**
 * Connect to server with password and register SSH public key
 */
function registerSshPublicKey(
  target: { host: string; port?: number; user: string },
  pass: string,
  publicKey: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new SshClient();
    conn.on("ready", () => {
      // Add public key to authorized_keys
      const escapedKey = publicKey.replace(/'/g, "'\\''");
      const cmd = [
        "mkdir -p ~/.ssh",
        "chmod 700 ~/.ssh",
        `echo '${escapedKey}' >> ~/.ssh/authorized_keys`,
        "chmod 600 ~/.ssh/authorized_keys",
      ].join(" && ");

      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          reject(new Error(`Failed to execute SSH command: ${err.message}`));
          return;
        }

        let stderr = "";
        stream.on("data", () => {}); // Consume stdout (unconsumed stream won't close)
        stream.stderr.on("data", (data: Uint8Array) => {
          stderr += data.toString();
        });
        stream.on("exit", (code: number | null) => {
          conn.end();
          if (code !== 0) {
            reject(new Error(`Failed to register SSH public key (exit code: ${code}): ${stderr}`));
          } else {
            resolve();
          }
        });
      });
    });
    conn.on("error", (err) => {
      reject(new Error(`SSH connection failed (${target.host}): ${err.message}`));
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

//#endregion

//#region Version Upgrade

/**
 * Upgrade project and package versions
 * @param dryRun if true, only calculate new version without modifying files
 */
async function upgradeVersion(
  cwd: string,
  allPkgPaths: string[],
  dryRun: boolean,
): Promise<{ version: string; changedFiles: string[] }> {
  const changedFiles: string[] = [];
  const projPkgPath = path.resolve(cwd, "package.json");
  const projPkg = await fsReadJson<PackageJson>(projPkgPath);

  const currentVersion = projPkg.version;
  const prereleaseInfo = semver.prerelease(currentVersion);

  // Determine increment strategy based on prerelease status
  const newVersion =
    prereleaseInfo !== null
      ? semver.inc(currentVersion, "prerelease")!
      : semver.inc(currentVersion, "patch")!;

  if (dryRun) {
    // dry-run: return new version without modifying files
    return { version: newVersion, changedFiles: [] };
  }

  projPkg.version = newVersion;
  await fsWrite(projPkgPath, jsonStringify(projPkg, { space: 2 }) + "\n");
  changedFiles.push(projPkgPath);

  // Set version in each package's package.json
  for (const pkgPath of allPkgPaths) {
    const pkgJsonPath = path.resolve(pkgPath, "package.json");
    const pkgJson = await fsReadJson<PackageJson>(pkgJsonPath);
    pkgJson.version = newVersion;
    await fsWrite(pkgJsonPath, jsonStringify(pkgJson, { space: 2 }) + "\n");
    changedFiles.push(pkgJsonPath);
  }

  // Synchronize @simplysm package version in template files
  const templateFiles = await fsGlob(path.resolve(cwd, "packages/sd-cli/templates/**/*.hbs"));
  const versionRegex = /("@simplysm\/[^"]+"\s*:\s*)"~[^"]+"/g;

  for (const templatePath of templateFiles) {
    const content = await fsRead(templatePath);
    const newContent = content.replace(versionRegex, `$1"~${newVersion}"`);

    if (content !== newContent) {
      await fsWrite(templatePath, newContent);
      changedFiles.push(templatePath);
    }
  }

  return { version: newVersion, changedFiles };
}

//#endregion

//#region Package Publishing

/**
 * Publish individual package
 * @param dryRun if true, simulate deployment without actually publishing
 */
async function publishPackage(
  pkgPath: string,
  publishConfig: SdPublishConfig,
  version: string,
  projectPath: string,
  logger: ReturnType<typeof consola.withTag>,
  dryRun: boolean,
): Promise<void> {
  const pkgName = path.basename(pkgPath);

  if (publishConfig === "npm") {
    // npm publish
    const prereleaseInfo = semver.prerelease(version);
    const args = ["publish", "--access", "public", "--no-git-checks"];

    if (prereleaseInfo !== null && typeof prereleaseInfo[0] === "string") {
      args.push("--tag", prereleaseInfo[0]);
    }

    if (dryRun) {
      args.push("--dry-run");
      logger.info(`[DRY-RUN] [${pkgName}] pnpm ${args.join(" ")}`);
    } else {
      logger.debug(`[${pkgName}] pnpm ${args.join(" ")}`);
    }

    await execa("pnpm", args, { cwd: pkgPath });
  } else if (publishConfig.type === "local-directory") {
    // Copy to local directory
    const targetPath = replaceEnvVariables(publishConfig.path, version, projectPath);
    const distPath = path.resolve(pkgPath, "dist");

    if (dryRun) {
      logger.info(`[DRY-RUN] [${pkgName}] copy to local: ${distPath} → ${targetPath}`);
    } else {
      logger.debug(`[${pkgName}] copy to local: ${distPath} → ${targetPath}`);
      await fsCopy(distPath, targetPath);
    }
  } else {
    // Upload to storage
    const distPath = path.resolve(pkgPath, "dist");
    const remotePath = publishConfig.path ?? "/";

    if (dryRun) {
      logger.info(
        `[DRY-RUN] [${pkgName}] ${publishConfig.type} upload: ${distPath} → ${remotePath}`,
      );
    } else {
      logger.debug(`[${pkgName}] ${publishConfig.type} upload: ${distPath} → ${remotePath}`);
      await StorageFactory.connect(
        publishConfig.type,
        {
          host: publishConfig.host,
          port: publishConfig.port,
          user: publishConfig.user,
          pass: publishConfig.pass,
        },
        async (storage) => {
          await storage.uploadDir(distPath, remotePath);
        },
      );
    }
  }
}

//#endregion

//#region Dependency Levels

/**
 * Calculate dependency levels for packages to publish.
 * Packages with no dependencies → Level 0, depends only on Level 0 → Level 1, ...
 */
async function computePublishLevels(
  publishPkgs: Array<{ name: string; path: string; config: SdPublishConfig }>,
): Promise<Array<Array<{ name: string; path: string; config: SdPublishConfig }>>> {
  const pkgNames = new Set(publishPkgs.map((p) => p.name));

  // Collect workspace dependencies for each package
  const depsMap = new Map<string, Set<string>>();
  for (const pkg of publishPkgs) {
    const pkgJson = await fsReadJson<PackageJson>(path.resolve(pkg.path, "package.json"));
    const allDeps = {
      ...pkgJson.dependencies,
      ...pkgJson.peerDependencies,
      ...pkgJson.optionalDependencies,
    };

    const workspaceDeps = new Set<string>();
    for (const depName of Object.keys(allDeps)) {
      const shortName = depName.replace(/^@simplysm\//, "");
      if (shortName !== depName && pkgNames.has(shortName)) {
        workspaceDeps.add(shortName);
      }
    }
    depsMap.set(pkg.name, workspaceDeps);
  }

  // Topological sort to classify into levels
  const levels: Array<Array<{ name: string; path: string; config: SdPublishConfig }>> = [];
  const assigned = new Set<string>();
  const remaining = new Map(publishPkgs.map((p) => [p.name, p]));

  while (remaining.size > 0) {
    const level: Array<{ name: string; path: string; config: SdPublishConfig }> = [];
    for (const [name, pkg] of remaining) {
      const deps = depsMap.get(name)!;
      if ([...deps].every((d) => assigned.has(d))) {
        level.push(pkg);
      }
    }

    if (level.length === 0) {
      // Circular dependency — place all remaining packages in final level
      levels.push([...remaining.values()]);
      break;
    }

    for (const pkg of level) {
      assigned.add(pkg.name);
      remaining.delete(pkg.name);
    }
    levels.push(level);
  }

  return levels;
}

//#endregion

//#region Main

/**
 * Execute publish command.
 *
 * **Deployment order (safety first):**
 * 1. Pre-validation (npm auth, Git status)
 * 2. Version upgrade (package.json + templates)
 * 3. Build
 * 4. Git commit/tag/push (explicitly stage only changed files)
 * 5. pnpm deployment
 * 6. postPublish (continue even if it fails)
 */
export async function runPublish(options: PublishOptions): Promise<void> {
  const { targets, noBuild, dryRun } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:publish");

  if (dryRun) {
    logger.info("[DRY-RUN] Simulation mode - no actual deployment");
  }

  logger.debug("publish start", { targets, noBuild, dryRun });

  // Load sd.config.ts
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: false, opt: options.options });
    logger.debug("sd.config.ts loaded");
  } catch (err) {
    logger.error(`Failed to load sd.config.ts: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // Load package.json
  const projPkgPath = path.resolve(cwd, "package.json");
  const projPkg = await fsReadJson<PackageJson>(projPkgPath);

  // Collect workspace package paths from pnpm-workspace.yaml
  const workspaceYamlPath = path.resolve(cwd, "pnpm-workspace.yaml");
  const workspaceGlobs: string[] = [];
  if (await fsExists(workspaceYamlPath)) {
    const yamlContent = await fsRead(workspaceYamlPath);
    workspaceGlobs.push(...parseWorkspaceGlobs(yamlContent));
  }

  const allPkgPaths = (
    await Promise.all(workspaceGlobs.map((item) => fsGlob(path.resolve(cwd, item))))
  )
    .flat()
    .filter((item) => !path.basename(item).includes("."));

  // Filter packages with publish configuration
  const publishPackages: Array<{
    name: string;
    path: string;
    config: SdPublishConfig;
  }> = [];

  for (const [name, config] of Object.entries(sdConfig.packages)) {
    if (config == null) continue;
    if (config.target === "scripts") continue;

    const pkgConfig = config;
    if (pkgConfig.publish == null) continue;

    // If targets is specified, include only those packages
    if (targets.length > 0 && !targets.includes(name)) continue;

    const pkgPath = allPkgPaths.find((p) => path.basename(p) === name);
    if (pkgPath == null) {
      logger.warn(`Package not found: ${name}`);
      continue;
    }

    publishPackages.push({
      name,
      path: pkgPath,
      config: pkgConfig.publish,
    });
  }

  if (publishPackages.length === 0) {
    process.stdout.write("✔ No packages to deploy.\n");
    return;
  }

  logger.debug(
    "Target packages to deploy",
    publishPackages.map((p) => p.name),
  );

  // Check if Git is available
  const hasGit = await fsExists(path.resolve(cwd, ".git"));

  //#region Phase 1: Pre-validation

  // Verify npm authentication (if npm publish config exists)
  if (publishPackages.some((p) => p.config === "npm")) {
    logger.debug("Verifying npm authentication...");
    try {
      const { stdout: whoami } = await execa("npm", ["whoami"]);
      if (whoami.trim() === "") {
        throw new Error("npm login information not found.");
      }
      logger.debug(`npm login verified: ${whoami.trim()}`);
    } catch (err) {
      logger.error(`npm whoami failed:`, err);
      /*logger.error(
        "npm token is invalid or expired.\n" +
          "Create a Granular Access Token at https://www.npmjs.com/settings/~/tokens, then:\n" +
          "  npm config set //registry.npmjs.org/:_authToken <token>",
      );*/
      process.exitCode = 1;
      return;
    }
  }

  // Verify SSH key authentication (if SFTP publish config without pass exists)
  try {
    await ensureSshAuth(publishPackages, logger);
  } catch (err) {
    logger.error(`Failed to setup SSH authentication: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // Check for uncommitted changes and attempt auto-commit (unless noBuild is set)
  if (!noBuild && hasGit) {
    logger.debug("Checking git commit status...");
    try {
      const { stdout: diff } = await execa("git", ["diff", "--name-only"]);
      const { stdout: stagedDiff } = await execa("git", ["diff", "--cached", "--name-only"]);

      if (diff.trim() !== "" || stagedDiff.trim() !== "") {
        logger.info("Uncommitted changes detected. Attempting auto-commit with claude...");
        try {
          await execa("claude", [
            "-p",
            "/sd-commit all",
            "--dangerously-skip-permissions",
            "--model",
            "haiku",
          ]);
        } catch (e) {
          throw new Error(
            "Auto-commit failed. Please commit manually and try again.\n" +
              (e instanceof Error ? e.message : String(e)),
          );
        }

        // Re-verify after commit
        const { stdout: recheckDiff } = await execa("git", ["diff", "--name-only"]);
        const { stdout: recheckStaged } = await execa("git", ["diff", "--cached", "--name-only"]);
        if (recheckDiff.trim() !== "" || recheckStaged.trim() !== "") {
          throw new Error(
            "Uncommitted changes still remain after auto-commit.\n" + recheckDiff + recheckStaged,
          );
        }
        logger.info("Auto-commit completed.");
      }
    } catch (err) {
      logger.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
      return;
    }
  }

  //#endregion

  //#region Phase 2 & 3: Build or noBuild warning

  let version = projPkg.version;

  if (noBuild) {
    // noBuild warning
    logger.warn("Deploying without building is quite dangerous.");
    await waitWithCountdown("Press 'CTRL+C' to stop the process.", 5);
  } else {
    // Version upgrade
    logger.debug("Upgrading version...");
    const upgradeResult = await upgradeVersion(cwd, allPkgPaths, dryRun);
    version = upgradeResult.version;
    const _changedFiles = upgradeResult.changedFiles;
    if (dryRun) {
      logger.info(`[DRY-RUN] Version upgrade: ${projPkg.version} → ${version} (files not modified)`);
    } else {
      logger.info(`Version upgrade: ${projPkg.version} → ${version}`);
    }

    // Run build
    if (dryRun) {
      logger.info("[DRY-RUN] Starting build (validation only)...");
    } else {
      logger.debug("Starting build...");
    }

    try {
      await runBuild({
        targets: publishPackages.map((p) => p.name),
        options: options.options,
      });

      // Check build failure
      if (process.exitCode === 1) {
        throw new Error("Build failed");
      }
    } catch {
      if (dryRun) {
        logger.error("[DRY-RUN] Build failed");
      } else {
        logger.error(
          "Build failed. Manual recovery may be necessary:\n" +
            "  To revert version changes:\n" +
            "    git checkout -- package.json packages/*/package.json packages/sd-cli/templates/",
        );
      }
      process.exitCode = 1;
      return;
    }

    //#region Phase 3: Git commit/tag/push

    if (hasGit) {
      if (dryRun) {
        logger.info("[DRY-RUN] Simulating Git commit/tag/push...");
        logger.info(`[DRY-RUN] git add (${_changedFiles.length} files)`);
        logger.info(`[DRY-RUN] git commit -m "v${version}"`);
        logger.info(`[DRY-RUN] git tag -a v${version} -m "v${version}"`);
        logger.info("[DRY-RUN] git push --dry-run");
        await execa("git", ["push", "--dry-run"]);
        logger.info("[DRY-RUN] git push --tags --dry-run");
        await execa("git", ["push", "--tags", "--dry-run"]);
        logger.info("[DRY-RUN] Git operations simulation completed");
      } else {
        logger.debug("Git commit/tag/push...");
        try {
          await execa("git", ["add", ..._changedFiles]);
          await execa("git", ["commit", "-m", `v${version}`]);
          await execa("git", ["tag", "-a", `v${version}`, "-m", `v${version}`]);
          await execa("git", ["push"]);
          await execa("git", ["push", "--tags"]);
          logger.debug("Git operations completed");
        } catch (err) {
          logger.error(
            `Git operations failed: ${err instanceof Error ? err.message : err}\n` +
              "Manual recovery may be necessary:\n" +
              `  git revert HEAD  # Revert version commit\n` +
              `  git tag -d v${version}  # Delete tag`,
          );
          process.exitCode = 1;
          return;
        }
      }
    }

    //#endregion
  }

  //#endregion

  //#region Phase 4: Deployment (sequential by dependency level, parallel within level)

  const levels = await computePublishLevels(publishPackages);
  const publishedPackages: string[] = [];
  let publishFailed = false;

  // Sequential execution per level
  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    if (publishFailed) break;

    const levelPkgs = levels[levelIdx];
    logger.start(`Level ${levelIdx + 1}/${levels.length}`);

    // Parallel execution within level (Promise.allSettled)
    const publishPromises = levelPkgs.map(async (pkg) => {
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await publishPackage(pkg.path, pkg.config, version, cwd, logger, dryRun);
          logger.debug(dryRun ? `[DRY-RUN] ${pkg.name}` : pkg.name);
          publishedPackages.push(pkg.name);
          return { status: "success" as const, name: pkg.name };
        } catch (err) {
          if (attempt < maxRetries) {
            const delay = attempt * 5_000;
            logger.debug(
              dryRun
                ? `[DRY-RUN] ${pkg.name} (retry ${attempt + 1}/${maxRetries})`
                : `${pkg.name} (retry ${attempt + 1}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            throw err;
          }
        }
      }
      // Fallback for TypeScript type checker (actually unreachable)
      return { status: "error" as const, name: pkg.name, error: new Error("Unknown error") };
    });

    const results = await Promise.allSettled(publishPromises);

    // Check for failures within level
    const levelFailed = results.some((r) => r.status === "rejected");
    if (levelFailed) {
      publishFailed = true;
      logger.fail(`Level ${levelIdx + 1}/${levels.length}`);
    } else {
      logger.success(`Level ${levelIdx + 1}/${levels.length}`);
    }
  }

  // Check failed packages
  const allPkgNames = publishPackages.map((p) => p.name);
  const failedPkgNames = allPkgNames.filter((n) => !publishedPackages.includes(n));

  if (failedPkgNames.length > 0) {
    if (publishedPackages.length > 0) {
      logger.error(
        "Error during deployment.\n" +
          "Already deployed packages:\n" +
          publishedPackages.map((n) => `  - ${n}`).join("\n") +
          "\n\nManual recovery may be necessary.\n" +
          "npm packages can be deleted within 72 hours with `npm unpublish <pkg>@<version>`.",
      );
    }

    for (const name of failedPkgNames) {
      logger.error(`[${name}] Deployment failed`);
    }
    process.exitCode = 1;
    return;
  }

  //#endregion

  //#region Phase 5: postPublish

  if (sdConfig.postPublish != null && sdConfig.postPublish.length > 0) {
    if (dryRun) {
      logger.info("[DRY-RUN] Simulating postPublish scripts...");
    } else {
      logger.debug("Running postPublish scripts...");
    }

    for (const script of sdConfig.postPublish) {
      try {
        const cmd = replaceEnvVariables(script.cmd, version, cwd);
        const args = script.args.map((arg) => replaceEnvVariables(arg, version, cwd));

        if (dryRun) {
          logger.info(`[DRY-RUN] Will execute: ${cmd} ${args.join(" ")}`);
        } else {
          logger.debug(`Executing: ${cmd} ${args.join(" ")}`);
          await execa(cmd, args, { cwd });
        }
      } catch (err) {
        // On postPublish failure, only warn (no deployment rollback possible)
        logger.warn(
          `postPublish script failed (continuing): ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  //#endregion

  if (dryRun) {
    logger.info(`[DRY-RUN] Simulation completed. Actual deployment version: v${version}`);
  } else {
    logger.info(`All deployments completed. (v${version})`);
  }
}

//#endregion
