import fs from "fs";
import os from "os";
import path from "path";
import { execSync, spawnSync } from "child_process";
import readline from "readline";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const PROFILES_FILE = path.join(CLAUDE_DIR, "profiles.json");
const CREDENTIALS_FILE = path.join(CLAUDE_DIR, ".credentials.json");
const STATUSLINE_FILE = path.join(CLAUDE_DIR, "statusline-cache.json");

// --- helpers ---

function loadProfiles() {
  if (fs.existsSync(PROFILES_FILE)) {
    const data = JSON.parse(fs.readFileSync(PROFILES_FILE, "utf-8"));
    if (data.accounts != null) {
      return data;
    }
  }
  return { current: "", accounts: {} };
}

function saveProfiles(data) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function getRefreshToken() {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf-8"));
    return data.claudeAiOauth?.refreshToken ?? "";
  }
  return "";
}

function getUsage() {
  if (fs.existsSync(STATUSLINE_FILE)) {
    const data = JSON.parse(fs.readFileSync(STATUSLINE_FILE, "utf-8"));
    const rl = data.rate_limits ?? {};
    return {
      fiveHour: {
        usedPercentage: rl.five_hour?.used_percentage ?? null,
        resetsAt: rl.five_hour?.resets_at ?? null,
      },
      sevenDay: {
        usedPercentage: rl.seven_day?.used_percentage ?? null,
        resetsAt: rl.seven_day?.resets_at ?? null,
      },
    };
  }
  return null;
}

function formatRemaining(resetsAt) {
  if (resetsAt == null) return "N/A";
  const diff = resetsAt - Date.now() / 1000;
  if (diff <= 0) return "리셋됨";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d${hours}h`;
  if (hours > 0) return `${hours}h${minutes}m`;
  return `${minutes}m`;
}

function formatUsage(usage, isLive) {
  if (usage == null) return "[사용량 정보 없음]";
  const fhPct = usage.fiveHour?.usedPercentage;
  const sdPct = usage.sevenDay?.usedPercentage;
  if (fhPct == null && sdPct == null) return "[사용량 정보 없음]";
  const fhStr = `${fhPct}%(${formatRemaining(usage.fiveHour?.resetsAt)})`;
  const sdStr = `${sdPct}%(${formatRemaining(usage.sevenDay?.resetsAt)})`;
  const suffix = isLive ? "" : "  ← 저장 시점";
  return `[${fhStr}, ${sdStr}]${suffix}`;
}

function printList(profiles) {
  const accounts = profiles.accounts ?? {};
  const current = profiles.current ?? "";
  if (Object.keys(accounts).length === 0) {
    console.log("저장된 계정이 없습니다.");
    return;
  }
  console.log("=== 저장된 계정 ===");
  let idx = 0;
  for (const [name, info] of Object.entries(accounts)) {
    idx++;
    const isCurrent = name === current;
    const marker = isCurrent ? "*" : " ";
    const usage = isCurrent ? getUsage() : info.usage;
    const usageStr = formatUsage(usage, isCurrent);
    console.log(`${marker} ${idx}. ${name}  ${usageStr}`);
  }
}

function promptSelection(accountNames) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question("전환할 계정 번호를 입력하세요: ", (answer) => {
      rl.close();
      const num = parseInt(answer, 10);
      if (Number.isNaN(num) || num < 1 || num > accountNames.length) {
        resolve(null);
      } else {
        resolve(accountNames[num - 1]);
      }
    });
  });
}

// --- commands ---

export function save() {
  let org;
  try {
    const result = execSync("claude auth status", { encoding: "utf-8" });
    const authData = JSON.parse(result);
    org = authData.orgName ?? "";
  } catch {
    console.error("ERROR: claude auth status에서 Organization 이름을 가져올 수 없습니다.");
    process.exit(1);
  }
  if (org === "") {
    console.error("ERROR: Organization 이름이 비어 있습니다.");
    process.exit(1);
  }

  const rt = getRefreshToken();
  if (rt === "") {
    console.error("ERROR: refresh token을 찾을 수 없습니다.");
    process.exit(1);
  }

  const profiles = loadProfiles();
  profiles.accounts[org] = { refreshToken: rt, usage: getUsage() };
  profiles.current = org;
  saveProfiles(profiles);
  console.log(`프로필 '${org}' 저장 완료`);
}

export async function switch_() {
  if (!process.stdin.isTTY) {
    console.error("ERROR: TTY가 필요합니다. 터미널에서 직접 실행해주세요.");
    process.exit(1);
  }

  const profiles = loadProfiles();
  const accounts = profiles.accounts ?? {};
  const current = profiles.current ?? "";

  if (Object.keys(accounts).length === 0) {
    console.log("저장된 계정이 없습니다.");
    return;
  }

  printList(profiles);

  const accountNames = Object.keys(accounts);
  const selectable = accountNames.filter((name) => name !== current);

  if (selectable.length === 0) {
    console.log("\n전환할 수 있는 계정이 없습니다.");
    return;
  }

  // 선택 가능한 계정 번호 안내
  const selectableWithIdx = selectable.map((name) => ({
    name,
    idx: accountNames.indexOf(name) + 1,
  }));
  console.log(
    `\n선택 가능: ${selectableWithIdx.map((s) => `${s.idx}`).join(", ")}`,
  );

  const target = await promptSelection(accountNames);
  if (target == null || target === current) {
    console.log("전환을 취소했습니다.");
    return;
  }

  // 현재 계정 백업
  if (current !== "" && accounts[current] != null) {
    const latestRt = getRefreshToken();
    if (latestRt !== "") {
      accounts[current].refreshToken = latestRt;
    }
    const usage = getUsage();
    if (usage != null) {
      accounts[current].usage = usage;
    }
    saveProfiles(profiles);
  }

  // 전환
  const rt = accounts[target].refreshToken;
  spawnSync("claude", ["auth", "login"], {
    stdio: "inherit",
    env: {
      ...process.env,
      CLAUDE_CODE_OAUTH_REFRESH_TOKEN: rt,
      CLAUDE_CODE_OAUTH_SCOPES:
        "user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload",
    },
  });

  // 갱신된 refresh token 저장 + current 업데이트
  const newRt = getRefreshToken();
  if (newRt !== "") {
    accounts[target].refreshToken = newRt;
  }
  profiles.current = target;
  saveProfiles(profiles);
  console.log(`'${target}' 계정으로 전환 완료`);
}
