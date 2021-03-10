import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { FsUtil } from "@simplysm/sd-core-node";
import { SdLocalStorageRootProvider, SdToastProvider } from "@simplysm/sd-angular";
import * as path from "path";
import * as electron from "electron";
import { Router } from "@angular/router";
import {
  IClientLibPackage,
  IClientPackage,
  ICommonLibPackage,
  IDbLibPackage,
  INpmConfig,
  IServerPackage
} from "./commons";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="busyCount > 0">
      <ng-container *ngIf="!project">
        <sd-pane class="sd-text-color-grey-light sd-padding-left-xxl"
                 style="line-height: 1.5em; padding-top: 120px; cursor:pointer;"
                 (click)="onFolderOpenButtonClick()">
          <div style="text-align: center;">
            <sd-icon icon="folder-open" fixedWidth style="font-size:120px"></sd-icon>
            <sd-gap height.px="24"></sd-gap>
            <div style="font-size: 48px;">
              프로젝트 열기
            </div>
          </div>
        </sd-pane>
      </ng-container>

      <ng-container *ngIf="project">
        <sd-sidebar-container>
          <sd-sidebar>
            <sd-dock-container>
              <sd-dock>
                <sd-sidebar-brand class="sd-padding-sm-default-default-default"
                                  [sdRouterLink]="['/main']"
                                  style="cursor: pointer;">
                  <h2>SIMPLYSM STUDIO</h2>
                </sd-sidebar-brand>

                <sd-sidebar-user menuTitle="프로젝트 설정" content.style="text-align: left">
                  <div class="sd-padding-top-sm">
                    <h4>
                      <sd-icon icon="folder-open"></sd-icon>
                      {{ project.name }}
                    </h4>
                  </div>

                  <sd-sidebar-user-menu>
                    <sd-list class="sd-padding-sm-0">
                      <sd-list-item *ngFor="let configFileName of project.configFileNames; trackBy: trackByMeFn">
                        <sd-gap width.px="6"></sd-gap>
                        {{ configFileName }}
                      </sd-list-item>
                    </sd-list>
                  </sd-sidebar-user-menu>
                </sd-sidebar-user>
              </sd-dock>

              <sd-pane class="sd-padding-sm-0">
                <sd-list>
                  <sd-list-item layout="flat">
                    공통 LIB 패키지
                    <sd-list>
                      <sd-list-item *ngFor="let commonLibPackage of project.commonLibPackages; trackBy: trackByNameFn"
                                    content.style="cursor: auto;" content.class="sd-text-color-grey-dark">
                        {{ commonLibPackage.name }}
                      </sd-list-item>
                    </sd-list>
                  </sd-list-item>
                  <sd-list-item layout="flat">
                    DB LIB 패키지
                    <sd-list>
                      <sd-list-item *ngFor="let dbLibPackage of project.dbLibPackages; trackBy: trackByNameFn">
                        {{ dbLibPackage.name }}
                        <sd-list>
                          <sd-list-item (click)="onOpenDbModelPageButtonClick(dbLibPackage)">
                            <sd-gap width.px="6"></sd-gap>
                            모델 관리
                          </sd-list-item>
                          <sd-list-item>
                            <sd-gap width.px="6"></sd-gap>
                            모델 ↔ DB 비교
                          </sd-list-item>
                          <sd-list-item>
                            <sd-gap width.px="6"></sd-gap>
                            쿼리 테스트
                          </sd-list-item>
                        </sd-list>
                      </sd-list-item>
                    </sd-list>
                  </sd-list-item>
                  <sd-list-item layout="flat">
                    서버 패키지
                    <sd-list>
                      <sd-list-item *ngFor="let serverPackage of project.serverPackages; trackBy: trackByNameFn"
                                    content.style="cursor: auto;" content.class="sd-text-color-grey-dark">
                        {{ serverPackage.name }}
                      </sd-list-item>
                    </sd-list>
                  </sd-list-item>
                  <sd-list-item layout="flat">
                    클라이언트 LIB 패키지
                    <sd-list>
                      <sd-list-item *ngFor="let clientLibPackage of project.clientLibPackages; trackBy: trackByNameFn"
                                    content.style="cursor: auto;" content.class="sd-text-color-grey-dark">
                        {{ clientLibPackage.name }}
                      </sd-list-item>
                    </sd-list>
                  </sd-list-item>
                  <sd-list-item layout="flat">
                    클라이언트 패키지
                    <sd-list>
                      <sd-list-item *ngFor="let clientPackage of project.clientPackages; trackBy: trackByNameFn"
                                    [content.style]="!clientPackage.hasRouter ? 'cursor: auto;' : ''"
                                    [content.class]="!clientPackage.hasRouter ? 'sd-text-color-grey-dark' : ''">
                        {{ clientPackage.name }}
                        <sd-list *ngIf="clientPackage.hasRouter">
                          <sd-list-item>
                            <sd-gap width.px="6"></sd-gap>
                            패이지 관리
                          </sd-list-item>
                          <sd-list-item>
                            <sd-gap width.px="6"></sd-gap>
                            모달 관리
                          </sd-list-item>
                          <sd-list-item>
                            <sd-gap width.px="6"></sd-gap>
                            컨트롤 관리
                          </sd-list-item>
                        </sd-list>
                      </sd-list-item>
                    </sd-list>
                  </sd-list-item>
                </sd-list>
              </sd-pane>
            </sd-dock-container>
          </sd-sidebar>

          <router-outlet></router-outlet>
        </sd-sidebar-container>
      </ng-container>
    </sd-busy-container>`
})
export class AppPage implements OnInit {
  public busyCount = 0;

  public project?: IProjectVM;

  public trackByMeFn = (i: number, item: any): string => item;
  public trackByNameFn = (i: number, item: any): string => item.name ?? item;

  public constructor(private readonly _toast: SdToastProvider,
                     private readonly _localStorage: SdLocalStorageRootProvider,
                     private readonly _router: Router,
                     private readonly _cdr: ChangeDetectorRef) {
  }

  public async ngOnInit(): Promise<void> {
    const lastLoadedProjectPath = this._localStorage.get("last-loaded-project-path");
    if (lastLoadedProjectPath !== undefined) {
      this.busyCount++;

      await this._toast.try(async () => {
        await this._loadProject(lastLoadedProjectPath);
        this._localStorage.set("last-loaded-project-path", lastLoadedProjectPath);
      });
      this.busyCount--;
      this._cdr.markForCheck();
    }
  }

  public async onFolderOpenButtonClick(): Promise<void> {
    const diag = await electron.remote.dialog.showOpenDialog(electron.remote.getCurrentWindow(), { properties: ["openDirectory"] });
    if (diag.canceled || !diag.filePaths[0]) return;

    this.busyCount++;

    await this._toast.try(async () => {
      await this._loadProject(diag.filePaths[0]);
      this._localStorage.set("last-loaded-project-path", diag.filePaths[0]);
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }

  public async onOpenDbModelPageButtonClick(dbLibPackage: IDbLibPackage): Promise<void> {
    await this._router.navigate(["/db-model", dbLibPackage]);
  }

  private async _loadProject(rootPath: string): Promise<void> {
    const rootFilePaths = await FsUtil.readdirAsync(rootPath);
    if (!rootFilePaths.includes("package.json") || !rootFilePaths.includes("simplysm.json")) {
      this._toast.danger("선택한 디렉토리는 심플리즘 프로젝트 디렉토리가 아닙니다.");
      return;
    }

    const npmConfigFilePath = path.resolve(rootPath, "package.json");
    const npmConfig: INpmConfig = await FsUtil.readJsonAsync(npmConfigFilePath);

    const dbLibPackages: IDbLibPackage[] = [];
    const serverPackages: IServerPackage[] = [];
    const clientPackages: IClientPackage[] = [];
    const commonLibPackages: ICommonLibPackage[] = [];
    const clientLibPackages: IClientLibPackage[] = [];

    if (!npmConfig.workspaces) {
      this._toast.danger("'package.json'에 'workspaces'설정이 없습니다.");
      return;
    }
    const allPackagePaths = await npmConfig.workspaces.mapManyAsync(async (item) => await FsUtil.globAsync(path.resolve(rootPath, item)));

    for (const packagePath of allPackagePaths) {
      const packageNpmConfigFilePath = path.resolve(packagePath, "package.json");
      if (!FsUtil.exists(packageNpmConfigFilePath)) continue;
      const packageNpmConfig: INpmConfig = await FsUtil.readJsonAsync(packageNpmConfigFilePath);

      const isLibPackage = packageNpmConfig.types !== undefined;

      if (isLibPackage) {
        // client-lib
        if (packageNpmConfig.dependencies && Object.keys(packageNpmConfig.dependencies).some((depKey) => depKey.startsWith("@angular/core"))) {
          clientLibPackages.push({
            rootPath: packagePath,
            name: packageNpmConfig.name.split("/").last()!
          });
        }
        // db-lib
        else if ((await FsUtil.readdirAsync(path.resolve(packagePath, "src"))).some((item) => item.endsWith("DbContext.ts"))) {
          dbLibPackages.push({
            rootPath: packagePath,
            name: packageNpmConfig.name.split("/").last()!
          });
        }
        // common-lib
        else {
          commonLibPackages.push({
            rootPath: packagePath,
            name: packageNpmConfig.name.split("/").last()!
          });
        }
      }
      else {
        // client
        if (packageNpmConfig.dependencies && Object.keys(packageNpmConfig.dependencies).some((depKey) => depKey.startsWith("@angular/core"))) {
          clientPackages.push({
            rootPath: packagePath,
            name: packageNpmConfig.name.split("/").last()!,
            hasRouter: Object.keys(packageNpmConfig.dependencies).some((depKey) => depKey.startsWith("@angular/router"))
          });
        }
        // server
        else if (packageNpmConfig.dependencies && Object.keys(packageNpmConfig.dependencies).some((depKey) => depKey.startsWith("@simplysm/sd-service-node"))) {
          serverPackages.push({
            rootPath: packagePath,
            name: packageNpmConfig.name.split("/").last()!
          });
        }
      }
    }

    const configFileNames = rootFilePaths.filter((item) => (/^simplysm.*\.json$/).test(item));

    this.project = {
      rootPath,
      name: npmConfig.name,
      configFileNames,
      dbLibPackages,
      serverPackages,
      clientPackages,
      commonLibPackages,
      clientLibPackages
    };
  }
}

interface IProjectVM {
  rootPath: string;
  name: string;
  configFileNames: string[];
  dbLibPackages: IDbLibPackage[];
  serverPackages: IServerPackage[];
  clientPackages: IClientPackage[];
  commonLibPackages: ICommonLibPackage[];
  clientLibPackages: IClientLibPackage[];
}