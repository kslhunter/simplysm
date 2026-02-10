import {
  $effect,
  $signal,
  SdBusyContainerControl,
  SdButtonControl,
  SdCardControl,
  SdListControl,
  SdListItemControl,
  SdModalProvider,
  SdServiceClientFactoryProvider,
  SdToastProvider,
  SdTopbarContainerControl,
  SdTopbarControl,
  setupBgTheme,
} from "@simplysm/sd-angular";
import { NetUtils } from "@simplysm/sd-core-common";
import { FsUtils, SdProcess } from "@simplysm/sd-core-node";
import { SdAutoUpdateServiceClient } from "@simplysm/sd-service-client";
import { ipcRenderer } from "electron";
import JSZip from "jszip";
import * as os from "node:os";
import path from "path";
import { ConfirmModal } from "./modals/ConfirmModal";
import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from "@angular/core";
import { faCloudUpload } from "@fortawesome/pro-regular-svg-icons/faCloudUpload";
import { faCloudDownload } from "@fortawesome/pro-regular-svg-icons/faCloudDownload";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdTopbarContainerControl,
    SdTopbarControl,
    SdListControl,
    SdListItemControl,
    SdCardControl,
    SdButtonControl,
    SdBusyContainerControl,
    FaIconComponent,
  ],
  template: `
    <sd-busy-container [busy]="busyCount() > 0" [message]="busyMessage()">
      <sd-topbar-container>
        <sd-topbar class="p-sm-default" style="height: var(--topbar-height)">
          <img src="logo-landscape.png" style="height: 100%; width: auto" alt="로고" />
        </sd-topbar>

        <div class="p-default fill">
          <sd-card>
            <div class="p-default pb-0">
              <header class="page-header">WebStorm 기본설정 적용</header>
            </div>

            <sd-list inset>
              @for (item of items(); track item.versionFull) {
                <sd-list-item contentStyle="line-height: 1.2em;" readonly>
                  <b>{{ item.version }} {{ item.chanel }}</b>
                  <br />
                  <small>({{ item.versionFull }})</small>

                  <ng-template #toolTpl>
                    <div class="flex-row gap-sm">
                      <sd-button
                        size="sm"
                        theme="link-warning"
                        class="upload-button"
                        (click)="onUploadButtonClick(item)"
                      >
                        <fa-icon [icon]="faCloudUpload" />
                      </sd-button>

                      <sd-button
                        size="sm"
                        theme="link-primary"
                        class="upload-button"
                        [disabled]="!webstormSettingsExists()"
                        [title]="
                          !webstormSettingsExists() ? '서버에서 설정을 찾을 수 없습니다.' : ''
                        "
                        (click)="onDownloadButtonClick(item)"
                      >
                        <fa-icon [icon]="faCloudDownload" />
                      </sd-button>
                    </div>
                  </ng-template>
                </sd-list-item>
              }
            </sd-list>
          </sd-card>
        </div>
      </sd-topbar-container>
    </sd-busy-container>
  `,
  styles: [
    /* language=SCSS */ `
      app-root {
        .upload-button > button {
          padding: var(--gap-xs) !important;
        }
      }
    `,
  ],
})
export class AppPage {
  private _sdModal = inject(SdModalProvider);
  private _sdToast = inject(SdToastProvider);
  private _sdServiceClientFactory = inject(SdServiceClientFactoryProvider);

  items = $signal<IItemVM[]>([]);

  webstormSettingsExists = $signal(false);

  busyCount = $signal(0);
  busyMessage = $signal<string>();

