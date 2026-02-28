import nodemailer from "nodemailer";
import { defineService, type ServiceMethods } from "../core/define-service";

export interface SmtpClientSendAttachment {
  filename: string;
  content?: Buffer;
  path?: any;
  contentType?: string;
}

export interface SmtpClientSendByDefaultOption {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  attachments?: SmtpClientSendAttachment[];
}

export interface SmtpClientSendOption {
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
  attachments?: SmtpClientSendAttachment[];
}

export interface SmtpClientDefaultConfig {
  senderName: string;
  senderEmail?: string;
  user?: string;
  pass?: string;
  host: string;
  port?: number;
  secure?: boolean;
}

export const SmtpClientService = defineService("SmtpClient", (ctx) => ({
  async send(options: SmtpClientSendOption): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const transport = nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: options.secure,
        auth:
          options.user != null
            ? {
                user: options.user,
                pass: options.pass,
              }
            : undefined,
        tls: {
          rejectUnauthorized: false,
        },
      });

      transport.sendMail(options, (err, info) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(info.messageId);
      });
    });
  },

  async sendByConfig(configName: string, options: SmtpClientSendByDefaultOption): Promise<string> {
    const config = (
      await ctx.getConfig<Record<string, SmtpClientDefaultConfig | undefined>>("smtp")
    )[configName];
    if (config == null) {
      throw new Error(`SMTP config not found: ${configName}`);
    }

    return this.send({
      user: config.user,
      pass: config.pass,
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: `"${config.senderName}" <${config.senderEmail ?? config.user}>`,
      ...options,
    });
  },
}));

export type SmtpClientServiceType = ServiceMethods<typeof SmtpClientService>;
