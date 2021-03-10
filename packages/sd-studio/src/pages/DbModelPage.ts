import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  COLUMN_DATA_TYPES,
  IColumnVM,
  IDbLibPackage,
  IForeignKeyTargetVM,
  IForeignKeyVM,
  IIndexVM,
  IModelVM,
  TXT_CHANGE_IGNORE_CONFIRM
} from "../commons";
import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import { SdModalProvider, SdToastProvider } from "@simplysm/sd-angular";
import * as ts from "typescript";
import { NumberUtil, ObjectUtil, SdError, StringUtil } from "@simplysm/sd-core-common";
import { DbModelFkColumnSelectModal } from "../modals/DbModelFkColumnSelectModal";
import { DbModelIndexSelectModal } from "../modals/DbModelIndexSelectModal";

// TODO: 파일 변경 WATCH하여 필요시 새로고침 여부 CONFIRM (변경사항이 있는지도 체크)
// TODO: 데이터타입/길이 같이 편집시, 비워줘야되는 부분 확인
// TODO: Uuid 타입 추가
// TODO: number/Uuid 외에는 AI 사용불가

@Component({
  selector: "app-db-model",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-busy-container [busy]="busyCount > 0">
      <sd-topbar-container *ngIf="data">
        <sd-topbar>
          <h4>모델관리 ({{data.name}})</h4>

          <sd-topbar-menu>
            <sd-icon icon="plus" fixedWidth></sd-icon>
            추가 <small>(CTRL+INSERT)</small>
          </sd-topbar-menu>
          <sd-topbar-menu (click)="onSaveButtonClick()">
            <sd-icon icon="save" fixedWidth></sd-icon>
            저장 <small>(CTRL+S)</small>
          </sd-topbar-menu>
          <sd-topbar-menu (click)="onRefreshButtonClick()">
            <sd-icon icon="redo" fixedWidth></sd-icon>
            새로고침 <small>(CTRL+ALT+L)</small>
          </sd-topbar-menu>
        </sd-topbar>

        <sd-dock-container>
          <sd-dock key="db-model-left-dock"
                   position="left"
                   resizable
                   class="sd-background-color-white"
                   style="min-width: 200px">
            <sd-dock-container>
              <sd-dock class="sd-border-bottom-brightness-default">
                <sd-textfield [(value)]="searchText" placeholder="검색어" inset></sd-textfield>
              </sd-dock>

              <sd-pane class="sd-padding-top-0">
                <sd-list>
                  <sd-list-item *ngFor="let model of displayModels; trackBy: trackByIdFn"
                                [selected]="model === selectedModel"
                                (click)="selectedModel = model">
                    <div>
                      {{ model.className }}
                      <sd-icon *ngIf="getModelIsChanged(model)" icon="pencil" size="xs"
                               fixedWidth></sd-icon>
                    </div>
                    <small style="color: rgba(180, 180, 180, 1)">
                      <ng-container *ngIf="model.relativeDirPath">
                        ({{ model.relativeDirPath }})
                      </ng-container>
                      {{ model.description }}
                    </small>
                  </sd-list-item>
                </sd-list>
              </sd-pane>
            </sd-dock-container>
          </sd-dock>

          <sd-dock *ngIf="selectedModel"
                   class="sd-padding-sm-default sd-background-color-white sd-border-bottom-brightness-default">
            <sd-form layout="inline">
              <sd-form-item>
                <sd-button theme="danger">
                  <sd-icon icon="trash" fixedWidth></sd-icon>
                  삭제
                </sd-button>
              </sd-form-item>
              <sd-form-item>
                <sd-button theme="info">
                  <sd-icon icon="recycle" fixedWidth></sd-icon>
                  백업
                </sd-button>
              </sd-form-item>
            </sd-form>
          </sd-dock>

          <sd-pane *ngIf="selectedModel">
            <div class="sd-padding-default sd-background-color-white">
              <h5 class="sd-page-header">모델정보</h5>

              <sd-form layout="inline">
                <sd-form-item label="그룹">
                  <sd-textfield [(value)]="selectedModel.relativeDirPath"></sd-textfield>
                </sd-form-item>
                <sd-form-item label="클래스명">
                  <sd-textfield [(value)]="selectedModel.className" required></sd-textfield>
                </sd-form-item>
                <sd-form-item label="설명">
                  <sd-textfield [(value)]="selectedModel.description" required></sd-textfield>
                </sd-form-item>
                <sd-form-item label="데이터베이스">
                  <sd-textfield [(value)]="selectedModel.database" placeholder="DbContext 기본값"></sd-textfield>
                </sd-form-item>
                <sd-form-item label="스키마">
                  <sd-textfield [(value)]="selectedModel.schema" placeholder="DbContext 기본값"></sd-textfield>
                </sd-form-item>
                <sd-form-item label="모델명">
                  <sd-textfield [(value)]="selectedModel.name" [placeholder]="selectedModel.className"></sd-textfield>
                </sd-form-item>
              </sd-form>
              <br/>
              <h5 class="sd-page-header">컬럼 목록</h5>
              <sd-form layout="inline">
                <sd-form-item>
                  <sd-button size="sm" (click)="onAddColumnButtonClick()">
                    <sd-icon icon="plus" fixedWidth></sd-icon>
                    추가
                  </sd-button>
                </sd-form-item>
              </sd-form>
              <sd-sheet key="db-model-columns-sheet"
                        [items]="selectedModel.columns"
                        [trackByFn]="trackByIdFn">
                <sd-sheet-column fixed resizable key="primaryKey" width.px="30">
                  <ng-template #header>
                    <sd-sheet-cell>
                      <sd-icon icon="times" fixedWidth></sd-icon>
                    </sd-sheet-cell>
                  </ng-template>
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-sheet-cell style="text-align: center">
                      <sd-anchor (click)="onRemoveColumnButtonClick(item)">
                        <sd-icon icon="times" fixedWidth></sd-icon>
                      </sd-anchor>
                    </sd-sheet-cell>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="PK" fixed resizable key="primaryKey" width.px="30">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <!--suppress JSConstantReassignment -->
                    <sd-textfield type="number" [(value)]="item.primaryKey" inset size="sm"></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="컬럼명" fixed resizable key="name">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-textfield [(value)]="item.name" required inset size="sm"></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="설명" fixed resizable key="description" width.px="200">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-textfield [(value)]="item.description" required inset size="sm"></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="타입" fixed resizable key="dataType" width.px="200"
                                 [title]="COLUMN_DATA_TYPE_TITLE">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <!--suppress JSConstantReassignment -->
                    <sd-textfield [(value)]="item.dataType" required inset size="sm"
                                  (valueChange)="item.length = undefined; item.precision = undefined; item.digits = undefined"
                                  [validatorFn]="dataTypeValidatorFn"></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="Length" fixed resizable key="length" width.px="40">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-textfield [(value)]="item.length" inset size="sm"
                                  *ngIf="item.dataType === 'STRING' || item.dataType === 'BINARY'"
                                  [validatorFn]="lengthValidatorFn"></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="Precision" fixed resizable key="precision" width.px="30">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <!--suppress JSConstantReassignment -->
                    <sd-textfield type="number" [(value)]="item.precision" inset size="sm"
                                  *ngIf="item.dataType === 'DECIMAL'" required></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="Digits" fixed resizable key="digits" width.px="30">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-textfield type="number" [(value)]="item.digits" inset size="sm"
                                  *ngIf="item.dataType === 'DECIMAL'" required></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="?" fixed resizable key="nullable" width.px="25">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <div style="text-align: center;">
                      <sd-checkbox [(value)]="item.nullable" inset size="sm"></sd-checkbox>
                    </div>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="AI" fixed resizable key="autoIncrement" width.px="25">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <div style="text-align: center;">
                      <sd-checkbox [(value)]="item.autoIncrement" inset size="sm"></sd-checkbox>
                    </div>
                  </ng-template>
                </sd-sheet-column>
              </sd-sheet>

              <br/>
              <h5 class="sd-page-header">외래키 목록</h5>
              <sd-form layout="inline">
                <sd-form-item>
                  <sd-button size="sm" (click)="onAddFkButtonClick()">
                    <sd-icon icon="plus" fixedWidth></sd-icon>
                    추가
                  </sd-button>
                </sd-form-item>
              </sd-form>
              <sd-sheet key="db-model-fks-sheet"
                        [items]="selectedModel.foreignKeys"
                        [trackByFn]="trackByIdFn">
                <sd-sheet-column fixed resizable key="primaryKey" width.px="30">
                  <ng-template #header>
                    <sd-sheet-cell>
                      <sd-icon icon="times" fixedWidth></sd-icon>
                    </sd-sheet-cell>
                  </ng-template>
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-sheet-cell style="text-align: center">
                      <sd-anchor (click)="onRemoveFkButtonClick(item)">
                        <sd-icon icon="times" fixedWidth></sd-icon>
                      </sd-anchor>
                    </sd-sheet-cell>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="FK명" fixed resizable key="name">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-textfield [(value)]="item.name" required inset size="sm"></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="설명" fixed resizable key="description">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-textfield [(value)]="item.description" required inset size="sm"></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="타겟모델" fixed resizable key="targetModelId" width.px="200">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-select [(value)]="item.targetModelId" required inset size="sm"
                               (valueChange)="item.columnIds = []">
                      <ng-template #header>
                        <div class="sd-border-bottom-brightness-default">
                          <sd-textfield inset placeholder="검색어"></sd-textfield>
                        </div>
                      </ng-template>
                      <sd-select-item *ngFor="let model of data.models; trackBy: trackByIdFn"
                                      [value]="model.id">
                        {{ model.className }}
                        <small style="color: rgba(150, 150, 150, 1)" *ngIf="model.relativeDirPath">
                          ({{ model.relativeDirPath }})
                        </small>
                      </sd-select-item>
                    </sd-select>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="컬럼선택" fixed resizable key="columnIds" width.px="300">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-sheet-cell *ngIf="item.targetModelId">
                      <sd-anchor (click)="onFkColumnSelectButtonClick(item)">
                        <sd-icon icon="tasks" fixedWidth></sd-icon>
                        <ng-container *ngFor="let columnId of item.columnIds; let index = index; trackBy: trackByMeFn">
                          {{ getModelColumnById(selectedModel, columnId)?.name || "ERROR" }}<span
                          *ngIf="index !== item.columnIds.length - 1">,</span>
                        </ng-container>
                      </sd-anchor>
                    </sd-sheet-cell>
                  </ng-template>
                </sd-sheet-column>
              </sd-sheet>

              <br/>
              <h5 class="sd-page-header">외래키대상 목록</h5>
              <sd-form layout="inline">
                <sd-form-item>
                  <sd-button size="sm" (click)="onAddFktButtonClick()">
                    <sd-icon icon="plus" fixedWidth></sd-icon>
                    추가
                  </sd-button>
                </sd-form-item>
              </sd-form>
              <sd-sheet key="db-model-fks-sheet"
                        [items]="selectedModel.foreignKeyTargets"
                        [trackByFn]="trackByIdFn">
                <sd-sheet-column fixed resizable key="primaryKey" width.px="30">
                  <ng-template #header>
                    <sd-sheet-cell>
                      <sd-icon icon="times" fixedWidth></sd-icon>
                    </sd-sheet-cell>
                  </ng-template>
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-sheet-cell style="text-align: center">
                      <sd-anchor (click)="onRemoveFktButtonClick(item)">
                        <sd-icon icon="times" fixedWidth></sd-icon>
                      </sd-anchor>
                    </sd-sheet-cell>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="FKT명" fixed resizable key="name">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-textfield [(value)]="item.name" required inset size="sm"></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="설명" fixed resizable key="description">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-textfield [(value)]="item.description" required inset size="sm"></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="소스모델" fixed resizable key="sourceModelId" width.px="200">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-select [(value)]="item.sourceModelId" required inset size="sm"
                               (valueChange)="item.sourceModelForeignKeyId = undefined">
                      <ng-template #header>
                        <div class="sd-border-bottom-brightness-default">
                          <sd-textfield inset placeholder="검색어"></sd-textfield>
                        </div>
                      </ng-template>
                      <sd-select-item *ngFor="let model of data.models; trackBy: trackByIdFn"
                                      [value]="model.id">
                        {{ model.className }}
                        <small style="color: rgba(150, 150, 150, 1)" *ngIf="model.relativeDirPath">
                          ({{ model.relativeDirPath }})
                        </small>
                      </sd-select-item>
                    </sd-select>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="소스모델FK" fixed resizable key="sourceModelForeignKeyId">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-select [(value)]="item.sourceModelForeignKeyId" required inset size="sm"
                               *ngIf="item.sourceModelId">
                      <ng-template #header>
                        <div class="sd-border-bottom-brightness-default">
                          <sd-textfield inset placeholder="검색어"></sd-textfield>
                        </div>
                      </ng-template>
                      <sd-select-item *ngFor="let fk of getModelFks(item.sourceModelId); trackBy: trackByIdFn"
                                      [value]="fk.id">
                        {{ fk.name }}
                      </sd-select-item>
                    </sd-select>
                  </ng-template>
                </sd-sheet-column>
              </sd-sheet>

              <br/>
              <h5 class="sd-page-header">인덱스 목록</h5>
              <sd-form layout="inline">
                <sd-form-item>
                  <sd-button size="sm" (click)="onAddIdxButtonClick()">
                    <sd-icon icon="plus" fixedWidth></sd-icon>
                    추가
                  </sd-button>
                </sd-form-item>
              </sd-form>
              <sd-sheet key="db-model-fks-sheet"
                        [items]="selectedModel.indexes"
                        [trackByFn]="trackByIdFn">
                <sd-sheet-column fixed resizable key="primaryKey" width.px="30">
                  <ng-template #header>
                    <sd-sheet-cell>
                      <sd-icon icon="times" fixedWidth></sd-icon>
                    </sd-sheet-cell>
                  </ng-template>
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-sheet-cell style="text-align: center">
                      <sd-anchor (click)="onRemoveIdxButtonClick(item)">
                        <sd-icon icon="times" fixedWidth></sd-icon>
                      </sd-anchor>
                    </sd-sheet-cell>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="IDX명" fixed resizable key="name">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-textfield [(value)]="item.name" required inset size="sm"></sd-textfield>
                  </ng-template>
                </sd-sheet-column>
                <sd-sheet-column header="컬럼선택" fixed resizable key="columns" width.px="300">
                  <ng-template #cell let-item="item" let-edit="edit">
                    <sd-sheet-cell>
                      <sd-anchor (click)="onIdxColumnSelectButtonClick(item)">
                        <sd-icon icon="tasks" fixedWidth></sd-icon>
                        <ng-container
                          *ngFor="let column of item.columns; let index = index; trackBy: trackByColumnIdFn">
                          {{ getModelColumnById(selectedModel, column.columnId)?.name || "ERROR" }}
                          {{ column.orderBy }}<span *ngIf="index !== item.columns.length - 1">,</span>
                        </ng-container>
                      </sd-anchor>
                    </sd-sheet-cell>
                  </ng-template>
                </sd-sheet-column>
              </sd-sheet>
            </div>
          </sd-pane>
        </sd-dock-container>
      </sd-topbar-container>
    </sd-busy-container>`
})
export class DbModelPage implements OnInit {
  public COLUMN_DATA_TYPE_TITLE = `${COLUMN_DATA_TYPES.map((item) => `[${item}]`).join(", ")} 혹은 ["가나" | "다라"] 형식`;

  public busyCount = 0;

  public searchText?: string;

  public data?: IDataVM;
  public orgModels?: IModelVM[];
  public orgModelMap?: Map<number, IModelVM>;

  public selectedModel?: IModelVM;

  public trackByIdFn = (index: number, item: any): any => item.id ?? item;
  public trackByMeFn = (index: number, item: any): any => item;
  public trackByColumnIdFn = (index: number, item: any): any => item.columnId ?? item;

  public dataTypeValidatorFn = (dataType: string): string | undefined => {
    if (!COLUMN_DATA_TYPES.includes(dataType as any) && !(/^".*"$/).test(dataType)) {
      return "데이터타입이 잘못되었습니다.";
    }
    return undefined;
  };

  public lengthValidatorFn = (length: string): string | undefined => {
    if (length !== "MAX" && NumberUtil.parseInt(length) === undefined) {
      return "숫자나 MAX가 입력되어야 합니다.";
    }
    return undefined;
  };

  public get displayModels(): IModelVM[] {
    let result = this.data!.models;

    if (this.searchText !== undefined) {
      result = result.filter((item) => (
        item.className?.toLowerCase().includes(this.searchText!.toLowerCase()) === true ||
        item.relativeDirPath?.toLowerCase().includes(this.searchText!.toLowerCase()) === true ||
        item.description?.toLowerCase().includes(this.searchText!.toLowerCase()) === true
      ));
    }

    return result;
  }

  public getModelColumnById(model: IModelVM | undefined, columnId: number | undefined): IColumnVM | undefined {
    if (columnId === undefined) return undefined;
    return model?.columns.single((item) => item.id === columnId);
  }

  public getModelIsChanged(model: IModelVM): boolean {
    return !ObjectUtil.equal(this.orgModelMap!.get(model.id), model);
  }

  public getModelFks(modelId: number | undefined): IForeignKeyVM[] {
    const model = this.data!.models.single((item) => item.id === modelId);
    return model!.foreignKeys;
  }

  public constructor(private readonly _activatedRoute: ActivatedRoute,
                     private readonly _toast: SdToastProvider,
                     private readonly _modal: SdModalProvider,
                     private readonly _cdr: ChangeDetectorRef) {
  }

  public async ngOnInit(): Promise<void> {
    this.busyCount++;

    await this._toast.try(async () => {
      const dbLibPackage: IDbLibPackage = this._activatedRoute.snapshot.params as any;
      await this._refresh(dbLibPackage);
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }

  // region 조회

  @HostListener("sdDataRefresh")
  public async onRefreshButtonClick(): Promise<void> {
    const diffs = this.data!.models.diffs(this.orgModels!, { keys: ["id"] });
    if (diffs.length > 0 && !confirm(TXT_CHANGE_IGNORE_CONFIRM)) {
      return;
    }

    this.busyCount++;

    await this._toast.try(async () => {
      await this._refresh(this.data!);
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }

  private async _refresh(dbLibPackage: IDbLibPackage): Promise<void> {
    const dirPath = path.resolve(dbLibPackage.rootPath, "src", "models");
    const filePaths = await FsUtil.globAsync(path.resolve(dirPath, "**", "*.ts"));

    // SOURCE FILEs
    const sourceFileInfos = await filePaths.mapAsync(async (item) => {
      const sourceFile = ts.createSourceFile(item, (await FsUtil.readFileAsync(item)), ts.ScriptTarget.ES2017);
      return {
        sourceFile,
        importRelativeDirPathMap: sourceFile.statements.mapMany((item1: any) => (
          item1["importClause"]?.namedBindings.elements.map((item2: any) => item2.name.text)
            .map((item2: any) => ({
              path: item1["moduleSpecifier"]?.text,
              name: item2
            }))
            .filter((item2: any) => item2.path?.startsWith(".") === true)
        )).toMap(
          (item1: any) => item1.name,
          (item1: any) => path.relative(dirPath, path.resolve(path.dirname(sourceFile.fileName), path.dirname(item1.path))).replace(/\\/g, "/")
        )
      };
    });

    // MODELs
    const models: IModelVM[] = [];
    let lastModelId = 0;
    for (const sourceFileInfo of sourceFileInfos) {
      const relativeDirPath = path.relative(dirPath, path.dirname(sourceFileInfo.sourceFile.fileName)).replace(/\\/g, "/");

      sourceFileInfo.sourceFile.forEachChild((node) => {
        if (node.decorators?.some((dec) => dec.expression["expression"].text === "Table")) {
          const tableDecArgProps = node.decorators.single((dec) => dec.expression["expression"].text === "Table")!.expression["arguments"][0].properties;
          const tableDecArgPropsObj = this._getPropertyInfoObj("table", tableDecArgProps);

          const className = node["name"].text;

          const model: IModelVM = {
            id: lastModelId++,
            relativeDirPath,
            className,
            description: tableDecArgPropsObj.description,
            database: tableDecArgPropsObj.database,
            schema: tableDecArgPropsObj.schema,
            name: tableDecArgPropsObj.name,
            columns: [],
            foreignKeys: [],
            foreignKeyTargets: [],
            indexes: []
          };

          // COLUMNS
          let lastColumnId = 0;
          node.forEachChild((childNode) => {
            if (childNode.decorators?.some((dec) => dec.expression["expression"].text === "Column")) {
              const columnDecArgProps = childNode.decorators.single((dec) => dec.expression["expression"].text === "Column")!.expression["arguments"][0].properties;
              const columnDecArgPropsObj = this._getPropertyInfoObj("column", columnDecArgProps);

              const dataType = columnDecArgPropsObj.dataType;

              model.columns.push({
                id: lastColumnId++,
                primaryKey: columnDecArgPropsObj.primaryKey,
                name: columnDecArgPropsObj.name ?? childNode["name"].text,
                description: columnDecArgPropsObj.description,
                nullable: columnDecArgPropsObj.nullable ?? childNode["questionToken"] !== undefined ?? false,
                autoIncrement: columnDecArgPropsObj.autoIncrement ?? false,
                dataType: (typeof dataType !== "string" ? dataType?.type : dataType) ?? this._getTypeString(childNode["type"]),
                length: typeof dataType !== "string" ? dataType?.length : undefined,
                precision: typeof dataType !== "string" ? NumberUtil.parseInt(dataType?.precision) : undefined,
                digits: typeof dataType !== "string" ? NumberUtil.parseInt(dataType?.digits) : undefined
              });
            }
          });

          models.push(model);
        }
      });
    }
    const modelMap = models.toMap((item) => this._getModelKey(item));

    const travelModelDecNode = (decName: string, callback: (decorators: ts.Decorator[], childNode: ts.Node, model: IModelVM, importRelativeDirPathMap: Map<string, string>, relativeDirPath: string, className: string, seq: number) => void): void => {
      for (const sourceFileInfo of sourceFileInfos) {
        const relativeDirPath = path.relative(dirPath, path.dirname(sourceFileInfo.sourceFile.fileName)).replace(/\\/g, "/");

        let seq = 0;
        sourceFileInfo.sourceFile.forEachChild((node) => {
          if (node.decorators?.some((dec) => dec.expression["expression"].text === "Table")) {
            const className = node["name"].text;
            const model = modelMap.get(this._getModelKey({ relativeDirPath, className }))!;

            node.forEachChild((childNode) => {
              const decorators = childNode.decorators?.filter((dec) => dec.expression["expression"].text === decName);
              if (decorators !== undefined && decorators.length > 0) {
                callback(decorators, childNode, model, sourceFileInfo.importRelativeDirPathMap, relativeDirPath, className, ++seq);
              }
            });
          }
        });
      }
    };


    // FKs
    travelModelDecNode("ForeignKey", (decorators, childNode, model, importRelativeDirPathMap, relativeDirPath, className, seq) => {
      const fkDecArgs = decorators[0].expression["arguments"];

      const targetModelClassName = fkDecArgs[1].body.text;
      const targetModelRelativeDirPath = targetModelClassName !== className ?
        importRelativeDirPathMap.get(targetModelClassName) :
        relativeDirPath;

      const columnNames = fkDecArgs[0].elements.map((item: any) => item.text);
      const targetModelKey = this._getModelKey({
        relativeDirPath: targetModelRelativeDirPath,
        className: targetModelClassName
      });

      model.foreignKeys.push({
        id: seq,
        name: childNode["name"].text,
        description: fkDecArgs[2].text,
        columnIds: columnNames.map((item: string) => model.columns.single((item1) => item1.name === item)?.id),
        targetModelId: models.single((item) => this._getModelKey(item) === targetModelKey)?.id
      });
    });

    // FKTs
    travelModelDecNode("ForeignKeyTarget", (decorators, childNode, model, importRelativeDirPathMap, relativeDirPath, className, seq) => {
      const fktDecArgs = decorators[0].expression["arguments"];

      const sourceModelClassName = fktDecArgs[0].body.text;
      const sourceModelRelativeDirPath = sourceModelClassName !== className ?
        importRelativeDirPathMap.get(sourceModelClassName) :
        relativeDirPath;
      const sourceModelKey = this._getModelKey({
        relativeDirPath: sourceModelRelativeDirPath,
        className: sourceModelClassName
      });
      const sourceModel = models.single((item) => this._getModelKey(item) === sourceModelKey);
      const sourceModelForeignKey = sourceModel?.foreignKeys.single((item) => item.name === fktDecArgs[1].text);

      model.foreignKeyTargets.push({
        id: seq,
        name: childNode["name"].text,
        description: fktDecArgs[2].text,
        sourceModelId: sourceModel?.id,
        sourceModelForeignKeyId: sourceModelForeignKey?.id
      });
    });

    // IDXs
    travelModelDecNode("Index", (decorators, childNode, model, importRelativeDirPathMap, relativeDirPath, className, seq) => {
      for (const idxDec of decorators) {
        const idxDecArgProps = idxDec.expression["arguments"][0]?.properties ?? [];
        const idxDecArgPropsObj = this._getPropertyInfoObj("column", idxDecArgProps);

        const idxName = idxDecArgPropsObj.name ?? childNode["name"].text;
        if (idxName !== undefined) {
          const columnName = childNode["name"].text;
          const columnId = model.columns.single((item) => item.name === columnName)?.id;

          const idx = {
            columnId,
            order: idxDecArgPropsObj.order ?? 1,
            orderBy: idxDecArgPropsObj.orderBy ?? "ASC"
          };

          const prevIdx = model.indexes.single((item) => item.name === idxName);
          if (prevIdx) {
            prevIdx.columns.push(idx);
          }
          else {
            model.indexes.push({
              id: seq,
              name: idxName,
              columns: [idx]
            });
          }
        }
      }
    });

    this.data = {
      ...dbLibPackage,
      models: models.orderBy((item) => item.className)
    };
    this.orgModels = ObjectUtil.clone(this.data.models);
    this.orgModelMap = this.orgModels.toMap((item) => item.id);

    if (this.selectedModel) {
      this.selectedModel = this.data.models
        .single((item) => this._getModelKey(item) === this._getModelKey(this.selectedModel!));
    }
  }

  private _getPropertyInfoObj(type: "table" | "column" | "fk" | "object", nodes: ts.Node[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const node of nodes) {
      const name = node["name"].text;

      let value: any;
      const initializerNode = node["initializer"];
      if (initializerNode.kind === ts.SyntaxKind.StringLiteral) {
        value = initializerNode["text"];
      }
      else if (initializerNode.kind === ts.SyntaxKind.TrueKeyword) {
        value = true;
      }
      else if (initializerNode.kind === ts.SyntaxKind.FalseKeyword) {
        value = false;
      }
      else if (initializerNode.kind === ts.SyntaxKind.NumericLiteral) {
        value = NumberUtil.parseFloat(initializerNode["text"]);
      }
      else if (["object", "column"].includes(type) && initializerNode.kind === ts.SyntaxKind.ObjectLiteralExpression) {
        value = this._getPropertyInfoObj("object", initializerNode.properties);
      }
      else {
        throw new SdError("알수없는 PROP KIND 타입: " + initializerNode.kind);
      }

      result[name] = value;
    }

    return result;
  }

  private _getTypeString(node: ts.Node): string {
    if (node.kind === ts.SyntaxKind.NumberKeyword) {
      return "number";
    }
    else if (node.kind === ts.SyntaxKind.StringKeyword) {
      return "string";
    }
    else if (node.kind === ts.SyntaxKind.BooleanKeyword) {
      return "boolean";
    }
    else if (node.kind === ts.SyntaxKind.TypeReference && node["typeName"].text === "DateOnly") {
      return "DateOnly";
    }
    else if (node.kind === ts.SyntaxKind.TypeReference && node["typeName"].text === "DateTime") {
      return "DateTime";
    }
    else if (node.kind === ts.SyntaxKind.TypeReference && node["typeName"].text === "Buffer") {
      return "Buffer";
    }
    else if (node.kind === ts.SyntaxKind.UnionType) {
      return node["types"].map((item: any) => `"${item.literal.text as string}"`).join(" | ");
    }
    else {
      throw new SdError("알수없는 TYPE KIND 타입: " + node.kind);
    }
  }

  private _getModelKey(model: { relativeDirPath: string | undefined; className: string | undefined }): string | undefined {
    return StringUtil.isNullOrEmpty(model.className) ? undefined :
      StringUtil.isNullOrEmpty(model.relativeDirPath) ? model.className :
        `${model.relativeDirPath}/${model.className}`;
  }

  // endregion

  // region 저장

  @HostListener("sdSave")
  public async onSaveButtonClick(): Promise<void> {
    this.busyCount++;
    await this._toast.try(async () => {
      await this._save();
    });
    this.busyCount--;
    this._cdr.markForCheck();
  }

  private async _save(): Promise<void> {
    // 모델 필수값등 체크
    ObjectUtil.validateArrayWithThrow("모델 기본정보", this.data!.models, {
      relativeDirPath: { displayName: "그룹", type: String },
      className: { displayName: "클래스명", type: String, notnull: true },
      description: { displayName: "설명", type: String, notnull: true },
      database: { displayName: "데이터베이스", type: String },
      schema: { displayName: "스키마", type: String },
      name: { displayName: "모델명", type: String }
    });

    // 모델 경로 중복 체크
    const dupKeyModelKeys = this.data!.models.groupBy((item) => this._getModelKey(item))
      .filter((item) => item.values.length > 1)
      .map((item) => item.key);
    if (dupKeyModelKeys.length > 0) {
      throw new Error("경로가 중복된 모델이 있습니다.\n" + dupKeyModelKeys.map((item) => `- ${item!}`).join("\n"));
    }

    // 모델 중복 체크
    const dupModelKeys = this.data!.models.groupBy((item) => item.database + "." + item.schema + "." + item.className)
      .filter((item) => item.values.length > 1)
      .map((item) => item.key);
    if (dupModelKeys.length > 0) {
      throw new Error("중복된 모델이 있습니다.\n" + dupModelKeys.map((item) => `- ${item}`).join("\n"));
    }

    // 각 모델 체크
    for (const model of this.data!.models) {
      const modelKey = this._getModelKey(model)!;

      //-- 컬럼
      if (model.columns.length < 1) {
        throw new Error(`모델 '${modelKey}'에 컬럼이 없습니다.`);
      }

      // 컬럼 필수값등 체크
      ObjectUtil.validateArrayWithThrow(`모델 '${modelKey}'의 컬럼`, model.columns, (item) => ({
        primaryKey: { displayName: "PK", type: Number },
        name: { displayName: "컬럼명", type: String, notnull: true },
        description: { displayName: "설명", type: String, notnull: true },
        nullable: { displayName: "?", type: Boolean, notnull: true },
        autoIncrement: { displayName: "AI", type: Boolean, notnull: true },
        dataType: {
          displayName: "타입",
          type: String,
          notnull: true,
          validator: (value) => this.dataTypeValidatorFn(value) === undefined
        },
        length: {
          displayName: "Length",
          type: String,
          validator: (value) => this.lengthValidatorFn(value) === undefined
        },
        precision: { displayName: "Precision", type: Number, notnull: item.dataType === "DECIMAL" },
        digits: { displayName: "Digits", type: Number }
      }));

      // PK 존재 체크
      /*if (model.columns.filter((item) => item.primaryKey !== undefined).length === 0) {
        throw new Error(`모델 '${modelKey}'에 PK가 설정되지 않았습니다.`);
      }*/

      // PK 번호 중복 체크
      const dupPks = model.columns.groupBy((item) => item.primaryKey)
        .filter((item) => item.key !== undefined && item.values.length > 1)
        .map((item) => item.key);
      if (dupPks.length > 0) {
        throw new Error(`모델 '${modelKey}'의 PK 순번이 중복되었습니다. (${dupPks.join(", ")})`);
      }

      // 컬럼명 중복 체크
      const dupColumnNames = model.columns.groupBy((item) => item.name)
        .filter((item) => item.values.length > 1)
        .map((item) => item.key);
      if (dupColumnNames.length > 0) {
        throw new Error(`모델 '${modelKey}'에 중복된 컬럼이 있습니다.\n` + dupColumnNames.map((item) => `- ${item!}`).join("\n"));
      }

      //-- FK
      // FK 필수값등 체크
      ObjectUtil.validateArrayWithThrow(`모델 '${modelKey}'의 FK`, model.foreignKeys, {
        name: { displayName: "FK명", type: String, notnull: true },
        description: { displayName: "설명", type: String, notnull: true },
        columnIds: {
          displayName: "컬럼",
          type: Array,
          notnull: true,
          validator: (value) => value.length > 0 &&
            value.every((val) => val !== undefined && model.columns.map((col) => col.id).includes(val)) &&
            !value.groupBy((val) => val).some((g) => g.values.length > 1)
        },
        targetModelId: {
          displayName: "타겟모델",
          type: Number,
          notnull: true,
          includes: this.data!.models.map((item) => item.id)
        }
      });

      // FK명 중복 체크
      const dupFkNames = model.foreignKeys.groupBy((item) => item.name)
        .filter((item) => item.values.length > 1)
        .map((item) => item.key);
      if (dupFkNames.length > 0) {
        throw new Error(`모델 '${modelKey}'에 중복된 FK명이 있습니다.\n` + dupFkNames.map((item) => `- ${item!}`).join("\n"));
      }

      // FK 타겟모델의 PK와 컬럼 비교
      for (const fk of model.foreignKeys) {
        const targetModel = this.data!.models.single((item) => item.id === fk.targetModelId)!;
        const targetModelPkColumns = targetModel.columns.filter((item) => item.primaryKey).orderBy((item) => item.primaryKey);
        if (targetModelPkColumns.length !== fk.columnIds.length) {
          throw new Error(`모델 '${modelKey}'의 FK '${fk.name!}'의 컬럼이 타겟모델의 PK와 맞지 않습니다. (컬럼수)`);
        }
        for (let i = 0; i < targetModelPkColumns.length; i++) {
          const targetModelPkColumn = targetModelPkColumns[i];
          const fkColumn = model.columns.single((item) => item.id === fk.columnIds[i])!;
          if (
            targetModelPkColumn.dataType !== fkColumn.dataType ||
            targetModelPkColumn.length !== fkColumn.length ||
            targetModelPkColumn.precision !== fkColumn.precision ||
            targetModelPkColumn.digits !== fkColumn.digits
          ) {
            throw new Error(`모델 '${modelKey}'의 FK '${fk.name!}'의 컬럼이 타겟모델의 PK와 맞지 않습니다. (타입)`);
          }
        }
      }

      //-- FKT
      // FKT 필수값등 체크
      ObjectUtil.validateArrayWithThrow(`모델 '${modelKey}'의 FKT`, model.foreignKeyTargets, (item) => ({
        name: { displayName: "FKT명", type: String, notnull: true },
        description: { displayName: "설명", type: String, notnull: true },
        sourceModelId: {
          displayName: "소스모델",
          type: Number,
          notnull: true,
          includes: this.data!.models.map((item1) => item1.id)
        },
        sourceModelForeignKeyId: {
          displayName: "소스모델FK",
          type: Number,
          notnull: true,
          includes: this.data!.models.single((item1) => item1.id === item.sourceModelId)!.foreignKeys.map((item1) => item1.id)
        }
      }));

      // FKT명 중복 체크
      const dupFktNames = model.foreignKeyTargets.groupBy((item) => item.name)
        .filter((item) => item.values.length > 1)
        .map((item) => item.key);
      if (dupFktNames.length > 0) {
        throw new Error(`모델 '${modelKey}'에 중복된 FKT명이 있습니다.\n` + dupFktNames.map((item) => `- ${item!}`).join("\n"));
      }

      //-- IDX
      // IDX 필수값등 체크
      ObjectUtil.validateArrayWithThrow(`모델 '${modelKey}'의 IDX`, model.indexes, {
        name: { displayName: "IDX명", type: String, notnull: true },
        columns: {
          displayName: "컬럼",
          type: Array,
          notnull: true,
          validator: (value) => (
            value.groupBy((item) => item.order)
              .filter((item) => item.values.length > 1)
              .length === 0 &&
            value.every((item) => item.columnId !== undefined && model.columns.map((item1) => item1.id).includes(item.columnId)) &&
            value.every((item) => ["ASC", "DESC"].includes(item.orderBy))
          )
        }
      });

      // IDX명 중복 체크 (FK와도 중복 불가)
      const dupIdxNames = [...model.foreignKeys, ...model.indexes].groupBy((item) => item.name)
        .filter((item) => item.values.length > 1)
        .map((item) => item.key);
      if (dupIdxNames.length > 0) {
        throw new Error(`모델 '${modelKey}'에 중복된 IDX명이 있습니다. (FK와도 중복될 수 없습니다.)\n` + dupFktNames.map((item) => `- ${item!}`).join("\n"));
      }
    }

    // 파일 쓰기
    const files: { relativeFilePath: string; contents: string }[] = [];
    for (const model of this.data!.models) {
      const importMap = new Map<string, string[]>();
      const addImport = (key: string, val: string): void => {
        if (importMap.has(key)) {
          const arr = importMap.get(key)!;
          if (!arr.includes(val)) {
            arr.push(val);
          }
        }
        else {
          importMap.set(key, [val]);
        }
      };
      addImport("@simplysm/sd-orm-common", "Table");
      addImport("@simplysm/sd-orm-common", "Column");

      if (model.columns.some((item) => item.dataType === "DateTime")) {
        addImport("@simplysm/sd-core-common", "DateTime");
      }
      if (model.columns.some((item) => item.dataType === "DateOnly")) {
        addImport("@simplysm/sd-core-common", "DateOnly");
      }

      if (model.foreignKeys.length > 0) {
        addImport("@simplysm/sd-orm-common", "ForeignKey");
      }
      if (model.foreignKeyTargets.length > 0) {
        addImport("@simplysm/sd-orm-common", "ForeignKeyTarget");
      }
      if (model.indexes.length > 0) {
        addImport("@simplysm/sd-orm-common", "Index");
      }

      for (const fk of model.foreignKeys) {
        const fkTargetModel = this.data!.models.single((item) => item.id === fk.targetModelId);
        if (!fkTargetModel) continue;

        const fkTargetModelPath = StringUtil.isNullOrEmpty(fkTargetModel.relativeDirPath) ?
          fkTargetModel.className! :
          path.join(fkTargetModel.relativeDirPath, fkTargetModel.className!);

        let relativePath = StringUtil.isNullOrEmpty(model.relativeDirPath) ? fkTargetModelPath :
          path.relative(model.relativeDirPath, fkTargetModelPath);
        relativePath = (relativePath.startsWith(".") ? relativePath : "./" + relativePath).replace(/\\/g, "/");

        addImport(relativePath, fkTargetModel.className!);
      }

      for (const fkt of model.foreignKeyTargets) {
        const fktSourceModel = this.data!.models.single((item) => item.id === fkt.sourceModelId);
        if (!fktSourceModel) continue;

        const fktSourceModelPath = StringUtil.isNullOrEmpty(fktSourceModel.relativeDirPath) ?
          fktSourceModel.className! :
          path.join(fktSourceModel.relativeDirPath, fktSourceModel.className!);

        let relativePath = StringUtil.isNullOrEmpty(model.relativeDirPath) ? fktSourceModelPath :
          path.relative(model.relativeDirPath, fktSourceModelPath);
        relativePath = (relativePath.startsWith(".") ? relativePath : "./" + relativePath).replace(/\\/g, "/");

        addImport(relativePath, fktSourceModel.className!);
      }

      // IMPORT
      const importText = Array.from(importMap.entries())
        .map((item) => `import { ${item[1].orderBy().join(", ")} } from "${item[0]}";`)
        .join("\r\n");

      // TABLE DEC
      let tableDecText = "@Table({ ";
      tableDecText += `description: "${model.description!}"`;
      tableDecText += StringUtil.isNullOrEmpty(model.database) ? "" : `, database: "${model.database}"`;
      tableDecText += StringUtil.isNullOrEmpty(model.schema) ? "" : `, schema: "${model.schema}"`;
      tableDecText += StringUtil.isNullOrEmpty(model.name) ? "" : `, name: "${model.name}"`;
      tableDecText += " })";

      // CLASS
      const classText = `export class ${model.className!} {`;
      const classTextEnd = `}`;

      // COLUMNS (정돈)
      const columnDefs = [];
      for (const column of model.columns) {
        columnDefs.push({
          ...column,
          indexes: model.indexes
            .filter((item) => item.columns.some((item1) => item1.columnId === column.id))
            .map((item) => ({
              name: item.name,
              order: item.columns.single((item1) => item1.columnId === column.id)!.order,
              orderBy: item.columns.single((item1) => item1.columnId === column.id)!.orderBy,
              onlyOne: item.columns.length === 1
            }))
        });
      }

      // COLUMNS
      const columnTexts = [];
      for (const columnDef of columnDefs) {
        let oneColumnText = "";

        //INDEX DEC
        for (const idx of columnDef.indexes) {
          oneColumnText += "  @Index(";
          if (
            (idx.name !== columnDef.name || !idx.onlyOne) ||
            idx.orderBy === "DESC"
          ) {
            oneColumnText += "{ ";
            oneColumnText += (idx.name !== columnDef.name || !idx.onlyOne) ? `name: "${idx.name!}", ` : "";
            oneColumnText += (idx.name !== columnDef.name || !idx.onlyOne) ? `order: ${idx.order}, ` : "";
            oneColumnText += (idx.orderBy === "DESC") ? `orderBy: "DESC", ` : "";
            oneColumnText = oneColumnText.slice(0, -2);
            oneColumnText += " }";
          }
          oneColumnText += ")\r\n";
        }

        //COLUMN DEC
        oneColumnText += "  @Column({ ";
        oneColumnText += `description: "${columnDef.description!}"`;

        if (["TEXT", "DECIMAL", "STRING", "BINARY"].includes(columnDef.dataType!)) {
          oneColumnText += `, dataType: { type: "${columnDef.dataType!}"`;
          oneColumnText += columnDef.length === undefined ? "" :
            columnDef.length === "MAX" ? `, length: "MAX"` :
              `, length: ${columnDef.length}`;
          oneColumnText += columnDef.precision !== undefined ? `, precision: ${columnDef.precision}` : "";
          oneColumnText += columnDef.digits !== undefined ? `, digits: ${columnDef.digits}` : "";
          oneColumnText += ` }`;
        }

        oneColumnText += columnDef.nullable ? `, nullable: true` : "";
        oneColumnText += columnDef.autoIncrement ? `, autoIncrement: true` : "";
        oneColumnText += columnDef.primaryKey !== undefined ? `, primaryKey: ${columnDef.primaryKey}` : "";
        oneColumnText += " })\r\n";

        // COLUMN
        const dataTypeText = columnDef.dataType === "TEXT" || columnDef.dataType === "STRING" || (/^".*"$/).test(columnDef.dataType!) ? "string" :
          columnDef.dataType === "DECIMAL" ? "number" :
            columnDef.dataType === "BINARY" ? "Buffer" :
              columnDef.dataType;

        oneColumnText += `  public ${columnDef.name!}${columnDef.nullable ? "?" : "!"}: ${dataTypeText!};`;

        columnTexts.push(oneColumnText);
      }
      const columnText = columnTexts.join("\r\n\r\n");

      const fkTexts: string[] = [];
      for (const fk of model.foreignKeys) {
        const columnNames = fk.columnIds.map((item) => model.columns.single((item1) => item1.id === item)!.name!);
        const targetModelName = this.data!.models.single((item) => item.id === fk.targetModelId)!.className!;
        let oneFkText = `  @ForeignKey([${columnNames.map((item) => `"${item}"`).join(", ")}], () => ${targetModelName}, "${fk.description!}")\r\n`;
        oneFkText += `  public ${fk.name!}?: ${targetModelName};`;

        fkTexts.push(oneFkText);
      }
      const fkText = fkTexts.join("\r\n\r\n");

      const fktTexts: string[] = [];
      for (const fkt of model.foreignKeyTargets) {
        const sourceModel = this.data!.models.single((item) => item.id === fkt.sourceModelId)!;
        const sourceModelName = sourceModel.className!;
        const sourceModelFkName = sourceModel.foreignKeys.single((item) => item.id === fkt.sourceModelForeignKeyId)!.name!;

        let oneFktText = `  @ForeignKeyTarget(() => ${sourceModelName}, "${sourceModelFkName}", "${fkt.description!}")\r\n`;
        oneFktText += `  public ${fkt.name!}?: ${sourceModelName};`;

        fktTexts.push(oneFktText);
      }
      const fktText = fktTexts.join("\r\n\r\n");

      // 파일 쓰기
      const contents = importText + "\r\n\r\n" +
        tableDecText + "\r\n" +
        classText + "\r\n" +
        (
          columnText + "\r\n" +
          (fkText ? "\r\n  //------------------------------------\r\n\r\n" + fkText + "\r\n" : "") +
          (fktText ? "\r\n  //------------------------------------\r\n\r\n" + fktText + "\r\n" : "")
        ) +
        classTextEnd;

      const relativeFilePath = StringUtil.isNullOrEmpty(model.relativeDirPath) ?
        model.className + ".ts" :
        path.join(model.relativeDirPath, model.className + ".ts");

      files.push({ relativeFilePath, contents });
    }

    const modelsDirPath = path.resolve(this.data!.rootPath, "src", "models");
    await FsUtil.removeAsync(modelsDirPath);
    for (const file of files) {
      await FsUtil.writeFileAsync(path.resolve(modelsDirPath, file.relativeFilePath), file.contents);
    }

    await this._refresh(this.data!);
    this._toast.success("저장되었습니다.");
  }

  // endregion

  public onAddColumnButtonClick(): void {
    const id = (this.selectedModel!.columns.max((item) => item.id) ?? 0) + 100;
    this.selectedModel!.columns.push({
      id,
      primaryKey: undefined,
      name: undefined,
      description: undefined,
      nullable: false,
      autoIncrement: false,
      dataType: undefined,
      length: undefined,
      precision: undefined,
      digits: undefined
    });
  }

  public onRemoveColumnButtonClick(item: IColumnVM): void {
    this.selectedModel!.columns.remove(item);
  }

  public onAddFkButtonClick(): void {
    const id = (this.selectedModel!.foreignKeys.max((item) => item.id) ?? 0) + 100;
    this.selectedModel!.foreignKeys.push({
      id,
      name: undefined,
      description: undefined,
      columnIds: [],
      targetModelId: undefined
    });
  }

  public onRemoveFkButtonClick(item: IForeignKeyVM): void {
    this.selectedModel!.foreignKeys.remove(item);
  }

  public onAddFktButtonClick(): void {
    const id = (this.selectedModel!.foreignKeyTargets.max((item) => item.id) ?? 0) + 100;
    this.selectedModel!.foreignKeyTargets.push({
      id,
      name: undefined,
      description: undefined,
      sourceModelId: undefined,
      sourceModelForeignKeyId: undefined
    });
  }

  public onRemoveFktButtonClick(item: IForeignKeyTargetVM): void {
    this.selectedModel!.foreignKeyTargets.remove(item);
  }


  public onAddIdxButtonClick(): void {
    const id = (this.selectedModel!.indexes.max((item) => item.id) ?? 0) + 100;
    this.selectedModel!.indexes.push({
      id,
      name: undefined,
      columns: []
    });
  }

  public onRemoveIdxButtonClick(item: IIndexVM): void {
    this.selectedModel!.indexes.remove(item);
  }

  public async onFkColumnSelectButtonClick(fk: IForeignKeyVM): Promise<void> {
    const model = this.selectedModel!;
    const targetModel = this.data!.models.single((item) => item.id === fk.targetModelId)!;
    const fkColumnIds = fk.columnIds;

    const result = await this._modal.showAsync(
      DbModelFkColumnSelectModal,
      `FK 컬럼 선택`,
      { model, targetModel, fkColumnIds }
    );
    if (!result) return;

    fk.columnIds = result;

    this._cdr.markForCheck();
  }

  public async onIdxColumnSelectButtonClick(idx: IIndexVM): Promise<void> {
    const model = this.selectedModel!;

    const result = await this._modal.showAsync(
      DbModelIndexSelectModal,
      `인덱스 컬럼 선택`,
      { model, idx }
    );
    if (!result) return;

    idx.columns = result;

    this._cdr.markForCheck();
  }
}

interface IDataVM {
  rootPath: string;
  name: string;
  models: IModelVM[];
}