  constructor() {
    setupBgTheme({ theme: "gray" });

    $effect([], async () => {
      this.busyCount.update((v) => v + 1);
      this.busyMessage.set("업데이트 확인중...");
      await this._sdToast.try(async () => {
        const currentVersion = await ipcRenderer.invoke("getVersion");

        const serviceClient = this._sdServiceClientFactory.get("MAIN");

        const autoUpdateServiceClient = new SdAutoUpdateServiceClient(serviceClient);
        const lastVersionInfo = await autoUpdateServiceClient.getLastVersion("electron");

        if (lastVersionInfo && currentVersion !== lastVersionInfo.version) {
          this.busyMessage.set("업데이트 다운로드중...");
          const downloadBuffer = await NetUtils.downloadBufferAsync(
            serviceClient.serverUrl + lastVersionInfo.downloadPath,
          );
          const targetPath = path.resolve(
            os.tmpdir(),
            "simplysm-dev-client-devtool",
            path.basename(lastVersionInfo.downloadPath),
          );
          FsUtils.writeFile(targetPath, downloadBuffer);
          this.busyMessage.set("업데이트 실행중...");
          await SdProcess.spawnAsync(targetPath, [], { detached: true });
        }
      });
      this.busyCount.update((v) => v - 1);
      this.busyMessage.set(undefined);
    });

    $effect([], async () => {
      this.busyCount.update((v) => v + 1);
      await this._sdToast.try(async () => {
        await this._refreshWebstormSettingsExists();

        const dirs = FsUtils.readdir(path.resolve(process.env["APPDATA"]!, "JetBrains")).filter(
          (dir) => dir.startsWith("WebStorm") && !dir.endsWith("-backup"),
        );

        const items: IItemVM[] = [];
        for (const dir of dirs) {
          const updatesXmlContent = FsUtils.readFile(
            path.resolve(process.env["APPDATA"]!, "JetBrains", dir, "options", "updates.xml"),
          );

          const versionFull = updatesXmlContent.match(
            /<option name="LAST_BUILD_CHECKED" value="WS-(.*)" \/>/,
          )![1];
          items.push({
            version: dir.substring(8),
            versionFull,
            chanel: updatesXmlContent
              .match(/<option name="UPDATE_CHANNEL_TYPE" value="(.*)" \/>/)?.[1]
              ?.toUpperCase(),
          });
        }

        this.items.set(items);
      });
      this.busyCount.update((v) => v - 1);
    });
  }

  private async _refreshWebstormSettingsExists() {
    const serviceClient = this._sdServiceClientFactory.get("MAIN");
    const exists = await serviceClient.sendAsync("WebstormSettingFileService", "exists", []);
    this.webstormSettingsExists.set(exists);
  }

