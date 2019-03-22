import * as nodemailer from "nodemailer";
import {Logger} from "@simplysm/sd-common";
import {SdWebSocketServiceBase} from "../SdWebSocketServiceBase";
import {ISmtpClientSendOption} from "@simplysm/sd-smtp-client-common";

export class SdSmtpClientService extends SdWebSocketServiceBase {
  private readonly _logger = new Logger("@simplysm/sd-service", "SdSmtpClientService");

  public async sendAsync(options: ISmtpClientSendOption): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      nodemailer
        .createTransport({
          host: options.host,
          port: options.port,
          secure: options.secure,
          auth: {
            user: options.user,
            pass: options.pass
          }
        })
        .sendMail(
          {
            from: options.from,
            to: options.to,
            cc: options.cc,
            bcc: options.bcc,
            subject: options.subject,
            html: options.html,
            attachments: options.attachments
          },
          (err, info) => {
            if (err) {
              reject(err);
              return;
            }

            this._logger.log(`메일전송 [${info.messageId}]`);
            resolve(info.messageId);
          }
        );
    });
  }
}
