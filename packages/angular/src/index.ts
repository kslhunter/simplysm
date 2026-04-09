import "@simplysm/core-browser";

export { TXT_CHANGE_IGNORE_CONFIRM } from "./core/commons";
export { provideSdAngular } from "./core/provideSdAngular";
export { SdThemeProvider } from "./core/providers/sd-theme-provider";
export { setupBgTheme } from "./core/utils/setups/setupBgTheme";
export { SdOptionEventPlugin } from "./core/plugins/events/sd-option-event.plugin";
export { SdResizeEventPlugin, type SdResizeEvent } from "./core/plugins/events/sd-resize-event.plugin";
export { SdIntersectionEventPlugin, type SdIntersectionEvent } from "./core/plugins/events/sd-intersection-event.plugin";
export { SdEvents } from "./core/directives/sd-events";
export { SdSaveCommandEventPlugin } from "./core/plugins/commands/sd-save-command-event.plugin";
export { SdRefreshCommandEventPlugin } from "./core/plugins/commands/sd-refresh-command-event.plugin";
export { SdInsertCommandEventPlugin } from "./core/plugins/commands/sd-insert-command-event.plugin";
export { SdGlobalErrorHandlerPlugin } from "./core/plugins/sd-global-error-handler.plugin";
export { setSafeStyle } from "./core/utils/setSafeStyle";
export { setupRipple } from "./core/utils/setups/setupRipple";
export { SdRipple } from "./core/directives/sd-ripple";
export { setupRevealOnShow } from "./core/utils/setups/setupRevealOnShow";
export { SdShowEffect } from "./core/directives/sd-show-effect";
export { setupInvalid } from "./core/utils/setups/setupInvalid";
export { SdInvalid } from "./core/directives/sd-invalid";
export { SdTypedTemplate } from "./core/directives/sd-typed-template";
export {
  SdItemOfTemplate,
  type SdItemOfTemplateContext,
} from "./core/directives/sd-item-of-template";
export { FormatPipe } from "./core/pipes/format.pipe";
export { setupModelHook } from "./core/utils/setups/setupModelHook";
export { SdNavigateWindowProvider } from "./core/providers/sd-navigate-window.provider";
export { SdRouterLink } from "./core/directives/sd-router-link";
export { SdAngularConfigProvider } from "./core/providers/sd-angular-config.provider";
export { SdSystemLogProvider } from "./core/providers/sd-system-log.provider";
export {
  SdAppStructureProvider,
  injectPermsSignal,
} from "./core/providers/sd-app-structure.provider";
export { SdAppStructureUtils } from "./core/providers/sd-app-structure.utils";
export type {
  AppStructureItem,
  SdMenu,
  SdFlatMenu,
  SdPermission,
  FlatPermission,
} from "./core/providers/sd-app-structure.types";
export { SdFileDialogProvider } from "./core/providers/sd-file-dialog.provider";
export { SdLocalStorageProvider } from "./core/providers/sd-local-storage.provider";
export { SdSystemConfigProvider } from "./core/providers/sd-system-config.provider";
export { SdServiceClientFactoryProvider } from "./core/providers/sd-service-client-factory.provider";
export {
  SdSharedDataProvider,
  SdSharedDataChangeEvent,
  type SharedDataBase,
  type SharedDataInfo,
  type SharedDataHandle,
} from "./core/providers/sd-shared-data.provider";
export { injectSdSystemConfigResource } from "./core/utils/injectSdSystemConfigResource";
export { injectCurrentPageCodeSignal } from "./core/utils/injectCurrentPageCodeSignal";
export { injectFullPageCodeSignal } from "./core/utils/injectFullPageCodeSignal";
export { injectViewTitleSignal } from "./core/utils/injectViewTitleSignal";
export { injectViewTypeSignal, type SdViewType } from "./core/utils/injectViewTypeSignal";
export { setupCanDeactivate } from "./core/utils/setups/setupCanDeactivate";
export { setupCumulateSelectedKeys } from "./core/utils/setups/setupCumulateSelectedKeys";
export { setupCloserWhenSingleSelectionChange } from "./features/data-view/setupCloserWhenSingleSelectionChange";
export {
  useExpandingManager,
  type ExpandItemDef,
} from "./core/utils/useExpandingManager";
export { useSelectionManager } from "./core/utils/useSelectionManager";
export { injectParent } from "./core/utils/injectParent";
export { withBusy } from "./core/utils/withBusy";