  async onDownloadButtonClick(item: IItemVM) {
    const result = await this._sdModal.showAsync(
      {
        type: ConfirmModal,
        title: "확인",
        inputs: {
          innerHTML: `<b>서버통합설정 → ${item.version} 로컬설정</b><br/><br/>
<div class='tx-theme-danger-default tx-center'>이 작업은 되돌릴 수 없습니다.</div>`,
        },
      },
      {
        useCloseByBackdrop: true,
        useCloseByEscapeKey: true,
      },
    );
    if (result == null) return;

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      const serviceClient = this._sdServiceClientFactory.get("MAIN");
      const buf = await serviceClient.sendAsync("WebstormSettingFileService", "get", []);

      const zip = await new JSZip().loadAsync(buf);
      for (const relFilePath of Object.keys(zip.files)) {
        const file = zip.files[relFilePath];
        if (!file.dir) {
          const fileBuffer = await file.async("nodebuffer");
          FsUtils.writeFile(
            process.env["NODE_ENV"] === "production"
              ? path.resolve(
                  process.env["APPDATA"]!,
                  "JetBrains",
                  `WebStorm${item.version}`,
                  relFilePath,
                )
              : path.resolve(
                  process.cwd(),
                  ".tmp/webstorm-settings",
                  `WebStorm${item.version}`,
                  relFilePath,
                ),
            fileBuffer,
          );
        }
      }

      let vmoptions = FsUtils.readFile(
        path.resolve(
          process.env["APPDATA"]!,
          "JetBrains",
          `WebStorm${item.version}`,
          "webstorm64.exe.vmoptions",
        ),
      );

      const options = [
        ["Xms", "4g"],
        ["Xmx", "12g"],
        ["XX:+UseG1GC"],
        ["XX:SoftRefLRUPolicyMSPerMB", "=50"],
        ["XX:CICompilerCount", "=" + Math.round(os.cpus().length / 4)],
        ["XX:ReservedCodeCacheSize", "=1024m"],
        ["XX:+HeapDumpOnOutOfMemoryError"],
        ["XX:-OmitStackTraceInFastThrow"],

        ["Dsun.io.useCanonCaches", "=false"],
        ["Djdk.http.auth.tunneling.disabledSchemes", '=""'],

        ["ea"],
      ];

      const lines = vmoptions.split("\n");
      for (const option of options) {
        if (option.length === 2) {
          const index = lines.findIndex((line) => line.startsWith("-" + option[0]));
          if (index >= 0) {
            lines[index] = "-" + option[0] + option[1];
          } else {
            lines.push("-" + option[0] + option[1]);
          }
        } else {
          const exists = lines.some((line) => line === "-" + option[0]);
          if (!exists) {
            lines.push("-" + option[0]);
          }
        }
      }

      FsUtils.writeFile(
        process.env["NODE_ENV"] === "production"
          ? path.resolve(
              process.env["APPDATA"]!,
              "JetBrains",
              `WebStorm${item.version}`,
              "webstorm64.exe.vmoptions",
            )
          : path.resolve(
              process.cwd(),
              ".tmp/webstorm-settings",
              `WebStorm${item.version}`,
              "webstorm64.exe.vmoptions",
            ),
        lines.join("\n"),
      );

      this._sdToast.success("완료되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  async onUploadButtonClick(item: IItemVM) {
    const result = await this._sdModal.showAsync(
      {
        type: ConfirmModal,
        title: "잠금 풀기",
        inputs: {
          innerHTML: `<b>${item.version} 로컬설정 → 서버통합설정</b><br/><br/>
<div class='tx-theme-danger-default tx-center'>이 작업은 되돌릴 수 없습니다.</div>`,
          placeholder: "관리자 인증번호를 입력하세요.",
        },
      },
      {
        useCloseByBackdrop: true,
        useCloseByEscapeKey: true,
      },
    );
    if (result == null) return;
    if (result !== "180830") {
      this._sdToast.danger("인증번호가 잘 못 되었습니다.");
      return;
    }

    this.busyCount.update((v) => v + 1);
    await this._sdToast.try(async () => {
      const fileGlobs = [
        "codestyles/**/*",
        "colors/**/*",
        "fileTemplates/**/*",
        "inspection/**/*",
        "keymaps/**/*",
        "options/windows/**/*",
        "options/advancedSettings.xml",
        "options/baseRefactoring.xml",
        "options/colors.scheme.xml",
        "options/duplicatesDetector.xml",
        "options/editor-font.xml",
        "options/editor.xml",
        "options/emmet.xml",
        "options/file.template.settings.xml",
        "options/find.xml",
        "options/gutter.xml",
        "options/ide.general.local.xml",
        "options/ide.general.xml",
        "options/intentionSettings.xml",
        "options/IntelliLang.xml",
        "options/keymapFlags.xml",
        "options/macros.xml",
        "options/parameter.hints.xml",
        "options/project.default.xml",
        "options/spellchecker-dictionary.xml",
        "options/terminal.xml",
        "options/ui.lnf.xml",
        "options/vcs.xml",
        "templates/**/*",
        "bundled_plugins.txt",
        "disabled_plugins.txt",
      ];

      const zip = new JSZip();

      const settingsRootPath = path.resolve(
        process.env["APPDATA"]!,
        "JetBrains",
        `WebStorm${item.version}`,
      );

      for (const fileGlob of fileGlobs) {
        for (const filePath of FsUtils.glob(path.resolve(settingsRootPath, fileGlob), {
          nodir: true,
        })) {
          const relFilePath = path.relative(settingsRootPath, filePath);
          zip.file(relFilePath, FsUtils.readFile(filePath));
        }
      }

      const zipFileBuffer = await zip.generateAsync({ type: "nodebuffer" });

      const serviceClient = this._sdServiceClientFactory.get("MAIN");
      await serviceClient.sendAsync("WebstormSettingFileService", "upload", [zipFileBuffer]);

      await this._refreshWebstormSettingsExists();

      this._sdToast.success("완료되었습니다.");
    });
    this.busyCount.update((v) => v - 1);
  }

  protected readonly faCloudUpload = faCloudUpload;
  protected readonly faCloudDownload = faCloudDownload;
}

interface IItemVM {
  version: string;
  versionFull: string;
  chanel?: string;
}
