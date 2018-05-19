import * as nodemailer from "nodemailer";

export class Mailer {
  public static async send(from: {
                             host: string;
                             senderName?: string;
                             senderAddress: string;
                             password: string;
                           },
                           to: string[],
                           subject: string,
                           html: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const transporter = nodemailer.createTransport({
        host: from.host,
        auth: {
          user: from.senderAddress,
          pass: from.password
        }
      });

      const mailOptions = {
        from: from.senderName
          ? `"${from.senderName}" <${from.senderAddress}>`
          : from.senderAddress,
        to: to.join(","),
        subject,
        html
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
