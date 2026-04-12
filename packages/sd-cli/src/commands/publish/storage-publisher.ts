import path from "path";
import os from "os";
import fs from "fs";
import ssh2 from "ssh2";
import { password as passwordPrompt } from "@inquirer/prompts";
import { StorageFactory } from "@simplysm/storage";
import { env } from "@simplysm/core-common";
import type { consola } from "consola";
import type { SdPublishConfig, SdStoragePublishConfig } from "../../sd-config.types";

const { Client: SshClient, utils } = ssh2;

/**
 * 스토리지(FTP/FTPS/SFTP) 서버에 dist 디렉토리를 업로드한다
 */
export async function publishToStorage(
  pkgPath: string,
  pkgName: string,
  config: SdStoragePublishConfig,
  logger: ReturnType<typeof consola.withTag>,
  dryRun: boolean,
): Promise<void> {
  const distPath = path.resolve(pkgPath, "dist");
  const remotePath = config.path ?? "/";

  if (dryRun) {
    logger.info(`[DRY-RUN] [${pkgName}] ${config.type} 업로드: ${distPath} → ${remotePath}`);
  } else {
    logger.debug(`[${pkgName}] ${config.type} 업로드: ${distPath} → ${remotePath}`);
    await StorageFactory.connect(
      config.type,
      {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
      },
      async (storage) => {
        await storage.uploadDir(distPath, remotePath);
      },
    );
  }
}

/**
 * SSH 키 인증을 사전 검증하고 설정한다
 *
 * 비밀번호 없는 SFTP 서버의 경우:
 * 1. SSH 키 파일이 없으면 생성
 * 2. 키 인증을 테스트하고, 실패하면 비밀번호로 공개키를 등록
 */
export async function ensureSshAuth(
  publishPackages: Array<{ name: string; config: SdPublishConfig }>,
  logger: ReturnType<typeof consola.withTag>,
): Promise<void> {
  // 비밀번호 없는 SFTP 서버 수집 (user@host 기준 중복 제거)
  const sshTargets = new Map<string, { host: string; port?: number; user: string }>();
  for (const pkg of publishPackages) {
    if (pkg.config.type === "npm") continue;
    if (pkg.config.type !== "sftp") continue;
    if (pkg.config.password != null) continue;
    if (pkg.config.user == null) {
      throw new Error(`[${pkg.name}] SFTP 설정에 user가 누락되었습니다.`);
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
    logger.info("SSH 키를 찾을 수 없습니다. 생성 중...");

    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { mode: 0o700 });
    }

    const keyPair = utils.generateKeyPairSync("ed25519");
    fs.writeFileSync(keyPath, keyPair.private, { mode: 0o600 });
    fs.writeFileSync(pubKeyPath, keyPair.public + "\n", { mode: 0o644 });

    logger.info(`SSH 키 생성 완료: ${keyPath}`);
  }

  const privateKeyData = fs.readFileSync(keyPath);
  const publicKey = fs.readFileSync(pubKeyPath, "utf-8").trim();

  // 개인키 파싱 시도 (암호화 또는 형식 오류 시 Error 반환)
  const parsed = utils.parseKey(privateKeyData);
  const isKeyEncrypted = parsed instanceof Error;
  const sshAgent = env("SSH_AUTH_SOCK");

  // 각 서버에 대해 키 인증 검증
  for (const [label, target] of sshTargets) {
    const canAuth = await testSshKeyAuth(target, {
      privateKey: isKeyEncrypted ? undefined : privateKeyData,
      agent: sshAgent,
    });
    if (canAuth) {
      logger.debug(`SSH 키 인증 확인됨: ${label}`);
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
 * SSH 키 인증 테스트 (연결 후 즉시 종료)
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
      conn.end();
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
 * 비밀번호로 서버에 연결하여 SSH 공개키를 등록한다
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
          reject(new Error(`SSH 명령 실행 실패: ${err.message}`));
          return;
        }

        let stderr = "";
        stream.on("data", () => {}); // stdout 소비 (소비하지 않으면 스트림이 닫히지 않음)
        stream.stderr.on("data", (data: Uint8Array) => {
          stderr += data.toString();
        });
        stream.on("exit", (code: number | null) => {
          conn.end();
          if (code !== 0) {
            reject(new Error(`SSH 공개키 등록 실패 (종료 코드: ${code}): ${stderr}`));
          } else {
            resolve();
          }
        });
      });
    });
    conn.on("error", (err) => {
      reject(new Error(`SSH 연결 실패 (${target.host}): ${err.message}`));
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
