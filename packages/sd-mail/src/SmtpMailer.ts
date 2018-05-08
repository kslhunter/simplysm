import * as nodemailer from "nodemailer";
import {Logger} from "@simplism/sd-core";

export class SmtpMailer {
  private readonly _logger = new Logger("@simplism/sd-mail", "SmtpMailer");

  public constructor(
    private readonly _from: {
      host: string;
      senderName?: string;
      senderAddress: string;
      password: string;
    }
  ) {
  }

  public async send(param: { to: string[]; title: string; contentHtml: string }): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const transporter = nodemailer.createTransport({
        host: this._from.host,
        auth: {
          user: this._from.senderAddress,
          pass: this._from.password
        }
      });

      const mailOptions = {
        from: this._from.senderName
          ? `"${this._from.senderName}" <${this._from.senderAddress}>`
          : this._from.senderAddress,
        to: param.to.join(","),
        subject: param.title,
        html: param.contentHtml
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          reject(error);
          return;
        }
        this._logger.log(`send email: ${info.response}`);
        resolve();
      });
    });
  }
}
