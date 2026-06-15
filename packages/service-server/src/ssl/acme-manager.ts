import * as acme from "acme-client";
import tls from "node:tls";
import { Resolver, resolveNs, resolve4 } from "node:dns/promises";
import { chmod } from "node:fs/promises";
import path from "node:path";
import { fsx } from "@simplysm/core-node";
import { createLogger, env } from "@simplysm/core-common";

const logger = createLogger("service-server:AcmeManager");

/** 만료 이 시점 전이면 갱신 (30일) */
const RENEW_BEFORE_MS = 30 * 24 * 60 * 60 * 1000;
/** 갱신 실패 시 재시도 간격 (1시간) */
const RETRY_DELAY_MS = 60 * 60 * 1000;
/** setTimeout 최대 지연 (약 24.8일). 초과 시 분할하여 재무장 */
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;
/** DNS-01 전파 확인 최대 시도 횟수 */
const DNS_PROPAGATION_MAX_TRIES = 30;
/** DNS-01 전파 확인 간격 (2초). 최대 약 60초 대기 */
const DNS_PROPAGATION_INTERVAL_MS = 2000;
/** Cloudflare API 기본 base URL */
const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";

/** auto() 의 챌린지 방식별 옵션 (TLS-ALPN-01 / DNS-01 공통 부분 제외) */
type AcmeAutoChallengeOptions = Pick<
  acme.ClientAutoOptions,
  "challengePriority" | "challengeCreateFn" | "challengeRemoveFn"
>;

export interface AcmeManagerOptions {
  rootPath: string;
  domains: string[];
  email: string;
  staging?: boolean;
  /** 지정 시 DNS-01(Cloudflare) 로 발급. 미지정 시 TLS-ALPN-01 로 발급 */
  cloudflareApiToken?: string;
}

export interface AcmeCertMaterial {
  /** 개인키 PEM */
  key: string;
  /** 인증서 체인 PEM */
  cert: string;
}

/**
 * Let's Encrypt(ACME) 인증서 자동 발급·갱신 매니저.
 *
 * `cloudflareApiToken` 이 있으면 DNS-01 챌린지(Cloudflare TXT 자동 등록)로 발급하고,
 * 없으면 TLS-ALPN-01 챌린지로 발급한다. TLS-ALPN-01 의 챌린지 응답 인증서는
 * {@link getChallengeContext} 로 노출하여 서버의 ALPNCallback 이 `acme-tls/1` 핸드셰이크에 주입한다.
 */
export class AcmeManager {
  private readonly _dir: string;
  private _challengeContext: tls.SecureContext | undefined;
  private _renewTimer: NodeJS.Timeout | undefined;
  private _onRenew: ((material: AcmeCertMaterial) => void) | undefined;
  /** DNS-01: 도메인별로 생성한 Cloudflare TXT 레코드 (challengeRemoveFn 에서 삭제용) */
  private readonly _dnsRecords = new Map<string, { zoneId: string; recordId: string }>();

  constructor(private readonly _options: AcmeManagerOptions) {
    this._dir = path.resolve(_options.rootPath, ".acme");
  }

  private get _accountKeyPath(): string {
    return path.resolve(this._dir, "account.key");
  }
  private get _certPath(): string {
    return path.resolve(this._dir, "cert.pem");
  }
  private get _certKeyPath(): string {
    return path.resolve(this._dir, "cert.key");
  }
  private get _metaPath(): string {
    return path.resolve(this._dir, "issued-meta.json");
  }

  /** ALPNCallback 에서 사용할 현재 챌린지 컨텍스트 (챌린지 진행 중에만 존재) */
  getChallengeContext(): tls.SecureContext | undefined {
    return this._challengeContext;
  }

  /** 갱신 성공 시 호출될 핸들러 등록 (무중단 핫스왑용) */
  onRenew(handler: (material: AcmeCertMaterial) => void): void {
    this._onRenew = handler;
  }

