import { execaSync } from "execa";
import path from "path";
import { fileURLToPath } from "url";

// pebble ACME API 는 자체 self-signed 인증서를 쓰므로 검증 비활성화
// eslint-disable-next-line no-restricted-properties -- 테스트 인프라: 환경변수 설정 필요
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const composePath = path.resolve(__dirname, "docker-compose.test.yml");

export async function setup() {
  console.log("[acme] Docker 컨테이너 시작 중 (pebble, challtestsrv)...");
  execaSync("docker", ["compose", "-f", composePath, "up", "-d"], {
    stdio: "inherit",
    timeout: 180_000,
  });

  await waitForPebble();

  // 컨테이너에서 호스트로 도달 가능한 IP (Docker 의 host-gateway = host.docker.internal).
  // challtestsrv 가 모든 도메인을 이 IP 로 응답 → pebble 이 호스트의 테스트 서버로 검증 접속.
  const hostIp = getHostGatewayIp();
  const res = await fetch("http://localhost:8055/set-default-ipv4", {
    method: "POST",
    body: JSON.stringify({ ip: hostIp }),
  });
  if (!res.ok) {
    throw new Error(`[acme] challtestsrv set-default-ipv4 실패: HTTP ${res.status}`);
  }
  // 기본 AAAA(IPv6=::1) 응답 제거 — 남겨두면 pebble 이 IPv6 를 우선해 엉뚱한 곳(::1)으로 검증 접속함
  const res6 = await fetch("http://localhost:8055/set-default-ipv6", {
    method: "POST",
    body: JSON.stringify({ ip: "" }),
  });
  if (!res6.ok) {
    throw new Error(`[acme] challtestsrv set-default-ipv6(clear) 실패: HTTP ${res6.status}`);
  }
  console.log(`[acme] 준비 완료. 검증 도메인 → ${hostIp}:5001 (호스트 테스트 서버)`);
}

export function teardown() {
  console.log("[acme] Docker 컨테이너 종료 중...");
  try {
    execaSync("docker", ["compose", "-f", composePath, "down"], {
      stdio: "inherit",
      timeout: 60_000,
    });
  } catch (err) {
    console.error("[acme] Docker 컨테이너 종료 실패:", err);
  }
}

function getHostGatewayIp(): string {
  // 컨테이너 안에서 host-gateway(=호스트) 가 어떤 IP 로 보이는지 alpine 으로 조회.
  // 예: "192.168.65.254  host.docker.internal" → 첫 토큰이 IP.
  const out = execaSync("docker", [
    "run",
    "--rm",
    "--add-host=host.docker.internal:host-gateway",
    "alpine",
    "getent",
    "ahostsv4",
    "host.docker.internal",
  ]).stdout.trim();
  // 예: "192.168.65.254  STREAM host.docker.internal" (첫 줄 첫 토큰이 IPv4)
  const ip = out.split(/\s+/)[0];
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    throw new Error(`[acme] host-gateway IPv4 확인 실패: "${out}"`);
  }
  return ip;
}

async function waitForPebble(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch("https://localhost:14000/dir");
      if (res.ok) return;
    } catch {
      // 아직 미준비
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("[acme] pebble ACME 디렉토리 준비 timeout");
}
