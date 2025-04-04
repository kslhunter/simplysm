import * as tls from "node:tls";
import { simpleParser } from "mailparser";
import { DateOnly, NumberUtils } from "@simplysm/sd-core-common";

export class SdPop3Client {
  static async connectAsync<R>(
    conf: { host: string, port: number, user: string, pass: string },
    fn: (client: SdPop3Client) => Promise<R>,
  ): Promise<R> {
    return await new Promise<R>((resolve, reject) => {
      const client = tls.connect({
        host: conf.host,
        port: conf.port,
        rejectUnauthorized: false, // 필요시 true로 설정하여 인증서 검증
      });

      // client.setEncoding("utf8");

      client.on("error", (err) => {
        reject(err);
      });

      let result: R;
      client.on("end", () => {
        resolve(result);
      });

      let lastInfo: { cmd: string; resolve: (res: string) => void; } | undefined;
      const sendAsync = async (cmd: string) => {
        return await new Promise<string>((resolve1) => {
          lastInfo = { cmd, resolve: resolve1 };
          client.write(cmd + "\r\n");
        });
      };

      let buffer = "";
      let isConnected = false;
      client.on("data", async (chunk) => {
        buffer += chunk;

        if (
          (
            ["LIST", "RETR", "UIDL", "TOP"].includes(lastInfo?.cmd.split(" ")[0] ?? "") &&
            buffer.endsWith("\r\n.\r\n")
          ) || (
            !["LIST", "RETR", "UIDL", "TOP"].includes(lastInfo?.cmd.split(" ")[0] ?? "") &&
            buffer.endsWith("\r\n")
          )
        ) {
          try {
            const res = buffer.trim();
            buffer = "";

            if (!isConnected && res.startsWith("+OK")) {
              isConnected = true;

              await sendAsync(`USER ${conf.user}`);
              await sendAsync(`PASS ${conf.pass}`);
              result = await fn(new SdPop3Client({ sendAsync }));
              await sendAsync(`QUIT`);
              client.end();
            }
            else if (res.startsWith("-ERR")) {
              await sendAsync(`QUIT`);
              client.end();
              reject(new Error(res));
            }
            else {
              lastInfo?.resolve(res);
            }
          }
          catch (err) {
            await sendAsync(`QUIT`);
            client.end();
            reject(err);
          }
        }
      });
    });
  }

  constructor(private _fns: {
    sendAsync: (cmd: string) => Promise<string>
  }) {
  }

  async statAsync() {
    const res = await this._fns.sendAsync("STAT");

    return {
      lastId: NumberUtils.parseInt(res.split(" ")[1]),
      totalBytes: NumberUtils.parseInt(res.split(" ")[2]),
    };
  }

  async listAsync() {
    const res = await this._fns.sendAsync("LIST");

    return res.split("\r\n").slice(1, -1).map(item => ({
      id: NumberUtils.parseInt(item.split(" ")[0]),
      bytes: NumberUtils.parseInt(item.split(" ")[1]),
    }));
  }

  async topAsync(id: number): Promise<IMailTopInfo> {
    const res = await this._fns.sendAsync(`TOP ${id} 0`);
    const parsed = await simpleParser(res);
    return {
      subject: parsed.subject,
      date: parsed.date != null ? new DateOnly(parsed.date) : undefined,
      to: parsed.to != null && "value" in parsed.to
        ? parsed.to.value.map(item => item.address).filterExists()
        : parsed.to?.mapMany(item => item.value.map(item1 => item1.address).filterExists()) ?? [],
      from: parsed.from?.value.map(item => item.address).filterExists() ?? [],
      cc: parsed.cc != null && "value" in parsed.cc
        ? parsed.cc.value.map(item => item.address).filterExists()
        : parsed.cc?.mapMany(item => item.value.map(item1 => item1.address).filterExists()) ?? [],
      replyTo: parsed.replyTo?.value.map(item => item.address).filterExists() ?? [],
    };
  }


  async retrAsync(id: number): Promise<IMailInfo> {
    const res = await this._fns.sendAsync(`RETR ${id}`);
    const parsed = await simpleParser(res);
    return {
      attachments: parsed.attachments
        .filter(item => item.contentDisposition === "attachment")
        .map(item => ({
          fileName: item.filename,
          content: item.content,
          contentType: item.contentType,
        })),
      html: parsed.html === false ? undefined : parsed.html,
      subject: parsed.subject,
      date: parsed.date != null ? new DateOnly(parsed.date) : undefined,
      to: parsed.to != null && "value" in parsed.to
        ? parsed.to.value.map(item => item.address).filterExists()
        : parsed.to?.mapMany(item => item.value.map(item1 => item1.address).filterExists()) ?? [],
      from: parsed.from?.value.map(item => item.address).filterExists() ?? [],
      cc: parsed.cc != null && "value" in parsed.cc
        ? parsed.cc.value.map(item => item.address).filterExists()
        : parsed.cc?.mapMany(item => item.value.map(item1 => item1.address).filterExists()) ?? [],
      replyTo: parsed.replyTo?.value.map(item => item.address).filterExists() ?? [],
    };
  }
}

interface IMailTopInfo {
  subject?: string;
  date?: DateOnly;
  to: string[];
  from: string[];
  cc: string[];
  replyTo: string[];
}

interface IMailInfo extends IMailTopInfo {
  attachments: {
    fileName?: string;
    content: Buffer;
    contentType: string;
  }[];
  html?: string;
}