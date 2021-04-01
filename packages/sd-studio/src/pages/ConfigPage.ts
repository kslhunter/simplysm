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

        <sd-pane>
          <div class="sd-padding-default sd-background-color-white">
            <ng-container *ngIf="this.data!.packages">
              <ng-container *ngFor="let packageName of packageNames; trackBy: trackByMeFn">
                <h5 class="sd-page-header">패키지 ({{ packageName }})</h5>

                <ng-template [ngTemplateOutlet]="pkgConfigTemplateRef"
                             [ngTemplateOutletContext]="{pkgConfig: this.data!.packages![packageName], parentType: undefined, chain: []}"></ng-template>
                <br/>
                <br/>
              </ng-container>
            </ng-container>

            <h5 class="sd-page-header">확장</h5>
            <br/>

            <h5 class="sd-page-header">배포후 작업</h5>
            <br/>

            <h5 class="sd-page-header">로컬 업데이트</h5>
            <br/>
            <br/>
          </div>
        </sd-pane>
      </sd-topbar-container>
    </sd-busy-container>


    <ng-template #pkgConfigTemplateRef let-pkgConfig="pkgConfig" let-parentType="parentType" let-chain="chain">
      <sd-form layout="table" label.width="120px">
        <sd-form-item label="패키지구분:">
          <ng-container
            *ngFor="let type of ['library', 'client', 'server', 'none', 'test']; trackBy: trackByMeFn">
            <sd-checkbox radio inline
                         [value]="pkgConfig.type === type"
                         (valueChange)="$event ? pkgConfig.type = type : pkgConfig.type = undefined">
              {{ type }}
            </sd-checkbox>
          </ng-container>
        </sd-form-item>

        <ng-container *ngIf="(pkgConfig.type || parentType) !== 'test' || (pkgConfig.type || parentType) !== 'none'">
          <ng-container *ngIf="(pkgConfig.type || parentType) === 'library'">
            <sd-form-item label="빌드타겟:">
              <sd-checkbox-group [(value)]="pkgConfig.targets">
                <sd-checkbox-group-item value="node">node</sd-checkbox-group-item>
                <sd-checkbox-group-item value="browser">browser</sd-checkbox-group-item>
              </sd-checkbox-group>
            </sd-form-item>
            <sd-form-item label="배포방법:">
              <sd-checkbox inline
                           [value]="pkgConfig.publish === 'npm'"
                           (valueChange)="$event ? pkgConfig.publish = 'npm' : pkgConfig.publish = undefined">
                npm
              </sd-checkbox>
            </sd-form-item>
            <sd-form-item label="폴리필:">
              <sd-button inline>추가</sd-button>
              <sd-gap width="sm"></sd-gap>

              <ng-container *ngIf="pkgConfig.polyfills">
                <ng-container *ngFor="let polyfill of pkgConfig.polyfills; trackBy: trackByMeFn">
                  <sd-button inline theme="info">
                    <sd-icon icon="times" fixedWidth></sd-icon>
                    {{ polyfill }}
                  </sd-button>
                  <sd-gap width="sm"></sd-gap>
                </ng-container>
              </ng-container>
            </sd-form-item>
          </ng-container>
          <ng-container *ngIf="(pkgConfig.type || parentType) === 'client'">
            ??CLIENT??
          </ng-container>
          <ng-container *ngIf="(pkgConfig.type || parentType) === 'server'">
            ??SERVER??
          </ng-container>
          <sd-form-item label="확장선택:">
            <sd-button inline>추가</sd-button>
            <sd-gap width="sm"></sd-gap>

            <ng-container *ngIf="pkgConfig.extends">
              <ng-container *ngFor="let extend of pkgConfig.extends; trackBy: trackByMeFn">
                <sd-button inline theme="info">
                  <sd-icon icon="times" fixedWidth></sd-icon>
                  {{ extend }}
                </sd-button>
                <sd-gap width="sm"></sd-gap>
              </ng-container>
            </ng-container>
          </sd-form-item>
          <sd-form-item label="개발용 부가설정:" *ngIf="!chain.includes('dev-prod')">
            <sd-checkbox inline [value]="pkgConfig.development !== undefined">사용</sd-checkbox>
            <sd-gap height="sm"></sd-gap>

            <div style="display: inline-block;"
                 class="sd-border-brightness-default sd-padding-sm-default"
                 *ngIf="pkgConfig.development">
              <ng-template [ngTemplateOutlet]="pkgConfigTemplateRef"
                           [ngTemplateOutletContext]="{pkgConfig: pkgConfig.development, parentType: pkgConfig.type, chain: chain.concat(['dev-prod'])}"></ng-template>
            </div>
          </sd-form-item>
          <sd-form-item label="배포용 부가설정:" *ngIf="!chain.includes('dev-prod')">
            <sd-checkbox inline [value]="pkgConfig.production !== undefined">사용</sd-checkbox>
            <sd-gap height="sm"></sd-gap>

            <div style="display: inline-block;"
                 class="sd-border-brightness-default sd-padding-sm-default"
                 *ngIf="pkgConfig.production">
              <ng-template [ngTemplateOutlet]="pkgConfigTemplateRef"
                           [ngTemplateOutletContext]="{pkgConfig: pkgConfig.production, parentType: pkgConfig.type, chain: chain.concat(['dev-prod'])}"></ng-template>
            </div>
          </sd-form-item>
          <sd-form-item label="옵션별 부가설정:">
            <sd-button inline>추가</sd-button>
            <sd-gap height="sm"></sd-gap>

            <ng-container *ngFor="let optionName of getOptionNames(pkgConfig); trackBy: trackByMeFn">
              <div style="display: inline-block;"
                   class="sd-border-brightness-default sd-padding-sm-default">
                <sd-anchor style="float: right;">
                  <sd-icon icon="times" fixedWidth></sd-icon>
                  삭제
                </sd-anchor>
                옵션명: {{ optionName.replace("@", "") }}

                <ng-template [ngTemplateOutlet]="pkgConfigTemplateRef"
                             [ngTemplateOutletContext]="{pkgConfig: pkgConfig[optionName], parentType: pkgConfig.type, chain: chain.concat(['option'])}"></ng-template>
              </div>
              <br/>
            </ng-container>
          </sd-form-item>
        </ng-container>
      </sd-form>
    </ng-template>`
})
export class ConfigPage implements OnInit {
  public busyCount = 0;

  public data?: IDataVM;

  public trackByMeFn = (index: number, item: any): any => item;

  public get packageNames(): string[] {
    return Object.keys(this.data!.packages!);
  }

  public getOptionNames(packageConfig: Record<string, any>): string[] {
    return Object.keys(packageConfig).filter((item) => item.startsWith("@"));
  }

  public constructor(private readonly _activatedRoute: ActivatedRoute,
                     private readonly _toast: SdToastProvider,
                     private readonly _cdr: ChangeDetectorRef) {
  }

  public ngOnInit(): void {
    this._activatedRoute.params.forEach(async (params) => {
      this.busyCount++;

      await this._toast.try(async () => {
        const configFilePath = params.configFilePath;
        const config = await FsUtil.readJsonAsync(configFilePath);

        this.data = {
          fileName: path.basename(configFilePath, path.extname(configFilePath)),
          ...config
        };
      });
      this.busyCount--;
      this._cdr.markForCheck();
    }).catch((err) => {
      this._toast.danger(err.message);
      // eslint-disable-next-line no-console
      console.error(err);
    });
  }
}

interface IDataVM extends IProjectConfig {
  fileName: string;
}

interface IProjectConfig {
  packages?: Record<string, Record<string, any>>;
  extends?: Record<string, Record<string, any>>;
  afterPublish?: any[];
  localUpdates?: Record<string, string>;
}