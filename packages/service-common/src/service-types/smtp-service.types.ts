export interface SmtpService {
  send(options: SmtpSendOption): Promise<string>;
  sendByConfig(configName: string, options: SmtpSendByConfigOption): Promise<string>;
}

export interface SmtpSendAttachment {
  filename: string;
  content?: Uint8Array;
  path?: string;
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
