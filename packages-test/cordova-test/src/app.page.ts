import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";
import { CordovaFileSystem } from "@simplysm/cordova-plugin-file-system";
import { $signal } from "@simplysm/sd-angular/src";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div>
      <h4>
        Cordova File System 테스트
        <button (click)="runAllTests()">테스트 실행</button>
      </h4>

      @for (test of tests(); track $index) {
        <div class="p-xxs p-sm">
          <b>{{ test.name }}</b>
          <p [style.color]="test.status === 'success' ? 'green' : test.status === 'fail' ? 'red' : 'gray'">
            {{
              test.status === 'pending' ? '대기 중' : test.status === 'success' ? '성공' : '실패: '
                + test.error
            }}
          </p>
        </div>
      }
    </div>`,
})
export class AppPage {
  private _appDir?: string;
  private _externalDir?: string;

  tests = $signal<ITestEntry[]>([
    // 경로 준비
    {
      name: "getStoragePathAsync: appDir, externalDir",
      fn: async () => {
        this._appDir = await CordovaFileSystem.getStoragePathAsync("app");
        this._externalDir = await CordovaFileSystem.getStoragePathAsync("external");
        if (!this._appDir || !this._externalDir) throw new Error("경로 조회 실패");
      },
    },

    // 권한
    {
      name: "checkPermission: 외부 저장소 권한 확인",
      fn: async () => {
        const granted = await CordovaFileSystem.checkPermissionAsync();
        if (typeof granted !== "boolean") throw new Error("리턴 타입 오류");
      },
    },
    {
      name: "requestPermission: 외부 저장소 권한 요청",
      fn: async () => {
        await CordovaFileSystem.requestPermissionAsync();
      },
    },

    // appDir 테스트
    {
      name: "appDir: write & read",
      fn: async () => {
        const file = `${this._appDir}/test-app.txt`;
        await CordovaFileSystem.writeFileAsync(file, "app-data");
        const content = await CordovaFileSystem.readFileStringAsync(file);
        if (content !== "app-data") throw new Error("appDir 읽기 실패");

        const buffer = await CordovaFileSystem.readFileBufferAsync(file);
        if (buffer.toString() !== "app-data") throw new Error("appDir 읽기 실패");
      },
    },
    {
      name: "appDir: exists true & false",
      fn: async () => {
        const file = `${this._appDir}/exist.txt`;
        await CordovaFileSystem.writeFileAsync(file, "check");
        const exists = await CordovaFileSystem.existsAsync(file);
        if (!exists) throw new Error("파일이 존재해야 함");

        const notExists = await CordovaFileSystem.existsAsync(`${this._appDir}/nope.txt`);
        if (notExists) throw new Error("파일이 없어야 함");
      },
    },
    {
      name: "appDir: removeFile",
      fn: async () => {
        const file = `${this._appDir}/remove-me.txt`;
        await CordovaFileSystem.writeFileAsync(file, "bye");
        await CordovaFileSystem.removeAsync(file);
        const exists = await CordovaFileSystem.existsAsync(file);
        if (exists) throw new Error("삭제되지 않음");
      },
    },
    {
      name: "appDir: mkdir, readdir, rmdir",
      fn: async () => {
        const dir = `${this._appDir}/dir-test`;
        await CordovaFileSystem.mkdirsAsync(dir);
        const list = await CordovaFileSystem.readdirAsync(this._appDir!);
        if (!list.some(item => item.name === "dir-test")) throw new Error("생성한 디렉토리가 없음");
        await CordovaFileSystem.removeAsync(dir);
        const list2 = await CordovaFileSystem.readdirAsync(this._appDir!);
        if (list2.some(item => item.name === "dir-test")) throw new Error("디렉토리가 삭제되지 않음");
      },
    },

    // externalDir 테스트
    {
      name: "externalDir: write & read",
      fn: async () => {
        const granted = await CordovaFileSystem.checkPermissionAsync();
        if (!granted) throw new Error("권한 없음");

        const file = `${this._externalDir}/test-external.txt`;
        await CordovaFileSystem.writeFileAsync(file, "external-data");
        const content = await CordovaFileSystem.readFileStringAsync(file);
        if (content !== "external-data") throw new Error("externalDir 읽기 실패");

        const buffer = await CordovaFileSystem.readFileBufferAsync(file);
        if (buffer.toString() !== "external-data") throw new Error("externalDir 읽기 실패");
      },
    },
    {
      name: "externalDir: removeFile",
      fn: async () => {
        const file = `${this._externalDir}/remove-me.txt`;
        await CordovaFileSystem.writeFileAsync(file, "bye");
        await CordovaFileSystem.removeAsync(file);
        const exists = await CordovaFileSystem.existsAsync(file);
        if (exists) throw new Error("삭제되지 않음");
      },
    },
    {
      name: "externalDir: mkdir, readdir, rmdir",
      fn: async () => {
        const dir = `${this._externalDir}/dir-external`;
        await CordovaFileSystem.mkdirsAsync(dir);
        const list = await CordovaFileSystem.readdirAsync(this._externalDir!);
        if (!list.some(item => item.name === "dir-external")) throw new Error("디렉토리 생성 실패");
        await CordovaFileSystem.removeAsync(dir);
        const list2 = await CordovaFileSystem.readdirAsync(this._externalDir!);
        if (list2.some(item => item.name === "dir-external")) throw new Error("디렉토리 삭제 실패");
      },
    },

    // 에러 처리 테스트
    {
      name: "appDir: 읽기 실패",
      fn: async () => {
        try {
          await CordovaFileSystem.readFileStringAsync(`${this._appDir!}/non-existent.txt`);
          throw new Error("예외 발생하지 않음");
        }
        catch {
          // 정상 실패
        }
      },
    },
    {
      name: "externalDir: 디렉토리 삭제 실패",
      fn: async () => {
        try {
          await CordovaFileSystem.removeAsync(`${this._externalDir!}/not-found`);
          throw new Error("예외 발생하지 않음");
        }
        catch {
          // 정상 실패
        }
      },
    },
  ]);

  async runTest(test: ITestEntry) {
    test.status = "pending";
    test.error = "";
    try {
      await test.fn();
      test.status = "success";
    }
    catch (err: any) {
      test.status = "fail";
      test.error = err?.message ?? String(err);
    }
    this.tests.$mark();
  }

  async runAllTests() {
    for (const test of this.tests()) {
      await this.runTest(test);
    }
  }
}

type ITestEntry = {
  name: string;
  fn: () => Promise<void>;
  status?: "pending" | "success" | "fail";
  error?: string;
};