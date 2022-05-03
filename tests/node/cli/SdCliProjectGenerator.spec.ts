import { SdCliProjectGenerator } from "@simplysm/sd-cli";
import path from "path";
import { fileURLToPath } from "url";
import { FsUtil } from "@simplysm/sd-core-node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("(node) sd-cli.SdCliProjectGenerator", () => {
  const testDir = path.resolve(__dirname, ".dist");
  const generator = new SdCliProjectGenerator(testDir);

  it("프로젝트 생성", async () => {
    await FsUtil.removeAsync(testDir);

    await generator.initAsync({
      name: "gen-test",
      author: "심플리즘",
      description: "심플리즘 프로젝트 생성 테스트",
      gitUrl: "https://github.com/kslhunter/simplysm7.git"
    });
  });

  it("TS 일반 라이브러리 생성", async () => {
    await generator.addTsLibAsync({ name: "common", description: "공통모듈", useDom: false });
  });

  it("DB 라이브러리 생성", async () => {
    await generator.addDbLibAsync({ name: "main" });
  });

  it("DB 라이브러리에 모델 생성 (3개)", async () => {
    await generator.addDbLibModelAsync({ dbPkgName: "main", category: "system", name: "Employee", description: "직원" });

    await generator.addDbLibModelAsync({ dbPkgName: "main", category: "base", name: "Partner", description: "거래처" });

    await generator.addDbLibModelAsync({
      dbPkgName: "main",
      category: "system",
      name: "EmployeePermission",
      description: "직원권한"
    });
  });

  it("서버 패키지 생성", async () => {
    await generator.addServerAsync({});
  });

  it("클라이언트 패키지 생성", async () => {
    await generator.addClientAsync({
      name: "admin",
      description: "관리자",
      useRouter: true,
      useServiceWorker: true
    });
  });
});
