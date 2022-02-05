import child_process from "child_process";

export class SdProcess {
  public static async spawnAsync(cmd: string, opts?: child_process.ExecOptions): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const ps = child_process.spawn(cmd, opts);
      let messageBuffer = Buffer.from([]);
      ps.stdout.on("data", (data) => {
        messageBuffer = Buffer.concat([messageBuffer, data]);
      });
      ps.stderr.on("data", (data) => {
        messageBuffer = Buffer.concat([messageBuffer, data]);
      });
      ps.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`에러발생: $ ${cmd}: \n${messageBuffer.toString()}`));
          return;
        }
        resolve(messageBuffer.toString());
      });

      /*child_process.exec(cmd, opts, (err, stdout, stderr) => {
        if (err) {
          console.log(stdout, stderr);
          reject(err);
          return;
        }

        if (stderr) {
          reject(new Error(`$ ${cmd} => stderr: ${stderr.toString()}`));
          return;
        }

        resolve(stdout.toString());
      });*/
    });
  }
}
