export interface ISmtpClientSendAttachment {
  filename: string;
  content?: Buffer;
  path?: any;
  contentType?: string;
}

export interface ISmtpClientSendByDefaultOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: ISmtpClientSendAttachment[];
}

export interface ISmtpClientSendOption {
  host: string;
  port?: number;
  secure?: boolean;
  user: string;
  pass: string;

  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: ISmtpClientSendAttachment[];
}
