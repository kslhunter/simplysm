import {describe} from "mocha";
import {FtpStorage} from "@simplism/storage";

describe("FtpStorage", () => {
  // TODO: FTP 서버 불안정으로 지속적으로 오류가 발생하여, 일단 테스트 코드 닫아둠.
  /*let ftp: FtpStorage;

  beforeEach(async () => {
    ftp = new FtpStorage();
    await ftp.connectAsync({
      host: "speedtest.tele2.net",
      port: 21
    });
  });

  afterEach(async () => {
    await ftp.closeAsync();
  });

  it("디렉토리를 생성할 수 있다.", async () => {
    await ftp.mkdirAsync("/upload/sd");
  });

  it("파일을 업로드할 수 있다.", async () => {
    await ftp.putAsync(path.resolve(__dirname, "test.txt"), "/upload/test.txt");
  });*/
});
