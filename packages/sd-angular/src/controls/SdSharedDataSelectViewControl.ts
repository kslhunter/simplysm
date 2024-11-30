import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  inject,
  input,
  output,
  TemplateRef,
  Type,
  untracked,
  ViewEncapsulation,
} from "@angular/core";
import { StringUtil } from "@simplysm/sd-core-common";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { ISharedDataBase } from "../providers/SdSharedDataProvider";
import { SdItemOfTemplateContext, SdItemOfTemplateDirective } from "../directives/SdItemOfTemplateDirective";
import { SdBusyContainerControl } from "./SdBusyContainerControl";
import { SdDockContainerControl } from "./SdDockContainerControl";
import { SdDockControl } from "./SdDockControl";
import { NgTemplateOutlet } from "@angular/common";
import { SdTextfieldControl } from "./SdTextfieldControl";
import { SdListControl } from "./SdListControl";
import { SdPaneControl } from "./SdPaneControl";
import { SdListItemControl } from "./SdListItemControl";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { SdAnchorControl } from "./SdAnchorControl";
import { SD_MODAL_INPUT, SdModalBase, SdModalProvider } from "../providers/SdModalProvider";
import { ISharedDataModalInputParam, ISharedDataModalOutputResult } from "./SdSharedDataSelectControl";
import { $computed, $effect, $model, $signal } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";
import { SdIconControl } from "./SdIconControl";

/**
 * 공유 데이터 선택 뷰 컴포넌트
 *
 * 공유 데이터를 선택할 수 있는 뷰 형태의 컴포넌트입니다.
 *
 * @example
 * ```html
 * <sd-shared-data-select-view [(value)]="selectedValue"
 *                             [items]="sharedDataItems"
 *                             [displayProp]="'name'"
 *                             [valueProp]="'id'">
 * </sd-shared-data-select-view>
 * ```
 *
 * @remarks
 * - 공유 데이터를 리스트 형태로 선택할 수 있습니다
 * - 단일 선택과 다중 선택을 지원합니다
 * - 검색 기능을 제공합니다
 * - 모달 형태의 선택 기능을 제공합니다
 * - 계층 구조 데이터를 지원합니다
 * - 커스텀 필터링을 지원합니다
 * - 커스텀 헤더를 지원합니다
 */
@Component({
  selector: "sd-shared-data-select-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdDockContainerControl,
    SdDockControl,
    NgTemplateOutlet,
    SdTextfieldControl,
    SdListControl,
    SdPaneControl,
    SdListItemControl,
    SdAnchorControl,
    SdIconControl,
  ],
  template: `
    <sd-busy-container [busy]="busyCount() > 0">
      <sd-dock-container>
        @if (headerTemplateRef() || modalType()) {
          <sd-dock class="pb-default">
            <div class="flex-row">
              <div class="flex-grow">
                @if (headerTemplateRef()) {
                  <ng-template [ngTemplateOutlet]="headerTemplateRef()!"></ng-template>
                }
              </div>
              @if (modalType()) {
                <div>
                  <sd-anchor (click)="onModalButtonClick()">
                    <sd-icon [icon]="icons.externalLink" fixedWidth />
                  </sd-anchor>
                </div>
              }
            </div>
          </sd-dock>
        }

        <sd-dock class="pb-default">
          @if (!filterTemplateRef()) {
            <sd-textfield type="text" placeholder="검색어" [(value)]="searchText" />
          } @else {
            <ng-template [ngTemplateOutlet]="filterTemplateRef()!" />
          }
        </sd-dock>

        <sd-pane>
          <sd-list [inset]="true">
            @if (useUndefined()) {
              <sd-list-item
                [selected]="selectedItem() === undefined"
                (click)="selectedItem.set(undefined)"
                [selectedIcon]="selectedIcon()"
              >
                @if (undefinedTemplateRef()) {
                  <ng-template [ngTemplateOutlet]="undefinedTemplateRef()!" />
                } @else {
                  <span class="tx-theme-grey-default">미지정</span>
                }
              </sd-list-item>
            }
            @for (item of filteredItems(); let index = $index; track item.__valueKey) {
              <sd-list-item
                [selected]="selectedItem() === item"
                (click)="selectedItem() === item ? selectedItem.set(undefined) : selectedItem.set(item)"
                [selectedIcon]="selectedIcon()"
              >
                <ng-template
                  [ngTemplateOutlet]="itemTemplateRef() ?? null"
                  [ngTemplateOutletContext]="{
                    $implicit: item,
                    item: item,
                    index: index,
                    depth: 0,
                  }"
                ></ng-template>
              </sd-list-item>
            }
          </sd-list>
        </sd-pane>
      </sd-dock-container>
    </sd-busy-container>
  `,
})
export class SdSharedDataSelectViewControl<
  T extends ISharedDataBase<string | number>,
  TMODAL extends SdModalBase<ISharedDataModalInputParam, ISharedDataModalOutputResult>,
