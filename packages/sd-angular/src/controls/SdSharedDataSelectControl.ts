import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  output,
  TemplateRef,
  Type,
  ViewEncapsulation,
} from "@angular/core";
import { ISharedDataBase } from "../providers/SdSharedDataProvider";
import { SD_MODAL_INPUT, SdModalBase, SdModalProvider } from "../providers/SdModalProvider";
import { SdItemOfTemplateContext, SdItemOfTemplateDirective } from "../directives/SdItemOfTemplateDirective";
import { SdSelectControl, TSelectValue } from "./SdSelectControl";
import { SdTextfieldControl } from "./SdTextfieldControl";
import { SdSelectItemControl } from "./SdSelectItemControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { SdSelectButtonControl } from "./SdSelectButtonControl";
import { $computed, $model, $signal } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";
import { SdIconControl } from "./SdIconControl";

/**
 * 공유 데이터 선택 컴포넌트
 * 
 * 공유 데이터를 선택할 수 있는 드롭다운 형태의 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <sd-shared-data-select [(value)]="selectedValue"
 *                        [items]="sharedDataItems"
 *                        [displayProp]="'name'"
 *                        [valueProp]="'id'">
 * </sd-shared-data-select>
 * ```
 * 
 * @remarks
 * - 드롭다운 형태로 공유 데이터를 선택할 수 있습니다
 * - 단일 선택과 다중 선택을 지원합니다
 * - 검색 기능을 제공합니다
 * - 모달 형태의 선택 기능을 제공합니다
 * - 계층 구조 데이터를 지원합니다
 * - 인라인 편집 기능을 제공합니다
 * - 커스텀 템플릿을 지원합니다
 */
@Component({
  selector: "sd-shared-data-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdSelectControl,
    SdTextfieldControl,
    SdSelectItemControl,
    SdItemOfTemplateDirective,
    NgTemplateOutlet,
    SdSelectButtonControl,
    SdIconControl,
  ],
  template: `
    <sd-select
      [(value)]="value"
      [disabled]="disabled()"
      [required]="required()"
      [inset]="inset()"
      [inline]="inline()"
      [size]="size()"
      [items]="rootDisplayItems()"
      [trackByFn]="trackByFn"
      [selectMode]="selectMode()"
      [contentClass]="selectClass()"
      [multiSelectionDisplayDirection]="multiSelectionDisplayDirection()"
      [getChildrenFn]="parentKeyProp() ? getChildren : undefined"
      [(open)]="open"
      (openChange)="onOpenChange()"
    >
      @if (modalType()) {
        <sd-select-button (click)="onModalButtonClick($event)">
          <sd-icon [icon]="icons.search" />
        </sd-select-button>
      }
      @if (editModal()) {
        <sd-select-button (click)="onEditModalButtonClick($event)">
          <sd-icon [icon]="icons.edit" />
        </sd-select-button>
      }

      <ng-template #header>
        <sd-textfield
          type="text"
          [(value)]="searchText"
          placeholder="검색어"
          [inset]="true"
          [size]="size()"
          inputStyle="outline: none"
          class="bdb bdb-trans-default"
        />
      </ng-template>

      <ng-template #before>
        @if ((!required() && selectMode() === "single") || (useUndefined() && selectMode() === "multi")) {
          <sd-select-item>
            @if (undefinedTemplateRef()) {
              <ng-template [ngTemplateOutlet]="undefinedTemplateRef()!" />
            } @else {
              <span class="tx-theme-grey-default">미지정</span>
            }
          </sd-select-item>
        }
      </ng-template>

      <ng-template [itemOf]="rootDisplayItems()" let-item="item" let-index="index" let-depth="depth">
        @if (getItemSelectable(item, index, depth)) {
          <sd-select-item
            [value]="item.__valueKey"
            [style.display]="!getItemVisible(item, index, depth) ? 'none' : undefined"
          >
            <span [style.text-decoration]="getIsHiddenFn()(item, index) ? 'line-through' : undefined">
              <ng-template
                [ngTemplateOutlet]="itemTemplateRef() ?? null"
                [ngTemplateOutletContext]="{
                  $implicit: item,
                  item: item,
                  index: index,
                  depth: depth,
                }"
              ></ng-template>
            </span>
          </sd-select-item>
        }
      </ng-template>
    </sd-select>
  `,
})
export class SdSharedDataSelectControl<
  T extends ISharedDataBase<string | number>,
  TMODAL extends SdModalBase<ISharedDataModalInputParam, ISharedDataModalOutputResult>,
  TEDITMODAL extends SdModalBase<any, any>,
  M extends keyof TSelectValue<T>,
