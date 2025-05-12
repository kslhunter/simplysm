import cp from "child_process";

export class SdProcess {
  static async spawnAsync(
    cmd: string,
    opts?: cp.SpawnOptionsWithoutStdio & {
      messageConvert?: (buffer: Buffer) => string;
    },
    showMessage?: boolean,
  ): Promise<string> {
    const splitCmd = this._splitCommand(cmd);
    if (!splitCmd) {
      throw new Error(`커맨드(${cmd}) 파싱 실패`);
    }

    return await new Promise<string>((resolve, reject) => {
      const ps = cp.spawn(splitCmd[0], splitCmd.slice(1), {
        cwd: process.cwd(),
        env: { ...process.env },
        ...opts,
      });

      ps.on("error", (err) => {
        reject(err);
      });

      let messageBuffer = Buffer.from([]);
      ps.stdout.on("data", (data) => {
        messageBuffer = Buffer.concat([messageBuffer, data]);
        if (showMessage) {
          process.stdout.write(data);
        }
      });
      ps.stderr.on("data", (data) => {
        messageBuffer = Buffer.concat([messageBuffer, data]);
        if (showMessage) {
          process.stderr.write(data);
        }
      });

      ps.on("exit", (code) => {
        if (code !== 0) {
          const message = opts?.messageConvert
            ? opts.messageConvert(messageBuffer)
            : messageBuffer.toString();
          reject(new Error(`'${cmd}' 명령이 오류와 함께 닫힘 (${code})\n${message}`));
          return;
        }

        const message = opts?.messageConvert
          ? opts.messageConvert(messageBuffer)
          : messageBuffer.toString();
        resolve(message);
      });
    });
  }

  private static _splitCommand(cmd: string) {
    const regex = /[^\s"]+|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    const matches = cmd.match(regex);
    return matches?.map(match => {
      if (match.startsWith("\"")) {
        return match.slice(1, -1).replace(/\\"/g, "\"");
      }
      return match;
    });
  }
}
