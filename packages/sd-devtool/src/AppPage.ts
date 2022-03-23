import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { SdToastProvider } from "@simplysm/sd-angular";

import { SdProcess } from "@simplysm/sd-core-node";
import { appIcons } from "./app-icons";
import { Wait } from "@simplysm/sd-core-common";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sdm-topbar-container>
      <sdm-topbar>
        <div class="sd-padding-sm-0" style="height: 90%;">
          <img *ngIf="(logo | async) as src" [src]="src" style="height: 100%; filter: grayscale(100%); opacity: .3;"/>
        </div>
      </sdm-topbar>

      <sd-pane class="sd-padding-default">
        <sdm-card>
          <sdm-busy-container [busy]="nvmBusyCount > 0" class="sd-padding-lg">
            <h4>
              NVM 설정
              <sd-anchor (click)="onNvmRefreshButtonClick()">
                <fa-icon [icon]="icons.refresh | async" [fixedWidth]="true"></fa-icon>
              </sd-anchor>
            </h4>
            <sd-gap height="xl"></sd-gap>

            <sdm-list>
              <ng-container *ngFor="let nvmVersion of nvm.versions">
                <sd-list-item (click)="onNvmVersionClick(nvmVersion)"
                              [style.fontWeight]="nvmVersion === nvm.currentVersion ? 'bold' : undefined">
                  {{ nvmVersion }}
                  <fa-icon [icon]="icons.check | async" [fixedWidth]="true"
                           *ngIf="nvmVersion === nvm.currentVersion"></fa-icon>
                </sd-list-item>
              </ng-container>
            </sdm-list>
          </sdm-busy-container>
        </sdm-card>
      </sd-pane>
    </sdm-topbar-container>`,
  styles: [/* language=SCSS */ `
    :host {
      ._header {
        padding: var(--gap-xs) var(--gap-default);
        background-color: var(--theme-color-grey-lighter);
        font-size: small;
        font-weight: bold;
      }
    }
  `]
})
export class AppPage implements OnInit {
  public icons = appIcons;

  // @ts-expect-error
  public logo = import("../res/logo-landscape.png").then(m => m.default);

  public nvmBusyCount = 0;

  public nvm: {
    versions: string[];
    currentVersion?: string;
  } = {
    versions: []
  };

  public constructor(private readonly _toast: SdToastProvider,
                     private readonly _cdr: ChangeDetectorRef) {
    document.documentElement.style.setProperty("--background-color", "var(--color-blue-grey-50)");
  }

  public async ngOnInit(): Promise<void> {
    this.nvmBusyCount++;
    await this._toast.try(async () => {
      await this._nvmRefreshAsync();
    });

    this.nvmBusyCount--;
    this._cdr.markForCheck();
  }

  public async onNvmRefreshButtonClick(): Promise<void> {
    this.nvmBusyCount++;
    await this._toast.try(async () => {
      await this._nvmRefreshAsync();
    });

    this.nvmBusyCount--;
    this._cdr.markForCheck();
  }

  public async onNvmVersionClick(nvmVersion: string): Promise<void> {
    this.nvmBusyCount++;
    await this._toast.try(async () => {
      await SdProcess.spawnAsync(`powershell start-process -windowstyle hidden -verb runas 'nvm' 'use ${nvmVersion}'`);
      await Wait.time(300);
      await this._nvmRefreshAsync();
    });

    this.nvmBusyCount--;
    this._cdr.markForCheck();
  }

  private async _nvmRefreshAsync(): Promise<void> {
    const result = await SdProcess.spawnAsync("nvm list", undefined);
    this.nvm = {
      versions: result.match(/[0-9]*\.[0-9]*\.[0-9]*/g) ?? [],
      currentVersion: result.match(/\* [0-9]*\.[0-9]*\.[0-9]*/g)?.[0]?.slice(2)
    };
  }
}
