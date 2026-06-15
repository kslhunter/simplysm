import { describe, it, expect, afterEach } from "vitest";
import { createServiceServer, type ServiceServer } from "@simplysm/service-server";
import tls from "node:tls";
import { X509Certificate } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// pebble 의 self-signed ACME API 인증서 수용 + ACME 디렉토리를 pebble 로 재정의
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
process.env["SD_ACME_DIRECTORY_URL"] = "https://localhost:14000/dir";

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
