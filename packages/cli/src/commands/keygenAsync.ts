import * as path from "path";
import * as glob from "glob";
import * as fs from "fs-extra";
import * as iconv from "iconv-lite";
import {spawn} from "child_process";

export async function keygenAsync(argv: { alias: string; password: string }): Promise<void> {
  const keytoolPaths = glob.sync(path.resolve("c:", "Program Files", "Java", "jdk*", "bin", "keytool.exe"));
  const keytoolPath = keytoolPaths.last();

  if (fs.existsSync(path.resolve(process.cwd(), ".sign", argv.alias, "release-signing.jks"))) {
    throw new Error("키쌍이 이미 존재합니다.");
  }

  fs.mkdirsSync(path.resolve(process.cwd(), ".sign", argv.alias));

  const cmd = spawn(
    "\"" + keytoolPath + "\"",
    [
      "-genkey", "-noprompt",
      "-alias", argv.alias,
      "-dname", "CN=",
      "-keyalg", "RSA",
      "-keysize", "2048",
      "-validity", "10000",
      "-keystore", "release-signing.jks",
      "-storepass", argv.password,
      "-keypass", argv.password
    ],
    {
      shell: true,
      cwd: path.resolve(process.cwd(), ".sign", argv.alias)
    }
  );

  await new Promise<void>((resolve, reject) => {
    let errorMessage = "";
    cmd.stdout.on("data", (data: Buffer) => {
      errorMessage += iconv.decode(data, "euc-kr");
    });
    cmd.stderr.on("data", (data: Buffer) => {
      const str = iconv.decode(data, "euc-kr");
      if (!str.includes("PKCS12") && !str.includes("Warning")) {
        console.log(str);
      }
    });
    cmd.on("exit", code => {
      if (code !== 0) {
        reject(new Error(errorMessage));
      }
      resolve();
    });
  });

  fs.writeFileSync(
    path.resolve(process.cwd(), ".sign", argv.alias, "release-signing.properties"),
    "key.store=release-signing.jks" + "\n" +
    "key.store.password=" + argv.password + "\n" +
    "key.alias=" + argv.alias + "\n" +
    "key.alias.password=" + argv.password
  );
}