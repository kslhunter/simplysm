import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { SdToastProvider } from "@simplysm/sd-angular";
import { FsUtil } from "@simplysm/sd-core-node";
import * as path from "path";

@Component({
  selector: "app-config",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="busyCount > 0">
      <sd-topbar-container *ngIf="data">
        <sd-topbar>
          <h4>설정관리 ({{data.fileName}})</h4>

          <sd-topbar-menu (click)="onSaveButtonClick()">
            <sd-icon icon="save" fixedWidth></sd-icon>
            저장 <small>(CTRL+S)</small>
          </sd-topbar-menu>
          <sd-topbar-menu (click)="onRefreshButtonClick()">
            <sd-icon icon="redo" fixedWidth></sd-icon>
            새로고침 <small>(CTRL+ALT+L)</small>
          </sd-topbar-menu>
        </sd-topbar>

        <sd-pane class="sd-padding-default">
          <ng-container *ngFor="let packageName of packageNames; trackBy: trackByMeFn">
            <h5 class="sd-page-header">패키지 ({{ packageName }})</h5>
            <br/>
          </ng-container>
          
          <h5 class="sd-page-header">배포후 작업</h5>
          <br/>

          <h5 class="sd-page-header">로컬 업데이트</h5>
          <br/>
          <br/>
        </sd-pane>
      </sd-topbar-container>
    </sd-busy-container>`
})
export class ConfigPage implements OnInit {
  public busyCount = 0;

  public data?: IDataVM;

  public trackByMeFn = (index: number, item: any): any => item;

  public get packageNames(): string[] {
    return Object.keys(this.data!.packages);
  }

  public constructor(private readonly _activatedRoute: ActivatedRoute,
                     private readonly _toast: SdToastProvider,
                     private readonly _cdr: ChangeDetectorRef) {
  }

  public async ngOnInit(): Promise<void> {
    this.busyCount++;

    await this._toast.try(async () => {
      const configFilePath = this._activatedRoute.snapshot.params.configFilePath;
      const config = await FsUtil.readJsonAsync(configFilePath);


      this.data = {
        fileName: path.basename(configFilePath, path.extname(configFilePath)),
        ...config
      };
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }
}

interface IDataVM extends ISdProjectConfig {
  fileName: string;
}

interface ISdProjectConfig {
  packages: Record<string, TSdPackageConfig>;
  afterPublish?: TSdAfterPublishConfig[];
  localUpdates?: Record<string, string>;
}

type TSdPackageConfig =
  ISdLibraryPackageConfig |
  ISdClientPackageConfig |
  ISdServerPackageConfig |
  ISdNonePackageConfig |
  ISdTestPackageConfig;

type TSdAfterPublishConfig =
  ISdZipAfterPublishConfig |
  ISdSshAfterPublishConfig;

type TSdPublishConfig =
  ISdSFtpPublishConfig |
  ISdLocalDirectoryPublishConfig |
  ISdFtpPublishConfig;

interface ISdLibraryPackageConfig {
  type: "library";
  targets?: ("node" | "browser")[];
  polyfills?: string[];
  publish?: "npm";
}

interface ISdClientPackageConfig {
  type: "client";
  platforms?: TSdClientPackageConfigPlatform[];
  env?: Record<string, string>;
  server?: string;
  devServer?: {
    port: number;
  };
  configs?: Record<string, any>;
  publish?: TSdPublishConfig;
}

type TSdClientPackageConfigPlatform =
  ISdClientPackageConfigBrowserPlatform |
  ISdClientPackageConfigWindowsPlatform |
  ISdClientPackageConfigAndroidPlatform;

interface ISdClientPackageConfigBrowserPlatform {
  type: "browser";
}

interface ISdClientPackageConfigWindowsPlatform {
  type: "windows";
  width?: number;
  height?: number;
}

interface ISdClientPackageConfigAndroidPlatform {
  type: "android";
  appId: string;
  appName: string;
  plugins?: string[];
  icon?: string;
  sign?: {
    keystore: string;
    storePassword: string;
    alias: string;
    password: string;
    keystoreType: string;
  };
}

interface ISdServerPackageConfig {
  type: "server";
  env?: Record<string, string>;
  configs?: Record<string, any>;
  publish?: TSdPublishConfig;
  pm2?: { watchIgnoreDirectories?: string[] };
}

interface ISdNonePackageConfig {
  type: "none";
}

interface ISdTestPackageConfig {
  type: "test";
}

interface ISdSFtpPublishConfig {
  type: "sftp";
  host: string;
  port?: number;
  path: string;
  username: string;
  password: string;
}

interface ISdFtpPublishConfig {
  type: "ftp";
  host: string;
  port?: number;
  path: string;
  username: string;
  password: string;
}

interface ISdLocalDirectoryPublishConfig {
  type: "local-directory";
  path: string;
}

interface ISdZipAfterPublishConfig {
  type: "zip";
  path: string;
}


interface ISdSshAfterPublishConfig {
  type: "ssh";
}