import { describe, it, expect, afterEach, vi } from "vitest";
import { createServiceServer, type ServiceServer } from "@simplysm/service-server";
import tls from "node:tls";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { X509Certificate } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// pebble 의 self-signed ACME API 인증서 수용 + ACME 디렉토리를 pebble 로 재정의
/* eslint-disable no-restricted-properties -- 테스트 인프라: 환경변수 설정 필요 */
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
process.env["SD_ACME_DIRECTORY_URL"] = "https://localhost:14000/dir";
/* eslint-enable no-restricted-properties */

const DOMAIN = "acme-test.example";
// pebble 기본 config 의 tlsPort 와 동일해야 함 (pebble 이 이 포트로 TLS-ALPN-01 검증)
const PORT = 5001;

describe("service-server Let's Encrypt (TLS-ALPN-01)", () => {
  let server: ServiceServer | undefined;

  afterEach(async () => {
    if (server != null) {
      await server.close();
      server = undefined;
    }
  });

  it("pebble 로부터 인증서를 발급받아 서버에 적용한다", async () => {
    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "sd-acme-"));

    server = createServiceServer({
      rootPath,
      port: PORT,
      services: [],
      auth: false,
      ssl: { letsencrypt: { domains: [DOMAIN], email: "test@example.com" } },
    });

    // listen() 이 최초 발급 완료까지 대기(하이브리드). 발급 실패 시 throw.
    await server.listen();

    // 1) 발급 인증서가 .acme/ 에 저장되고 도메인을 포함하는지
    const certPem = await fs.readFile(path.join(rootPath, ".acme", "cert.pem"), "utf-8");
    const x509 = new X509Certificate(certPem);
    expect(x509.subjectAltName).toContain(`DNS:${DOMAIN}`);
    // pebble(CA) 발급이므로 issuer 와 subject 가 다름 (self-signed 아님)
    expect(x509.issuer).not.toBe(x509.subject);

    // 2) 서버가 발급 인증서를 실제로 서빙하는지 (setSecureContext 적용 확인)
    const peerCert = await getPeerCertificate("localhost", PORT, DOMAIN);
    expect(peerCert.subjectaltname ?? "").toContain(`DNS:${DOMAIN}`);
  });
});

const DNS_DOMAIN = "dns-acme-test.example";
// DNS-01 은 인바운드 검증이 없으므로 pebble 의 tlsPort 와 무관한 임의 포트면 됨
const DNS_PORT = 5002;
const CHALLTESTSRV_URL = "http://localhost:8055";

