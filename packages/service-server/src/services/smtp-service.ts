import nodemailer from "nodemailer";
import type { SmtpConfig, SmtpSendByConfigOption, SmtpSendOption } from "@simplysm/service-common";
import { defineService, type ServiceMethods } from "../core/define-service";

export const SmtpService = defineService("Smtp", (ctx) => {
  const send = async (options: SmtpSendOption): Promise<string> => {
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

    // nodemailer 타입 정의는 Buffer를 요구하지만, 실제로 Uint8Array도 작동함
    const mailOptions = {
      ...options,
      attachments: options.attachments?.map((att) => ({
        ...att,
        // eslint-disable-next-line no-restricted-globals -- nodemailer 라이브러리 요구사항
        content: att.content != null ? Buffer.from(att.content) : undefined,
      })),
    };

    const info = await transport.sendMail(mailOptions);
    return info.messageId;
  };

  return {
    send,

    async sendByConfig(configName: string, options: SmtpSendByConfigOption): Promise<string> {
      const config = (await ctx.getConfig<Record<string, SmtpConfig | undefined>>("smtp"))[configName];
      if (config == null) {
        throw new Error(`SMTP 설정을 찾을 수 없습니다: ${configName}`);
      }

      return send({
        user: config.user,
        pass: config.pass,
        host: config.host,
        port: config.port,
        secure: config.secure,
        from: `"${config.senderName}" <${config.senderEmail ?? config.user}>`,
        ...options,
      });
    },
  };
});

export type SmtpServiceType = ServiceMethods<typeof SmtpService>;
