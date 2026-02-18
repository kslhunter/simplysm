import cp from "child_process";

export class SdProcess {
  static async spawnAsync(
    cmd: string,
    args: string[],
    options?: cp.SpawnOptionsWithoutStdio & {
      messageConvert?: (buffer: Buffer) => string;
      showMessage?: boolean | ((message: string) => void);
    },
  ): Promise<string> {
    /*const splitCmd = this.#splitCommand(command);
    if (!splitCmd) {
      throw new Error(`커맨드(${command}) 파싱 실패`);
    }*/

    return await new Promise<string>((resolve, reject) => {
      const ps = cp.spawn(cmd, args, {
        cwd: process.cwd(),
        ...options,
        env: {
          ...process.env,
          ...options?.env,
        },
      });

      ps.on("error", (err) => {
        reject(err);
      });

      let messageBuffer = Buffer.from([]);
      ps.stdout.on("data", (data) => {
        messageBuffer = Buffer.concat([messageBuffer, data]);
        if (typeof options?.showMessage === "function") {
          options.showMessage(data.toString());
        } else if (options?.showMessage) {
          process.stdout.write(data);
        }
      });
      ps.stderr.on("data", (data) => {
        messageBuffer = Buffer.concat([messageBuffer, data]);
        if (typeof options?.showMessage === "function") {
          options.showMessage(data.toString());
        } else if (options?.showMessage) {
          process.stderr.write(data);
        }
      });

      ps.on("exit", (code) => {
        if (code !== 0) {
          const message = options?.messageConvert
            ? options.messageConvert(messageBuffer)
            : messageBuffer.toString();
          reject(
            new Error(
              `'${cmd + " " + args.join(" ")}' 명령이 오류와 함께 닫힘 (${code})\n${message}`,
            ),
          );
          return;
        }

        const message = options?.messageConvert
          ? options.messageConvert(messageBuffer)
          : messageBuffer.toString();
        resolve(message);
      });
    });
  }

  /*static #splitCommand(cmd: string) {
    const regex = /[^\s"]+|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    const matches = cmd.match(regex);
    return matches?.map((match) => {
      if (match.startsWith('"')) {
        return match.slice(1, -1).replace(/\\"/g, '"');
      }
      return match;
    });
  }*/
}
