import {ISmtpClientSendByDefaultOption, ISmtpClientSendOption, SdSmtpClient} from "@simplysm/sd-smtp-client";
import {SdServiceBase} from "../SdServiceBase";
import {ISdServiceSmtpClientConfig} from "../../commons";
import {SdServiceServerUtil} from "../SdServiceServerUtil";

export class SdSmtpClientService extends SdServiceBase {
  public async sendAsync(options: ISmtpClientSendOption): Promise<void> {
    const smtpClient = new SdSmtpClient({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: {
        user: options.user,
        pass: options.pass
      }
    });

    await smtpClient.sendAsync({
      from: options.from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments
    });
  }

  public async sendByDefaultAsync(options: ISmtpClientSendByDefaultOption): Promise<void> {
    const config = (await SdServiceServerUtil.getConfigAsync(this.rootPath, this.request.url))["smtp"] as ISdServiceSmtpClientConfig;
    await this.sendAsync({
      user: config.user,
      pass: config.pass,
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: `"${config.senderName}" <${config.senderEmail || config.user}>`,
      ...options
    });
  }
}
