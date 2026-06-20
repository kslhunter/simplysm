import "@simplysm/core-browser";

// core
export { provideSdAngular } from "./core/provideSdAngular";
export { setupBgTheme } from "./core/setupBgTheme";
export { setSafeStyle } from "./core/setSafeStyle";
export { setupModelHook } from "./core/setupModelHook";
export { mark } from "./core/mark";
export { FormatPipe } from "./core/format.pipe";
export type { SelectModalOutputResult } from "./core/select-modal-output-result";
export type {
  DirectiveInputSignals,
  UndefToOptional,
  WithOptional,
} from "./core/directive-input-signals";

// core/events
export { SdOptionEventPlugin } from "./core/events/sd-option-event.plugin";
export { SdResizeDirective, type SdResizeEvent } from "./core/events/sd-resize";
export {
  SdIntersectionDirective,
  type SdIntersectionEvent,
} from "./core/events/sd-intersection";
export { SdEvents } from "./core/events/sd-events";

// core/commands
export { SdCommandDirective } from "./core/commands/sd-command";

// core/error-handler
export { SdGlobalErrorHandlerPlugin } from "./core/error-handler/sd-global-error-handler.plugin";

// core/ripple
export { setupRipple } from "./core/ripple/setupRipple";
export { SdRipple } from "./core/ripple/sd-ripple";

// core/show-effect
export { setupRevealOnShow } from "./core/show-effect/setupRevealOnShow";
export { SdShowEffect } from "./core/show-effect/sd-show-effect";

// core/validation
export { setupInvalid } from "./core/validation/setupInvalid";
export { SdInvalid } from "./core/validation/sd-invalid";

// core/template
export { SdTypedTemplate } from "./core/template/sd-typed-template";
export {
  SdItemOfTemplate,
  type SdItemOfTemplateContext,
} from "./core/template/sd-item-of-template";

// core/routing
export { SdNavigateWindowProvider } from "./core/routing/sd-navigate-window.provider";
export { SdRouterLink } from "./core/routing/sd-router-link";
export { injectCurrentPageCodeSignal } from "./core/routing/injectCurrentPageCodeSignal";
export { injectFullPageCodeSignal } from "./core/routing/injectFullPageCodeSignal";
export { injectViewTitleSignal } from "./core/routing/injectViewTitleSignal";
export { injectViewTypeSignal, type SdViewType } from "./core/routing/injectViewTypeSignal";
export { setupCanDeactivate } from "./core/routing/setupCanDeactivate";
export { getMenuRouterLinkOption, getIsMenuSelected } from "./core/routing/menu-utils";

// core/config
export { SdAngularConfigProvider } from "./core/config/sd-angular-config.provider";
export { SdSystemLogProvider } from "./core/config/sd-system-log.provider";
export { SdLocalStorageProvider } from "./core/config/sd-local-storage.provider";
export { SdSystemConfigProvider } from "./core/config/sd-system-config.provider";
export { injectSdSystemConfigResource } from "./core/config/injectSdSystemConfigResource";

// core/app-structure
export {
  SdAppStructureProvider,
  injectPermsSignal,
} from "./core/app-structure/sd-app-structure.provider";
export { SdAppStructureUtils } from "./core/app-structure/sd-app-structure.utils";
export type {
  SdMenu,
  SdFlatMenu,
  SdPermission,
} from "./core/app-structure/sd-app-structure.types";

// core/file-dialog
export { SdFileDialogProvider } from "./core/file-dialog/sd-file-dialog.provider";

// core/service-client
export { SdServiceClientFactoryProvider } from "./core/service-client/sd-service-client-factory.provider";

// core/shared-data
export {
  SdSharedDataProvider,
  SdSharedDataChangeEvent,
  type SharedDataBase,
  type SharedDataInfo,
  type SharedDataHandle,
} from "./core/shared-data/sd-shared-data.provider";

// core/selection
export {
  useExpandingManager,
  type ExpandItemDef,
} from "./core/selection/useExpandingManager";
export { useSelectionManager } from "./core/selection/useSelectionManager";
export { useSortingManager, type SortingDef } from "./core/selection/useSortingManager";

// core/modal
export { SdModal } from "./core/modal/sd-modal";
export {
  SdModalProvider,
  type SdModalContentDef,
  type SdModalInfo,
  type SdModalOptions,
} from "./core/modal/sd-modal.provider";
export { SdActivatedModalProvider } from "./core/modal/sd-activated-modal.provider";
export { SdPromptModal } from "./core/modal/sd-prompt-modal";
export { SdConfirmModal } from "./core/modal/sd-confirm-modal";

// core/toast
export { SdToast } from "./core/toast/sd-toast";
export { SdToastContainer } from "./core/toast/sd-toast-container";
export {
  SdToastProvider,
  type SdToastSeverity,
  type SdToastTheme,
  type SdToastContentDef,
  type SdToastInput,
} from "./core/toast/sd-toast.provider";

// core/busy
export { SdBusyContainer } from "./core/busy/sd-busy-container";
export {
  SdBusyProvider,
  type SdBusyType,
} from "./core/busy/sd-busy.provider";

// core/print
export {
  SdPrintProvider,
  type SdPrint,
  type SdPrintInput,
} from "./core/print/sd-print.provider";

// controls/button
export { SdButton } from "./controls/button/sd-button";
export { SdAnchor } from "./controls/button/sd-anchor";
export { SdAdditionalButton } from "./controls/button/sd-additional-button";
export {
  SdModalSelectButton,
  type SdSelectModal,
  type SdSelectModalInfo,
} from "./controls/button/sd-modal-select-button";