> {
  /** 아이콘 설정 프로바이더 */
  icons = inject(SdAngularConfigProvider).icons;

  /** 모달 프로바이더 */
  #sdModal = inject(SdModalProvider);

  /** 현재 선택된 값 */
  _value = input<TSelectValue<T["__valueKey"] | undefined>[M] | undefined>(undefined, { alias: "value" });
  /** 값 변경 이벤트 */
  _valueChange = output<TSelectValue<T["__valueKey"] | undefined>[M] | undefined>({ alias: "valueChange" });
  /** 양방향 바인딩을 위한 모델 */
  value = $model(this._value, this._valueChange);

  /** 선택 가능한 항목 목록 */
  items = input.required<T[]>();

  /** 비활성화 여부 */
  disabled = input(false, { transform: transformBoolean });
  /** 필수 입력 여부 */
  required = input(false, { transform: transformBoolean });
  /** undefined 값 사용 여부 */
  useUndefined = input(false, { transform: transformBoolean });
  /** 내부 여백 사용 여부 */
  inset = input(false, { transform: transformBoolean });
  /** 인라인 표시 여부 */
  inline = input(false, { transform: transformBoolean });

  /** 컨트롤 크기 */
  size = input<"sm" | "lg">();
  /** 선택 모드 (단일/다중) */
  selectMode = input("single" as M);
  /** 필터링 함수 */
  filterFn = input<(item: T, index: number, ...params: any[]) => boolean>();
  /** 필터링 함수 매개변수 */
  filterFnParams = input<any[]>();

  /** 모달 입력 매개변수 */
  modalInputParam = input<TMODAL[typeof SD_MODAL_INPUT]>();
  /** 모달 타입 */
  modalType = input<Type<TMODAL>>();
  /** 모달 헤더 */
  modalHeader = input<string>();
  /** 편집 모달 설정 */
  editModal = input<[Type<TEDITMODAL>, string?, TEDITMODAL[typeof SD_MODAL_INPUT]?]>();

  /** 선택 컨트롤 CSS 클래스 */
  selectClass = input<string>();
  /** 다중 선택 표시 방향 */
  multiSelectionDisplayDirection = input<"vertical" | "horizontal">();
  /** 항목 숨김 여부 확인 함수 */
  getIsHiddenFn = input<(item: T, index: number) => boolean>((item) => item.__isHidden);
  /** 항목 검색 텍스트 반환 함수 */
  getSearchTextFn = input<(item: T, index: number) => string>((item) => item.__searchText);
  /** 부모 키 속성명 */
  parentKeyProp = input<string>();
  /** 표시 순서 키 속성명 */
  displayOrderKeyProp = input<string>();

  /** 항목 템플릿 참조 */
  itemTemplateRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<T>>>(SdItemOfTemplateDirective, {
    read: TemplateRef,
  });
  /** undefined 항목 템플릿 참조 */
  undefinedTemplateRef = contentChild<any, TemplateRef<void>>("undefinedTemplate", { read: TemplateRef });

  /** 항목 추적 함수 */
  trackByFn = (item: T, index: number) => item.__valueKey;

  /** 드롭다운 열림 상태 */
  open = $signal(false);

  /** 검색어 */
  searchText = $signal<string>();

  /** 부모 키별 항목 맵 */
  itemByParentKeyMap = $computed(() => {
    if (this.parentKeyProp() !== undefined) {
      return this.items()
        .groupBy((item) => item[this.parentKeyProp()!])
        .toMap(
          (item) => item.key,
          (item1) => item1.values,
        ) as Map<T["__valueKey"] | undefined, any>;
    }
    else {
      return undefined;
    }
  });

  /** 루트 표시 항목 목록 */
  rootDisplayItems = $computed(() => {
    let result = this.items().filter(
      (item, index) =>
        (!this.filterFn() || this.filterFn()!(item, index, ...(this.filterFnParams() ?? []))) &&
        (this.parentKeyProp() === undefined || item[this.parentKeyProp()!] === undefined),
    );

    if (this.displayOrderKeyProp() !== undefined) {
      result = result.orderBy((item) => item[this.displayOrderKeyProp()!]);
    }

    return result;
  });

  /**
   * 항목이 선택 가능한지 확인
   * @param item 항목
   * @param index 인덱스
   * @param depth 깊이
   */
  getItemSelectable(item: any, index: number, depth: number) {
    return this.parentKeyProp() === undefined || depth !== 0 || item[this.parentKeyProp()!] === undefined;
  }

  /**
   * 항목이 화면에 표시 가능한지 확인
   * @param item 항목
   * @param index 인덱스
   * @param depth 깊이
   */
  getItemVisible(item: any, index: number, depth: number) {
    return (
      (this.isIncludeSearchText(item, index, depth) && !this.getIsHiddenFn()(item, index)) ||
      this.value() === item.__valueKey ||
      (this.value() instanceof Array && (this.value() as any[]).includes(item.__valueKey))
    );
  }

  /**
   * 항목이 검색어를 포함하는지 확인
   * @param item 항목
   * @param index 인덱스
   * @param depth 깊이
   */
  isIncludeSearchText(item: any, index: number, depth: number): boolean {
    if (
      this.getSearchTextFn()(item, index)
        .toLowerCase()
        .includes(this.searchText()?.toLowerCase() ?? "")
    ) {
      return true;
    }

    if (this.parentKeyProp() !== undefined) {
      const children = this.getChildren(item, index, item.depth);
      for (let i = 0; i < children.length; i++) {
        if (this.isIncludeSearchText(children[i], i, item.depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 자식 항목 목록 조회
   * @param item 항목
   * @param index 인덱스
   * @param depth 깊이
   */
  getChildren(item: ISharedDataBase<string | number>, index: number, depth: number): any[] {
    let result = this.itemByParentKeyMap()?.get(item.__valueKey) ?? [];

    if (this.displayOrderKeyProp() !== undefined) {
      result = result.orderBy((item1) => item1[this.displayOrderKeyProp()!]);
    }

    return result;
  }

  /** 드롭다운 열림 상태 변경 시 처리 */
  onOpenChange() {
    this.searchText.set(undefined);
  }

  /**
   * 모달 버튼 클릭 처리
   * @param event 마우스 이벤트
   */
  async onModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!this.modalType()) return;

    const result = await this.#sdModal.showAsync(this.modalType()!, this.modalHeader() ?? "자세히...", {
      selectMode: this.selectMode(),
      selectedItemKeys: (this.selectMode() === "multi" ? (this.value() as any[]) : [this.value()]).filterExists(),
      ...this.modalInputParam(),
    });

    if (result) {
      const newValue = this.selectMode() === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];
      this.value.set(newValue);
    }
  }

  /**
   * 편집 모달 버튼 클릭 처리
   * @param event 마우스 이벤트
   */
  async onEditModalButtonClick(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!this.editModal()) return;

    const type = this.editModal()![0];
    const header = this.editModal()![1] ?? "자세히...";
    const params = this.editModal()![2];

    await this.#sdModal.showAsync(type, header, params);
  }
}

export interface ISharedDataModalInputParam {
  selectMode?: "single" | "multi";
  selectedItemKeys?: any[];
}

export interface ISharedDataModalOutputResult {
  selectedItemKeys: any[];
}
