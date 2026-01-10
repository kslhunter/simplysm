export interface SmtpService {
  send(options: SmtpSendOption): Promise<string>;
  sendByConfig(configName: string, options: SmtpSendByConfigOption): Promise<string>;
}

export interface SmtpSendAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
  contentType?: string;
}

export interface SmtpSendByConfigOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpSendAttachment[];
}

export interface SmtpSendOption {
  host: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;

  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpSendAttachment[];
}

export interface SmtpConfig {
  senderName: string;
  senderEmail?: string;
  user?: string;
  pass?: string;
  host: string;
  port?: number;
  secure?: boolean;
}
