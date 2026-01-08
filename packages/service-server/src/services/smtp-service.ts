import nodemailer from "nodemailer";
import type {
  ISmtpService,
  ISmtpConfig,
  ISmtpSendByConfigOption,
  ISmtpSendOption,
} from "@simplysm/service-common";
import { ServiceBase } from "../core/service-base";

export class SmtpService extends ServiceBase implements ISmtpService {
  async send(options: ISmtpSendOption): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
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
        if (err != null) {
          reject(err);
          return;
        }

        resolve(info.messageId);
      });
    });
  }

  async sendByConfig(configName: string, options: ISmtpSendByConfigOption): Promise<string> {
    const config = (await this.getConfigAsync<Record<string, ISmtpConfig | undefined>>("smtp"))[
      configName
    ];
    if (config == null) {
      throw new Error(`SMTP 설정을 찾을 수 없습니다: ${configName}`);
    }

    return await this.send({
      user: config.user,
      pass: config.pass,
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: `"${config.senderName}" <${config.senderEmail ?? config.user}>`,
      ...options,
    });
  }
}