> {
  /** 아이콘 설정 제공자에서 아이콘들을 주입받습니다 */
  icons = inject(SdAngularConfigProvider).icons;

  /** 모달 서비스를 주입받습니다 */
  #sdModal = inject(SdModalProvider);

  /** 현재 선택된 항목을 관리하는 입력 시그널입니다 */
  _selectedItem = input<T | undefined>(undefined, { alias: "selectedItem" });
  /** 선택된 항목이 변경될 때 발생하는 출력 이벤트입니다 */
  _selectedItemChange = output<T | undefined>({ alias: "selectedItemChange" });
  /** 양방향 바인딩을 위한 선택된 항목 모델입니다 */
  selectedItem = $model(this._selectedItem, this._selectedItemChange);

  /** 표시할 항목 목록입니다 */
  items = input.required<T[]>();
  /** 선택된 항목을 표시할 아이콘입니다 */
  selectedIcon = input<IconDefinition>();
  /** undefined 선택 옵션 사용 여부입니다 */
  useUndefined = input(false, { transform: transformBoolean });
  /** 항목 필터링을 위한 함수입니다 */
  filterFn = input<(item: T, index: number) => boolean>();

  /** 모달에 전달할 입력 파라미터입니다 */
  modalInputParam = input<TMODAL[typeof SD_MODAL_INPUT]>();
  /** 사용할 모달의 타입입니다 */
  modalType = input<Type<TMODAL>>();
  /** 모달의 헤더 텍스트입니다 */
  modalHeader = input<string>();

  /** 헤더 템플릿 참조입니다 */
  headerTemplateRef = contentChild<any, TemplateRef<void>>("headerTemplate", { read: TemplateRef });
  /** 필터 템플릿 참조입니다 */
  filterTemplateRef = contentChild<any, TemplateRef<void>>("filterTemplate", { read: TemplateRef });
  /** 항목 템플릿 참조입니다 */
  itemTemplateRef = contentChild<any, TemplateRef<SdItemOfTemplateContext<T>>>(SdItemOfTemplateDirective, {
    read: TemplateRef,
  });
  /** undefined 항목 템플릿 참조입니다 */
  undefinedTemplateRef = contentChild<any, TemplateRef<void>>("undefinedTemplate", { read: TemplateRef });

  /** 로딩 상태를 나타내는 카운터입니다 */
  busyCount = $signal(0);
  /** 검색어를 관리하는 시그널입니다 */
  searchText = $signal<string>();

  /** 필터링된 항목 목록을 계산하는 컴퓨티드 시그널입니다 */
  filteredItems = $computed(() => {
    let result = this.items().filter((item) => !item.__isHidden);

    if (!StringUtil.isNullOrEmpty(this.searchText())) {
      result = result.filter((item) => item.__searchText.includes(this.searchText()!));
    }

    if (this.filterFn()) {
      result = result.filter((item, i) => this.filterFn()!(item, i));
    }

    return result;
  });

  /**
   * 생성자에서는 선택된 항목이 변경될 때마다
   * 실제 items 배열에서 해당하는 항목을 찾아 업데이트합니다
   */
  constructor() {
    $effect(() => {
      const newSelectedItem = this.items().single(
        (item) => item.__valueKey === untracked(() => this.selectedItem())?.__valueKey,
      );
      this.selectedItem.set(newSelectedItem);
    });
  }

  /**
   * 모달 버튼 클릭 시 실행되는 메서드입니다
   * 모달을 열고 선택된 결과를 처리합니다
   */
  async onModalButtonClick(): Promise<void> {
    if (!this.modalType()) return;

    const result = await this.#sdModal.showAsync(this.modalType()!, this.modalHeader() ?? "자세히...", {
      selectMode: "single",
      selectedItemKeys: [this.selectedItem()].filterExists().map((item) => item.__valueKey),
      ...this.modalInputParam(),
    });

    if (result) {
      const newSelectedItem = this.items().single((item) => item.__valueKey === result.selectedItemKeys[0]);
      this.selectedItem.set(newSelectedItem);
    }
  }
}
