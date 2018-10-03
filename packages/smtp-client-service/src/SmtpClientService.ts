import * as nodemailer from "nodemailer";
import {Logger} from "@simplism/core";
import {ISmtpClientSendOption} from "@simplism/smtp-client-common";
import {SocketServiceBase} from "@simplism/socket-server";

export class SmtpClientService extends SocketServiceBase {
  private readonly _logger = new Logger("@simplism/smtp-client-service");

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