  /**
   * 적용할 인증서를 확보한다.
   * 캐시된 유효 인증서가 있으면 로드, 없으면(또는 만료 임박) 신규 발급.
   * 발급 실패 시 throw (하이브리드 기동: 최초 발급 실패는 기동 실패).
   */
  async ensureCertificate(): Promise<AcmeCertMaterial> {
    const cached = await this._loadValidCachedCert();
    if (cached != null) {
      logger.info(`캐시된 인증서 사용 (만료: ${cached.notAfter.toISOString()})`);
      this._scheduleRenewal(cached.notAfter);
      return { key: cached.key, cert: cached.cert };
    }

    logger.info("유효한 캐시 인증서 없음. 신규 발급을 시작합니다.");
    return this._issue();
  }

  /** 갱신 타이머 정리 */
  stop(): void {
    if (this._renewTimer != null) {
      clearTimeout(this._renewTimer);
      this._renewTimer = undefined;
    }
  }

  private async _loadValidCachedCert(): Promise<
    { key: string; cert: string; notAfter: Date } | undefined
  > {
    if (!(await fsx.exists(this._certPath)) || !(await fsx.exists(this._certKeyPath))) {
      return undefined;
    }

    // 발급에 사용한 CA(directoryUrl)가 현재 설정과 다르거나 메타가 없으면 캐시 무효화 (재발급).
    // staging↔production↔사설 CA 전환 시 캐시된 이전 CA 인증서를 그대로 쓰는 것을 막는다.
    const issuedDirectoryUrl = await this._readIssuedDirectoryUrl();
    if (issuedDirectoryUrl !== this._directoryUrl()) {
      logger.info("발급 CA(directoryUrl)가 현재 설정과 다름. 재발급을 진행합니다.");
      return undefined;
    }

    const cert = await fsx.read(this._certPath);
    const key = await fsx.read(this._certKeyPath);

    let info;
    try {
      info = acme.crypto.readCertificateInfo(cert);
    } catch (err) {
      logger.warn("캐시 인증서 파싱 실패. 재발급을 진행합니다.", err);
      return undefined;
    }

    // 만료 30일 이내면 캐시 무효 처리 (즉시 갱신 대상)
    if (info.notAfter.getTime() - Date.now() <= RENEW_BEFORE_MS) {
      return undefined;
    }

    // 요청 도메인을 모두 포함하는지 확인
    const certDomains = new Set([info.domains.commonName, ...info.domains.altNames]);
    if (!this._options.domains.every((d) => certDomains.has(d))) {
      logger.info("캐시 인증서가 요청 도메인을 모두 포함하지 않음. 재발급을 진행합니다.");
      return undefined;
    }

    return { key, cert, notAfter: info.notAfter };
  }

  private _directoryUrl(): string {
    // 운영 환경 변수로 ACME 디렉토리 URL 재정의 가능 (사설 CA·테스트용 pebble 등)
    const override = env("SD_ACME_DIRECTORY_URL");
    if (override != null && override !== "") return override;

    return this._options.staging === true
      ? acme.directory.letsencrypt.staging
      : acme.directory.letsencrypt.production;
  }

  /** 캐시된 인증서의 발급 CA(directoryUrl). 메타 부재·파싱 실패 시 undefined */
  private async _readIssuedDirectoryUrl(): Promise<string | undefined> {
    if (!(await fsx.exists(this._metaPath))) return undefined;
    try {
      const meta = JSON.parse(await fsx.read(this._metaPath)) as { directoryUrl?: string };
      return meta.directoryUrl;
    } catch {
      return undefined;
    }
  }

  private async _getAccountKey(): Promise<string> {
    if (await fsx.exists(this._accountKeyPath)) {
      return fsx.read(this._accountKeyPath);
    }
    const accountKey = (await acme.crypto.createPrivateRsaKey()).toString();
    await fsx.write(this._accountKeyPath, accountKey);
    await chmod(this._accountKeyPath, 0o600).catch(() => {});
    return accountKey;
  }

