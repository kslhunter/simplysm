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

export interface ISmtpClientSendAttachment {
  filename: string;
  content: Buffer;
}

export interface ISmtpClientSendDefaultOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: ISmtpClientSendAttachment[];
}