// features/address
export {
  SdAddressSearchModal,
  type Address,
} from "./features/address/sd-address-search.modal";

// features/permission-table
export { SdPermissionTable } from "./features/permission-table/sd-permission-table";

// features
export { SdBaseContainer } from "./features/base/sd-base-container";
export { SdDataSheet } from "./features/data-view/sd-data-sheet";
export {
  SdDataSheetBase,
  type SdDataSheetItemPropInfo,
  type SdDataSheetItemInfo,
  type SdDataSheetSearchResult,
} from "./features/data-view/sd-data-sheet.base";
export { SdDataSheetColumn } from "./features/data-view/sd-data-sheet-column";
export { SdDataDetail } from "./features/data-view/sd-data-detail";
export {
  SdDataDetailBase,
  type SdDataDetailDataInfo,
} from "./features/data-view/sd-data-detail.base";
export { SdDataSelectButton } from "./features/data-view/sd-data-select-button";
export { SdDataSelectButtonBase } from "./features/data-view/sd-data-select-button.base";

// features/shared-data
export { SdSharedDataSelect } from "./features/shared-data/sd-shared-data-select";
export { SdSharedDataSelectButton } from "./features/shared-data/sd-shared-data-select-button";
export { SdSharedDataSelectList } from "./features/shared-data/sd-shared-data-select-list";
export { matchesSearchText } from "./features/shared-data/matchesSearchText";

// ui/layout
export { SdDockContainer } from "./ui/layout/dock/sd-dock-container";
export { SdDock } from "./ui/layout/dock/sd-dock";
export { SdGap } from "./ui/layout/sd-gap";
export {
  SdKanbanBoard,
  type SdKanbanBoardDropInfo,
  type SdKanbanDragRef,
  type SdKanbanDropTarget,
} from "./ui/layout/kanban/sd-kanban-board";
export { SdKanban } from "./ui/layout/kanban/sd-kanban";
export { SdKanbanLane } from "./ui/layout/kanban/sd-kanban-lane";

// ui/form/button
export { SdButton } from "./ui/form/button/sd-button";
export { SdAnchor } from "./ui/form/button/sd-anchor";
export { SdAdditionalButton } from "./ui/form/button/sd-additional-button";
export {
  SdModalSelectButton,
  type SdSelectModal,
  type SdSelectModalInfo,
} from "./ui/form/button/sd-modal-select-button";
export type { SelectModalOutputResult } from "./core/types/select-modal-output-result";

// ui/form/input
export { SdTextfield } from "./ui/form/input/sd-textfield";
export { type SdTextfieldTypes, sdTextfieldTypes } from "./ui/form/input/sd-textfield-type-handlers";
export { SdTextarea } from "./ui/form/input/sd-textarea";
export { SdNumpad } from "./ui/form/input/sd-numpad";
export { SdRange } from "./ui/form/input/sd-range";
export { SdDateRangePicker } from "./ui/form/input/sd-date-range.picker";

// ui/form/choice
export {
  SdStatePreset,
  type SdStatePresetDef,
} from "./ui/form/choice/sd-state-preset";

// ui/form/checkbox
export { SdCheckbox } from "./ui/form/checkbox/sd-checkbox";
export { SdSwitch } from "./ui/form/checkbox/sd-switch";
export { SdCheckboxGroup } from "./ui/form/checkbox/sd-checkbox-group";
export { SdCheckboxGroupItem } from "./ui/form/checkbox/sd-checkbox-group-item";

// ui/form/editor
export { SdTiptapEditor } from "./ui/form/editor/sd-tiptap-editor";

// ui/form/select
export { SdSelect, type SelectModeValue } from "./ui/form/select/sd-select";
export { SdSelectItem } from "./ui/form/select/sd-select-item";
export { SdSelectButton } from "./ui/form/select/sd-select-button";

// ui/form
export { SdForm } from "./ui/form/sd-form";

// ui/navigation/collapse
export { SdCollapse } from "./ui/navigation/collapse/sd-collapse";
export { SdCollapseIcon } from "./ui/navigation/collapse/sd-collapse-icon";

