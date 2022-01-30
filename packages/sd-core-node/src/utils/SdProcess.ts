import child_process from "child_process";

export class SdProcess {
  public static async execAsync(cmd: string, opts?: child_process.ExecOptions): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      child_process.exec(cmd, opts, (err, stdout, stderr) => {
        if (err) {
          reject(err);
          return;
        }

        if (stderr) {
          reject(new Error(`$ ${cmd} => stderr: ${stderr.toString()}`));
          return;
        }

        resolve(stdout.toString());
      });
    });
  }
}