  private async _issue(): Promise<AcmeCertMaterial> {
    const accountKey = await this._getAccountKey();
    const client = new acme.Client({ directoryUrl: this._directoryUrl(), accountKey });

    const [certKey, csr] = await acme.crypto.createCsr({
      commonName: this._options.domains[0],
      altNames: this._options.domains,
    });

    const cert = await client.auto({
      csr,
      email: this._options.email,
      termsOfServiceAgreed: true,
      // 로컬 사전검증 생략. 실검증은 CA(LE) 가 직접 수행한다.
      // - TLS-ALPN-01: 발급 호스트의 hairpin(자기 공개 도메인:443) 접속이 막힐 수 있어 생략.
      // - DNS-01: self-verify 는 호스트 resolver 를 쓰므로, 전파 확인은 challengeCreateFn 에서 직접 수행.
      skipChallengeVerification: true,
      ...(this._options.cloudflareApiToken != null
        ? this._dns01AutoOptions(this._options.cloudflareApiToken)
        : this._tlsAlpn01AutoOptions()),
    });

    const keyPem = certKey.toString();
    await fsx.write(this._certPath, cert);
    await fsx.write(this._certKeyPath, keyPem);
    await chmod(this._certKeyPath, 0o600).catch(() => {});
    // 발급에 사용한 CA(directoryUrl)를 기록 — 다음 기동 시 CA 전환 감지에 사용
    await fsx.write(this._metaPath, JSON.stringify({ directoryUrl: this._directoryUrl() }));

    const info = acme.crypto.readCertificateInfo(cert);
    logger.info(
      `인증서 발급 완료 (도메인: ${this._options.domains.join(", ")}, 만료: ${info.notAfter.toISOString()})`,
    );
    this._scheduleRenewal(info.notAfter);

    return { key: keyPem, cert };
  }

  /** TLS-ALPN-01: 챌린지 응답 인증서를 ALPNCallback 용 컨텍스트로 노출 */
  private _tlsAlpn01AutoOptions(): AcmeAutoChallengeOptions {
    return {
      challengePriority: ["tls-alpn-01"],
      challengeCreateFn: async (authz, _challenge, keyAuthorization) => {
        const [alpnKey, alpnCert] = await acme.crypto.createAlpnCertificate(authz, keyAuthorization);
        this._challengeContext = tls.createSecureContext({ key: alpnKey, cert: alpnCert });
      },
      challengeRemoveFn: () => {
        this._challengeContext = undefined;
        return Promise.resolve();
      },
    };
  }

  /** DNS-01: Cloudflare 에 `_acme-challenge` TXT 를 등록·삭제하고 전파를 확인 */
  private _dns01AutoOptions(token: string): AcmeAutoChallengeOptions {
    return {
      challengePriority: ["dns-01"],
      challengeCreateFn: async (authz, _challenge, keyAuthorization) => {
        const domain = authz.identifier.value;
        const zone = await this._cfFindZone(token, domain);
        const recordName = `_acme-challenge.${domain}`;
        const recordId = await this._cfCreateTxtRecord(token, zone.id, recordName, keyAuthorization);
        this._dnsRecords.set(domain, { zoneId: zone.id, recordId });
        await this._waitForDnsPropagation(zone.name, recordName, keyAuthorization);
      },
      challengeRemoveFn: async (authz) => {
        const domain = authz.identifier.value;
        const record = this._dnsRecords.get(domain);
        if (record == null) return;
        await this._cfDeleteTxtRecord(token, record.zoneId, record.recordId);
        this._dnsRecords.delete(domain);
      },
    };
  }

  private _cloudflareBaseUrl(): string {
    // 운영 환경 변수로 Cloudflare API base URL 재정의 가능 (테스트 mock 등)
    const override = env("SD_CLOUDFLARE_API_BASE_URL");
    if (override != null && override !== "") return override;
    return CLOUDFLARE_API_BASE_URL;
  }

  private async _cloudflareRequest(
    token: string,
    apiPath: string,
    init?: { method: string; body?: string },
  ): Promise<unknown> {
    const res = await fetch(`${this._cloudflareBaseUrl()}${apiPath}`, {
      method: init?.method ?? "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      ...(init?.body != null ? { body: init.body } : {}),
    });
    const body = (await res.json()) as { success: boolean; errors?: unknown[]; result?: unknown };
    if (!res.ok || !body.success) {
      throw new Error(
        `Cloudflare API 요청 실패 (${apiPath}): HTTP ${res.status} ${JSON.stringify(body.errors ?? [])}`,
      );
    }
    return body.result;
  }

