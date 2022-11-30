import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ISdSheet2ColumnOrderingVM } from "@simplysm/sd-angular";
import { DateTime } from "@simplysm/sd-core-common";

@Component({
  selector: "app-sheet2",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-topbar-container>
      <sd-topbar>
        <h4>시트2</h4>
      </sd-topbar>

      <sd-pane class="sd-padding-default">
        <sd-card class="sd-padding-default" style="height: 100%;">
          <sd-sheet2 key="sheet2"
                     [items]="items"
                     [ordering]="ordering"
                     selectMode="single"
                     autoSelect="focus"
                     [page]="5"
                     [pageLength]="100"
                     [getChildrenFn]="getChildrenFn">
            <sd-sheet2-column [header]="['헤더', '고정헤더', '헤더1']" fixed width="20px" resizable>
              <ng-template #cell let-item="item">
                <div class="sd-padding-xs-sm">
                  {{ item.id }}
                </div>
              </ng-template>
            </sd-sheet2-column>
            <sd-sheet2-column [header]="['헤더', '고정헤더', '헤더2']" fixed useOrdering resizable key="header2">
              <ng-template #cell let-item="item" let-depth="depth">
                <div class="sd-padding-xs-sm">
                  <sd-gap [width.em]="depth * 1"></sd-gap>
                  {{ item.title }}
                </div>
              </ng-template>
            </sd-sheet2-column>
            <sd-sheet2-column [header]="['헤더', '일반헤더', '헤더3']" width="100px" tooltip="헤더3툴팁">
              <ng-template #cell let-item="item">
                <div class="sd-padding-xs-sm">
                  {{ item.title }}
                </div>
              </ng-template>
            </sd-sheet2-column>
            <sd-sheet2-column [header]="['헤더', '일반헤더', '헤더4']" fixed>
              <ng-template #cell let-item="item">
                <div class="sd-padding-xs-sm">
                  {{ item.title }}
                </div>
              </ng-template>
            </sd-sheet2-column>
            <sd-sheet2-column [header]="['헤더', '일반헤더', '헤더5']">
              <ng-template #cell let-item="item" let-edit="edit">
                <!--<sd-textfield [(value)]="item.title" size="sm" inset [readonly]="!edit"></sd-textfield>-->
              </ng-template>
            </sd-sheet2-column>
            <sd-sheet2-column [header]="['헤더', '헤더6']" useOrdering key="header6">
              <ng-template #cell let-item="item" let-edit="edit">
                <!--<sd-textfield [(value)]="item.title" size="sm" inset [readonly]="!edit"></sd-textfield>-->
              </ng-template>
            </sd-sheet2-column>
            <sd-sheet2-column [header]="['헤더7']" resizable width="200px">
              <ng-template #cell let-item="item">
                <div class="sd-padding-xs-sm">
                  {{ item.title }}
                </div>
              </ng-template>
            </sd-sheet2-column>
            <sd-sheet2-column [header]="['헤더', '헤더8']">
              <ng-template #cell let-item="item">
                <div class="sd-padding-xs-sm">
                  {{ item.title }}
                </div>
              </ng-template>
            </sd-sheet2-column>
            <sd-sheet2-column [header]="['헤더', '헤더9']" hidden>
              <ng-template #cell let-item="item">
                <div class="sd-padding-xs-sm">
                  {{ item.title }}
                </div>
              </ng-template>
            </sd-sheet2-column>
            <sd-sheet2-column [header]="['헤더10']" collapse>
              <ng-template #cell let-item="item">
                <div class="sd-padding-xs-sm">
                  {{ item.title }}
                </div>
              </ng-template>
            </sd-sheet2-column>
            <sd-sheet2-column [header]="['헤더', '헤더11']" resizable useOrdering key="header11">
              <ng-template #header>
                <div class="sd-padding-xs-sm">
                  헤더11 템플릿
                </div>
              </ng-template>
              <ng-template #summary>
                <div class="sd-padding-xs-sm">
                  SUM
                </div>
              </ng-template>
              <ng-template #cell let-item="item">
                <div class="sd-padding-xs-sm">
                  {{ item.title }}
                </div>
              </ng-template>
            </sd-sheet2-column>
          </sd-sheet2>
        </sd-card>
      </sd-pane>
    </sd-topbar-container>
  `
})
export class Sheet2Page {
  public items = [
    {
      id: 7,
      isNotice: true,
      title: "반드시 읽어주세요",
      createdAtDateTime: new DateTime(),
      children: [
        {
          id: 9,
          isNotice: true,
          title: "반드시 읽어주세요(3)",
          createdAtDateTime: new DateTime(),
          children: [
            {
              id: 11,
              isNotice: true,
              title: "반드시 읽어주세요(3)",
              createdAtDateTime: new DateTime()
            },
            {
              id: 12,
              isNotice: true,
              title: "반드시 읽어주세요(4)",
              createdAtDateTime: new DateTime()
            }
          ]
        },
        {
          id: 10,
          isNotice: true,
          title: "반드시 읽어주세요(4)",
          createdAtDateTime: new DateTime()
        }
      ]
    },
    {
      id: 6,
      isNotice: true,
      title: "반드시 읽어주세요(2)",
      createdAtDateTime: new DateTime()
    },
    {
      id: 5,
      isNotice: false,
      title: "5번글",
      createdAtDateTime: new DateTime()
    },
    {
      id: 4,
      isNotice: false,
      title: "4번 글",
      createdAtDateTime: new DateTime()
    },
    {
      id: 3,
      isNotice: false,
      title: "3번 글",
      createdAtDateTime: new DateTime()
    },
    {
      id: 2,
      isNotice: false,
      title: "2번 글",
      createdAtDateTime: new DateTime()
    },
    {
      id: 1,
      isNotice: false,
      title: "1번 글",
      createdAtDateTime: new DateTime()
    }
  ];

  public ordering: ISdSheet2ColumnOrderingVM[] = [];

  public getChildrenFn = (index: number, item: any): any[] | undefined => {
    return item.children;
  };

  public ngOnInit(): void {
    for (let i = 0; i < 400; i++) {
      this.items.push(
        {
          id: i + 1000,
          isNotice: false,
          title: "1번 글",
          createdAtDateTime: new DateTime()
        });
    }
  }
}