// ui/navigation/tab
export { SdTab } from "./ui/navigation/tab/sd-tab";
export { SdTabItem } from "./ui/navigation/tab/sd-tab-item";

// ui/navigation/menu
export { getMenuRouterLinkOption, getIsMenuSelected } from "./ui/navigation/menu-utils";

// ui/navigation/pagination
export { SdPagination } from "./ui/navigation/pagination/sd-pagination";

// ui/navigation/sidebar
export { SdSidebarContainer } from "./ui/navigation/sidebar/sd-sidebar-container";
export { SdSidebar } from "./ui/navigation/sidebar/sd-sidebar";
export { SdSidebarMenu } from "./ui/navigation/sidebar/sd-sidebar-menu";
export {
  SdSidebarUser,
  type SdSidebarUserMenu,
} from "./ui/navigation/sidebar/sd-sidebar-user";

// ui/navigation/topbar
export { SdTopbarContainer } from "./ui/navigation/topbar/sd-topbar-container";
export { SdTopbar } from "./ui/navigation/topbar/sd-topbar";
export { SdTopbarMenu } from "./ui/navigation/topbar/sd-topbar-menu";
export {
  SdTopbarUser,
  type SdTopbarUserMenu,
} from "./ui/navigation/topbar/sd-topbar-user";

// ui/data/list
export { SdList } from "./ui/data/list/sd-list";
export { SdListItem } from "./ui/data/list/sd-list-item";

// ui/data/sheet
export { SdSheet } from "./ui/data/sheet/sd-sheet";
export { SdSheetColumn } from "./ui/data/sheet/sd-sheet-column";
export { SdSheetConfigModal } from "./ui/data/sheet/sd-sheet-config.modal";
export type {
  SdSheetColumnDef,
  SdSheetConfig,
  SdSheetHeaderDef,
  SdSheetItemKeydownEventParam,
  SdSheetCellKeydownEventParam,
} from "./ui/data/sheet/types";

// ui/visual
export { SdLabel } from "./ui/visual/sd-label";
export { SdNote } from "./ui/visual/sd-note";
export { SdProgress } from "./ui/visual/sd-progress";
export { SdCalendar } from "./ui/visual/sd-calendar";
export { SdBarcode, type BarcodeType } from "./ui/visual/sd-barcode";
export { SdEcharts } from "./ui/visual/sd-echarts";

// ui/overlay/dropdown
export { SdDropdown } from "./ui/overlay/dropdown/sd-dropdown";
export { SdDropdownPopup } from "./ui/overlay/dropdown/sd-dropdown-popup";

// ui/overlay/modal
export { SdModal } from "./ui/overlay/modal/sd-modal";
export {
  SdModalProvider,
  type SdModalContentDef,
  type SdModalInfo,
  type SdModalOptions,
} from "./ui/overlay/modal/sd-modal.provider";
export { SdActivatedModalProvider } from "./core/providers/sd-activated-modal.provider";
export { SdPromptModal } from "./ui/overlay/modal/sd-prompt-modal";
export { SdConfirmModal } from "./ui/overlay/modal/sd-confirm-modal";

// ui/overlay/toast
export { SdToast } from "./ui/overlay/toast/sd-toast";
export { SdToastContainer } from "./ui/overlay/toast/sd-toast-container";
export {
  SdToastProvider,
  type SdToastSeverity,
  type SdToastTheme,
  type SdToastContentDef,
  type SdToastInput,
} from "./core/providers/sd-toast.provider";

// ui/overlay/busy
export { SdBusyContainer } from "./ui/overlay/busy/sd-busy-container";
export {
  SdBusyProvider,
  type SdBusyType,
} from "./core/providers/sd-busy.provider";

// core/providers (integration)
export {
  SdPrintProvider,
  type SdPrint,
  type SdPrintInput,
} from "./core/providers/sd-print.provider";

// core/utils
export { mark } from "./core/utils/mark";
export { useSortingManager, type SortingDef } from "./core/utils/useSortingManager";
export type {
  DirectiveInputSignals,
  UndefToOptional,
  WithOptional,
} from "./core/utils/directive-input-signals";