  /** 도메인을 점 단위로 축소한 후보 중 등록된 가장 구체적인 zone 선택 */
  private async _cfFindZone(token: string, domain: string): Promise<{ id: string; name: string }> {
    const labels = domain.split(".");
    for (let i = 0; i < labels.length - 1; i++) {
      const candidate = labels.slice(i).join(".");
      const result = (await this._cloudflareRequest(
        token,
        `/zones?name=${encodeURIComponent(candidate)}`,
      )) as Array<{ id: string; name: string }>;
      const zone = result.at(0);
      if (zone != null) return { id: zone.id, name: zone.name };
    }
    throw new Error(`Cloudflare 계정에서 도메인의 zone 을 찾지 못했습니다: ${domain}`);
  }

  private async _cfCreateTxtRecord(
    token: string,
    zoneId: string,
    recordName: string,
    content: string,
  ): Promise<string> {
    const result = (await this._cloudflareRequest(token, `/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify({ type: "TXT", name: recordName, content, ttl: 60 }),
    })) as { id: string };
    return result.id;
  }

  private async _cfDeleteTxtRecord(
    token: string,
    zoneId: string,
    recordId: string,
  ): Promise<void> {
    await this._cloudflareRequest(token, `/zones/${zoneId}/dns_records/${recordId}`, {
      method: "DELETE",
    });
  }

  /**
   * DNS-01: TXT 가 도메인 권위 NS 에 전파됐는지 best-effort 로 확인.
   * 권위 NS 조회 실패·전파 타임아웃 시 경고 후 진행 (CA 가 최종 검증).
   */
  private async _waitForDnsPropagation(
    zoneName: string,
    recordName: string,
    expected: string,
  ): Promise<void> {
    let resolver: Resolver;
    try {
      const nsHosts = await resolveNs(zoneName);
      const nsIps: string[] = [];
      for (const nsHost of nsHosts) {
        const ips = await resolve4(nsHost).catch(() => [] as string[]);
        nsIps.push(...ips);
      }
      if (nsIps.length === 0) {
        logger.warn(`권위 NS 주소를 찾지 못해 DNS 전파 확인을 건너뜁니다 (CA 검증에 위임): ${zoneName}`);
        return;
      }
      resolver = new Resolver();
      resolver.setServers(nsIps);
    } catch {
      logger.warn(`권위 NS 조회 실패로 DNS 전파 확인을 건너뜁니다 (CA 검증에 위임): ${zoneName}`);
      return;
    }

    for (let i = 0; i < DNS_PROPAGATION_MAX_TRIES; i++) {
      try {
        const records = await resolver.resolveTxt(recordName);
        if (records.some((chunks) => chunks.join("").includes(expected))) return;
      } catch {
        // 아직 미전파
      }
      await new Promise((resolve) => setTimeout(resolve, DNS_PROPAGATION_INTERVAL_MS));
    }
    logger.warn(`DNS 전파 확인 타임아웃. CA 검증에 위임합니다: ${recordName}`);
  }

  private _scheduleRenewal(notAfter: Date): void {
    this.stop();
    this._armTimer(notAfter.getTime() - RENEW_BEFORE_MS);
  }

  /** 긴 지연(>24.8일)은 setTimeout 오버플로를 피해 분할 무장 */
  private _armTimer(targetTime: number): void {
    const remaining = Math.max(0, targetTime - Date.now());
    if (remaining > MAX_TIMER_DELAY_MS) {
      this._renewTimer = setTimeout(() => this._armTimer(targetTime), MAX_TIMER_DELAY_MS);
    } else {
      this._renewTimer = setTimeout(() => void this._renew(), remaining);
    }
  }

  private async _renew(): Promise<void> {
    try {
      logger.info("인증서 갱신을 시작합니다.");
      const material = await this._issue();
      this._onRenew?.(material);
      logger.info("인증서 갱신 및 적용이 완료되었습니다.");
    } catch (err) {
      // 갱신 실패는 문제 발생 사실이므로 error. 기존 유효 인증서로 계속 서비스하며 재시도.
      logger.error("인증서 갱신 실패. 기존 인증서를 유지하고 재시도를 예약합니다.", err);
      this.stop();
      this._renewTimer = setTimeout(() => void this._renew(), RETRY_DELAY_MS);
    }
  }
}
