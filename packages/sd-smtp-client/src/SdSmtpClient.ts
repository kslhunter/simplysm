import * as nodemailer from "nodemailer";
import * as SMTPTransport from "nodemailer/lib/smtp-transport";

export class SdSmtpClient {
  private readonly _transport: nodemailer.Transporter;

  public constructor(options: SMTPTransport.Options) {
    this._transport = nodemailer.createTransport(options);
  }

  public async sendAsync(options: nodemailer.SendMailOptions): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this._transport.sendMail(options,
        (err, info) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(info.messageId);
        }
      );
    });
  }
}
