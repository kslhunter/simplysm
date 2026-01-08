export interface ISmtpService {
  send(options: ISmtpSendOption): Promise<string>;
  sendByConfig(configName: string, options: ISmtpSendByConfigOption): Promise<string>;
}

export interface ISmtpSendAttachment {
  filename: string;
  content?: Buffer;
  path?: string;
  contentType?: string;
}

export interface ISmtpSendByConfigOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: ISmtpSendAttachment[];
}

export interface ISmtpSendOption {
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
  attachments?: ISmtpSendAttachment[];
}

export interface ISmtpConfig {
  senderName: string;
  senderEmail?: string;
  user?: string;
  pass?: string;
  host: string;
  port?: number;
  secure?: boolean;
}
