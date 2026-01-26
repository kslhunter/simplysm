import type { Bytes } from "@simplysm/core-common";

/**
 * SMTP 서비스 인터페이스
 *
 * 이메일 전송 기능을 제공한다.
 * 직접 SMTP 설정을 전달하거나 서버 설정을 참조하여 전송할 수 있다.
 */
export interface SmtpService {
  /** 직접 SMTP 설정으로 이메일 전송 */
  send(options: SmtpSendOption): Promise<string>;
  /** 서버 설정 참조로 이메일 전송 */
  sendByConfig(configName: string, options: SmtpSendByConfigOption): Promise<string>;
}

/**
 * 이메일 첨부 파일 정보
 *
 * content 또는 path 중 하나를 지정해야 한다.
 */
export interface SmtpSendAttachment {
  /** 첨부 파일명 */
  filename: string;
  /** 파일 내용 (바이너리) */
  content?: Bytes;
  /** 서버 내 파일 경로 */
  path?: string;
  /** MIME 타입 (예: "application/pdf") */
  contentType?: string;
}

/** SMTP 연결 옵션 (공통) */
export interface SmtpConnectionOptions {
  host: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
}

/** 이메일 내용 옵션 (공통) */
export interface SmtpEmailContentOptions {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpSendAttachment[];
}

export interface SmtpSendByConfigOption extends SmtpEmailContentOptions {}

export interface SmtpSendOption extends SmtpConnectionOptions, SmtpEmailContentOptions {
  from: string;
}

export interface SmtpConfig extends SmtpConnectionOptions {
  senderName: string;
  senderEmail?: string;
}
