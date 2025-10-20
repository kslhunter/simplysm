import nodemailer from "nodemailer";
import {
  ISmtpClientDefaultConfig,
  ISmtpClientSendByDefaultOption,
  ISmtpClientSendOption,
} from "@simplysm/sd-service-common";
import { SdServiceBase } from "../types";

export class SdSmtpClientService extends SdServiceBase {
  async send(options: ISmtpClientSendOption): Promise<string> {
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
        if (err) {
          reject(err);
          return;
        }

        resolve(info.messageId);
      });
    });
  }

  async sendByConfig(configName: string, options: ISmtpClientSendByDefaultOption): Promise<string> {
    const config = this.server.getConfig(this.request?.clientName)["smtp"]?.[configName] as
      | ISmtpClientDefaultConfig
      | undefined;
    if (config === undefined) {
      throw new Error("서버에서 메일서버 설정을 찾을 수 없습니다.");
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
