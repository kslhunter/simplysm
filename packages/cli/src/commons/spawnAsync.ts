import * as childProcess from "child_process";
import ProcessEnv = NodeJS.ProcessEnv;

export async function spawnAsync(name: string, cmds: string[], env: ProcessEnv): Promise<{ message: string; errorMessage: string }> {
  console.log("[" + name + "] $ " + cmds.join(" "));

  return await new Promise<{ message: string; errorMessage: string }>((resolve, reject) => {
    const worker = childProcess.spawn(cmds[0], cmds.slice(1), {
      shell: true,
      stdio: "pipe",
      env,
      cwd: process.cwd()
    });

    let resultMessage = "";
    worker.stdout.on("data", data => {
      resultMessage += data.toString();
      if (resultMessage.includes("\n")) {
        const newMessages = resultMessage.split("\n").map(item => `[${name}] ${item.replace(/\r/g, "")}`).slice(0, -1).filter(item => !!item);
        for (const newMessage of newMessages) {
          console.log(newMessage);
        }
        resultMessage = resultMessage.split("\n").slice(-1)[0].replace(/\r/g, "") || "";
      }
    });

    let errorMessage = "";
    worker.stderr.on("data", data => {
      errorMessage += data.toString();
      if (errorMessage.includes("\n")) {
        const newMessages = errorMessage.split("\n").map(item => `[${name}] ${item.replace(/\r/g, "")}`).slice(0, -1).filter(item => !!item);
        for (const newMessage of newMessages) {
          console.error(newMessage);
        }
        errorMessage = errorMessage.split("\n").slice(-1)[0].replace(/\r/g, "") || "";
      }
    });

    worker.on("close", code => {
      if (errorMessage.replace(/\r/g, "")) {
        console.error("[" + name + "] " + errorMessage);
      }
      if (resultMessage.replace(/\r/g, "")) {
        console.log("[" + name + "] " + resultMessage);
      }

      if (code === 0) {
        console.log("[" + name + "] 완료");
        resolve();
      }
      else {
        console.error(`[${name}] 에러 발생`);
        reject(new Error());
      }
    });
  });
}