// controls/input
export { SdTextfield } from "./controls/input/sd-textfield";
export { type SdTextfieldTypes, sdTextfieldTypes } from "./controls/input/sd-textfield-type-handlers";
export { SdTextarea } from "./controls/input/sd-textarea";
export { SdNumpad } from "./controls/input/sd-numpad";
export { SdRange } from "./controls/input/sd-range";
export { SdDateRangePicker } from "./controls/input/sd-date-range-picker";

// controls/checkbox
export { SdCheckbox } from "./controls/checkbox/sd-checkbox";
export { SdSwitch } from "./controls/checkbox/sd-switch";
export { SdCheckboxGroup } from "./controls/checkbox/sd-checkbox-group";
export { SdCheckboxGroupItem } from "./controls/checkbox/sd-checkbox-group-item";

// controls/select
export { SdSelect, type SelectModeValue } from "./controls/select/sd-select";
export { SdSelectItem } from "./controls/select/sd-select-item";
export { SdSelectButton } from "./controls/select/sd-select-button";

// controls/dropdown
export { SdDropdown } from "./controls/dropdown/sd-dropdown";
export { SdDropdownPopup } from "./controls/dropdown/sd-dropdown-popup";

// controls/form
export { SdForm } from "./controls/form/sd-form";

// controls/collapse
export { SdCollapse } from "./controls/collapse/sd-collapse";
export { SdCollapseIcon } from "./controls/collapse/sd-collapse-icon";

// controls/tab
export { SdTab } from "./controls/tab/sd-tab";
export { SdTabItem } from "./controls/tab/sd-tab-item";

// controls/list
export { SdList } from "./controls/list/sd-list";
export { SdListItem } from "./controls/list/sd-list-item";

// controls/gap
export { SdGap } from "./controls/gap/sd-gap";

// controls/pagination
export { SdPagination } from "./controls/pagination/sd-pagination";

// layout/sidebar
export { SdSidebarContainer } from "./layout/sidebar/sd-sidebar-container";
export { SdSidebar } from "./layout/sidebar/sd-sidebar";
export { SdSidebarMenu } from "./layout/sidebar/sd-sidebar-menu";
export {
  SdSidebarUser,
  type SdSidebarUserMenu,
} from "./layout/sidebar/sd-sidebar-user";

// layout/topbar
export { SdTopbarContainer } from "./layout/topbar/sd-topbar-container";
export { SdTopbar } from "./layout/topbar/sd-topbar";
export { SdTopbarMenu } from "./layout/topbar/sd-topbar-menu";
export {
  SdTopbarUser,
  type SdTopbarUserMenu,
} from "./layout/topbar/sd-topbar-user";

// data/sheet
export { SdSheet } from "./data/sheet/sd-sheet";
export { SdSheetColumn, type SdSheetCellContext } from "./data/sheet/sd-sheet-column";
export { SdSheetColumnCellTemplate } from "./data/sheet/sd-sheet-column-cell-template";
export { SdSheetConfigModal } from "./data/sheet/sd-sheet-config.modal";
export type {
  SdSheetColumnDef,
  SdSheetConfig,
  SdSheetHeaderDef,
  SdSheetItemKeydownEventParam,
  SdSheetCellKeydownEventParam,
} from "./data/sheet/types";

// data/shared-data
export { SdSharedDataSelect } from "./data/shared-data/sd-shared-data-select";
export { SdSharedDataSelectButton } from "./data/shared-data/sd-shared-data-select-button";
export { SdSharedDataSelectList } from "./data/shared-data/sd-shared-data-select-list";
export { matchesSearchText } from "./data/shared-data/matchesSearchText";

// data/kanban
export {
  SdKanbanBoard,
  type SdKanbanBoardDropInfo,
  type SdKanbanDragRef,
  type SdKanbanDropTarget,
} from "./data/kanban/sd-kanban-board";
export { SdKanban } from "./data/kanban/sd-kanban";
export { SdKanbanLane } from "./data/kanban/sd-kanban-lane";

// data/permission-table
export { SdPermissionTable } from "./data/permission-table/sd-permission-table";

// data/state-preset
export {
  SdStatePreset,
  type SdStatePresetDef,
} from "./data/state-preset/sd-state-preset";

// data/crud
export { SdBaseContainer } from "./data/crud/sd-base-container";
export { SdCrudDetail } from "./data/crud/sd-crud-detail";
export { SdCrudList } from "./data/crud/sd-crud-list";

// features/theme
export { SdThemeProvider } from "./features/theme/sd-theme-provider";
export { SdThemeSelector } from "./features/theme/sd-theme-selector";

// features/address
export {
  SdAddressSearchModal,
  type Address,
} from "./features/address/sd-address-search.modal";

// features/editor
export { SdTiptapEditor } from "./features/editor/sd-tiptap-editor";
export { SdMarkdownEditor } from "./features/editor/sd-markdown-editor";

// features/visual
export { SdLabel } from "./features/visual/sd-label";
export { SdNote } from "./features/visual/sd-note";
export { SdProgress } from "./features/visual/sd-progress";
export { SdCalendar } from "./features/visual/sd-calendar";
export { SdBarcode, type BarcodeType } from "./features/visual/sd-barcode";
export { SdEcharts } from "./features/visual/sd-echarts";
