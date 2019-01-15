import * as childProcess from "child_process";
import ProcessEnv = NodeJS.ProcessEnv;

export async function spawnAsync(cmds: string[], opts?: { env?: ProcessEnv; cwd?: string }, resolvePredict?: (log: string) => boolean): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const worker = childProcess.spawn(cmds[0], cmds.slice(1), {
      shell: true,
      stdio: "pipe",
      env: opts ? opts.env : undefined,
      cwd: opts ? opts.cwd : process.cwd()
    });

    let resultMessage = "";
    worker.stdout.on("data", data => {
      resultMessage += data.toString();
      if (resultMessage.includes("\n")) {
        const newMessages = resultMessage.split("\n").map(item => `${item.replace(/\r/g, "")}`).slice(0, -1).filter(item => !!item);
        for (const newMessage of newMessages) {
          console.log(newMessage);
          if (resolvePredict && resolvePredict(newMessage)) {
            resolve();
          }
        }
        resultMessage = resultMessage.split("\n").slice(-1)[0].replace(/\r/g, "") || "";
      }
    });

    let errorMessage = "";
    worker.stderr.on("data", data => {
      errorMessage += data.toString();
      if (errorMessage.includes("\n")) {
        const newMessages = errorMessage.split("\n").map(item => `${item.replace(/\r/g, "")}`).slice(0, -1).filter(item => !!item);
        for (const newMessage of newMessages) {
          console.log(newMessage);
          if (resolvePredict && resolvePredict(newMessage)) {
            resolve();
          }
        }
        errorMessage = errorMessage.split("\n").slice(-1)[0].replace(/\r/g, "") || "";
      }
    });

    worker.on("close", code => {
      if (errorMessage.replace(/\r/g, "")) {
        console.error(errorMessage);
      }
      if (resultMessage.replace(/\r/g, "")) {
        console.log(resultMessage);
      }

      if (code === 0) {
        resolve();
      }
      else {
        reject(new Error());
      }
    });
  });
}
