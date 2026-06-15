import * as acme from "acme-client";
import tls from "node:tls";
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

export interface AcmeManagerOptions {
  rootPath: string;
  domains: string[];
  email: string;
  staging?: boolean;
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
 * TLS-ALPN-01 챌린지로 발급한다. 챌린지 응답 인증서는 {@link getChallengeContext} 로 노출하여
 * 서버의 ALPNCallback 이 `acme-tls/1` 핸드셰이크에 주입한다.
 */
export class AcmeManager {
  private readonly _dir: string;
  private _challengeContext: tls.SecureContext | undefined;
  private _renewTimer: NodeJS.Timeout | undefined;
  private _onRenew: ((material: AcmeCertMaterial) => void) | undefined;

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
      challengePriority: ["tls-alpn-01"],
      // 로컬 사전검증(발급 호스트가 자기 공개 도메인:443 으로 hairpin 접속) 생략.
      // 망 구성에 따라 hairpin 이 막힐 수 있고, 실검증은 CA(LE) 가 직접 수행한다.
      skipChallengeVerification: true,
      // challengePriority 를 tls-alpn-01 로 고정했으므로 이 콜백은 항상 tls-alpn-01 챌린지로 호출된다.
      challengeCreateFn: async (authz, _challenge, keyAuthorization) => {
        const [alpnKey, alpnCert] = await acme.crypto.createAlpnCertificate(authz, keyAuthorization);
        this._challengeContext = tls.createSecureContext({ key: alpnKey, cert: alpnCert });
      },
      challengeRemoveFn: () => {
        this._challengeContext = undefined;
        return Promise.resolve();
      },
    });

    const keyPem = certKey.toString();
    await fsx.write(this._certPath, cert);
    await fsx.write(this._certKeyPath, keyPem);
    await chmod(this._certKeyPath, 0o600).catch(() => {});

    const info = acme.crypto.readCertificateInfo(cert);
    logger.info(
      `인증서 발급 완료 (도메인: ${this._options.domains.join(", ")}, 만료: ${info.notAfter.toISOString()})`,
    );
    this._scheduleRenewal(info.notAfter);

    return { key: keyPem, cert };
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