describe("service-server Let's Encrypt (DNS-01, Cloudflare)", () => {
  let server: ServiceServer | undefined;
  let mockCf: http.Server | undefined;

  afterEach(async () => {
    if (server != null) {
      await server.close();
      server = undefined;
    }
    if (mockCf != null) {
      await new Promise<void>((resolve) => mockCf!.close(() => resolve()));
      mockCf = undefined;
    }
    vi.unstubAllEnvs();
  });

  it("Cloudflare(mock)+pebble 로부터 DNS-01 인증서를 발급받아 서버에 적용한다", async () => {
    // mock Cloudflare API: zone 조회 + TXT 등록/삭제를 challtestsrv 로 위임한다.
    mockCf = await startMockCloudflare(DNS_DOMAIN);
    const cfAddr = mockCf.address() as AddressInfo;
    vi.stubEnv("SD_CLOUDFLARE_API_BASE_URL", `http://localhost:${cfAddr.port}`);

    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "sd-acme-dns-"));

    server = createServiceServer({
      rootPath,
      port: DNS_PORT,
      services: [],
      auth: false,
      ssl: {
        letsencrypt: {
          domains: [DNS_DOMAIN],
          email: "test@example.com",
          cloudflareApiToken: "test-token",
        },
      },
    });

    // listen() 이 최초 발급 완료까지 대기(하이브리드). 발급 실패 시 throw.
    await server.listen();

    // 1) 발급 인증서가 .acme/ 에 저장되고 도메인을 포함하는지
    const certPem = await fs.readFile(path.join(rootPath, ".acme", "cert.pem"), "utf-8");
    const x509 = new X509Certificate(certPem);
    expect(x509.subjectAltName).toContain(`DNS:${DNS_DOMAIN}`);
    // pebble(CA) 발급이므로 issuer 와 subject 가 다름 (self-signed 아님)
    expect(x509.issuer).not.toBe(x509.subject);

    // 2) 서버가 발급 인증서를 실제로 서빙하는지 (setSecureContext 적용 확인)
    const peerCert = await getPeerCertificate("localhost", DNS_PORT, DNS_DOMAIN);
    expect(peerCert.subjectaltname ?? "").toContain(`DNS:${DNS_DOMAIN}`);
  });

  it("발급 CA(directoryUrl)가 캐시 메타와 다르면 캐시를 무효화하고 재발급한다", async () => {
    mockCf = await startMockCloudflare(DNS_DOMAIN);
    const cfAddr = mockCf.address() as AddressInfo;
    vi.stubEnv("SD_CLOUDFLARE_API_BASE_URL", `http://localhost:${cfAddr.port}`);

    const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "sd-acme-meta-"));
    const metaPath = path.join(rootPath, ".acme", "issued-meta.json");
    const certPath = path.join(rootPath, ".acme", "cert.pem");

    const sslOption = {
      letsencrypt: {
        domains: [DNS_DOMAIN],
        email: "test@example.com",
        cloudflareApiToken: "test-token",
      },
    };

    // 1차 발급 → 메타에 발급 directory 기록
    const server1 = createServiceServer({
      rootPath,
      port: DNS_PORT,
      services: [],
      auth: false,
      ssl: sslOption,
    });
    await server1.listen();
    const certBefore = await fs.readFile(certPath, "utf-8");
    const metaBefore = JSON.parse(await fs.readFile(metaPath, "utf-8")) as { directoryUrl: string };
    expect(metaBefore.directoryUrl).toContain("14000"); // pebble 디렉토리가 기록됐는지
    await server1.close();

    // 메타를 다른 CA 로 변조 (staging↔production 같은 발급 CA 전환 시뮬레이션)
    await fs.writeFile(metaPath, JSON.stringify({ directoryUrl: "https://other-ca.example/dir" }));

    // 재기동 → 캐시 무효화 → 재발급
    server = createServiceServer({
      rootPath,
      port: DNS_PORT,
      services: [],
      auth: false,
      ssl: sslOption,
    });
    await server.listen();
    const certAfter = await fs.readFile(certPath, "utf-8");
    const metaAfter = JSON.parse(await fs.readFile(metaPath, "utf-8")) as { directoryUrl: string };

    // 변조된 메타가 현재 directory 로 복구됨 = 재발급 발생
    expect(metaAfter.directoryUrl).toBe(metaBefore.directoryUrl);
    expect(metaAfter.directoryUrl).not.toBe("https://other-ca.example/dir");
    expect(certAfter).not.toBe(certBefore);
  });
});

/**
 * Cloudflare API v4 의 최소 mock.
 * - `GET /zones?name=` → zoneName 과 일치할 때만 zone 반환
 * - `POST /zones/:id/dns_records` → challtestsrv `/set-txt` 로 위임
 * - `DELETE /zones/:id/dns_records/:recordId` → challtestsrv `/clear-txt` 로 위임
 */
function startMockCloudflare(zoneName: string): Promise<http.Server> {
  return new Promise((resolve) => {
    const createdHosts = new Map<string, string>();
    let seq = 0;

    const srv = http.createServer((req, res) => {
      void (async () => {
        const url = new URL(req.url ?? "", "http://localhost");
        const send = (body: unknown): void => {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify(body));
        };

        if (req.method === "GET" && url.pathname === "/zones") {
          const name = url.searchParams.get("name");
          const result = name === zoneName ? [{ id: "zone-1", name: zoneName }] : [];
          send({ success: true, errors: [], result });
          return;
        }

        if (req.method === "POST" && /^\/zones\/[^/]+\/dns_records$/.test(url.pathname)) {
          const body = (await readJsonBody(req)) as { name: string; content: string };
          const host = `${body.name}.`;
          await fetch(`${CHALLTESTSRV_URL}/set-txt`, {
            method: "POST",
            body: JSON.stringify({ host, value: body.content }),
          });
          const id = `rec-${++seq}`;
          createdHosts.set(id, host);
          send({ success: true, errors: [], result: { id } });
          return;
        }

        const delMatch = /^\/zones\/[^/]+\/dns_records\/([^/]+)$/.exec(url.pathname);
        if (req.method === "DELETE" && delMatch != null) {
          const id = delMatch[1];
          const host = createdHosts.get(id);
          if (host != null) {
            await fetch(`${CHALLTESTSRV_URL}/clear-txt`, {
              method: "POST",
              body: JSON.stringify({ host }),
            });
          }
          send({ success: true, errors: [], result: { id } });
          return;
        }

        res.writeHead(404);
        res.end();
      })();
    });

    srv.listen(0, () => resolve(srv));
  });
}

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    req.on("error", reject);
  });
}

function getPeerCertificate(
  host: string,
  port: number,
  servername: string,
): Promise<tls.PeerCertificate> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host, port, servername, rejectUnauthorized: false, ALPNProtocols: ["http/1.1"] },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        resolve(cert);
      },
    );
    socket.on("error", reject);
  });
}
