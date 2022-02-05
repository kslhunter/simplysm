import cp from "child_process";

export class SdProcess {
  public static async spawnAsync(cmd: string, opts?: cp.ExecOptions): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const ps = cp.spawn(cmd.split(" ")[0], cmd.split(" ").slice(1), {
        shell: true,
        stdio: "pipe",
        ...opts
      });
      ps.on("error", (err) => {
        reject(err);
      });

      let messageBuffer = Buffer.from([]);
      ps.stdout.on("data", (data) => {
        messageBuffer = Buffer.concat([messageBuffer, data]);
      });
      ps.stderr.on("data", (data) => {
        messageBuffer = Buffer.concat([messageBuffer, data]);
      });

      ps.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`'${cmd}' 명령이 오류와 함께 닫힘 (${code})\n${messageBuffer.toString()}`));
          return;
        }

        resolve(messageBuffer.toString());
      });
    });
  }
}
