import "@simplysm/core-browser";

export { TXT_CHANGE_IGNORE_CONFIRM } from "./core/commons";
export { provideSdAngular } from "./core/provideSdAngular";
export { SdThemeProvider } from "./core/providers/sd-theme-provider";
export { setupBgTheme } from "./core/utils/setups/setupBgTheme";
export { SdOptionEventPlugin } from "./core/plugins/events/sd-option-event.plugin";
export { SdResizeEventPlugin, type ISdResizeEvent } from "./core/plugins/events/sd-resize-event.plugin";
export { SdIntersectionEventPlugin, type ISdIntersectionEvent } from "./core/plugins/events/sd-intersection-event.plugin";
export { SdEventsDirective } from "./core/directives/sd-events.directive";
export { SdSaveCommandEventPlugin } from "./core/plugins/commands/sd-save-command-event.plugin";
export { SdRefreshCommandEventPlugin } from "./core/plugins/commands/sd-refresh-command-event.plugin";
export { SdInsertCommandEventPlugin } from "./core/plugins/commands/sd-insert-command-event.plugin";
export { SdGlobalErrorHandlerPlugin } from "./core/plugins/sd-global-error-handler.plugin";
export { setSafeStyle } from "./core/utils/setSafeStyle";
export { setupRipple } from "./core/utils/setups/setupRipple";
export { SdRippleDirective } from "./core/directives/sd-ripple.directive";
export { setupRevealOnShow } from "./core/utils/setups/setupRevealOnShow";
export { SdShowEffectDirective } from "./core/directives/sd-show-effect.directive";
export { setupInvalid } from "./core/utils/setups/setupInvalid";
export { SdInvalidDirective } from "./core/directives/sd-invalid.directive";
export { SdTypedTemplateDirective } from "./core/directives/sd-typed-template.directive";
export {
  SdItemOfTemplateDirective,
  type SdItemOfTemplateContext,
} from "./core/directives/sd-item-of-template.directive";
export { FormatPipe } from "./core/pipes/format.pipe";
export { setupModelHook } from "./core/utils/setups/setupModelHook";
export { SdNavigateWindowProvider } from "./core/providers/sd-navigate-window.provider";
export { SdRouterLinkDirective } from "./core/directives/sd-router-link.directive";
export { SdAngularConfigProvider } from "./core/providers/sd-angular-config.provider";
export { SdSystemLogProvider } from "./core/providers/sd-system-log.provider";
export {
  SdAppStructureProvider,
  SdAppStructureUtils,
  usePermsSignal,
  type TSdAppStructureItem,
  type ISdMenu,
  type ISdFlatMenu,
  type ISdPermission,
  type ISdFlatPermission,
} from "./core/providers/sd-app-structure.provider";
export { SdFileDialogProvider } from "./core/providers/sd-file-dialog.provider";
export { SdLocalStorageProvider } from "./core/providers/sd-local-storage.provider";
export { SdSystemConfigProvider } from "./core/providers/sd-system-config.provider";
export { SdServiceClientFactoryProvider } from "./core/providers/sd-service-client-factory.provider";
export {
  SdSharedDataProvider,
  SdSharedDataChangeEvent,
  type ISharedDataBase,
  type ISharedDataInfo,
  type SharedDataHandle,
} from "./core/providers/sd-shared-data.provider";
export { useSdSystemConfigResource } from "./core/utils/useSdSystemConfigResource";
export { useCurrentPageCodeSignal } from "./core/utils/useCurrentPageCodeSignal";
export { useFullPageCodeSignal } from "./core/utils/useFullPageCodeSignal";
export { useViewTitleSignal } from "./core/utils/useViewTitleSignal";
export { useViewTypeSignal, type TSdViewType } from "./core/utils/useViewTypeSignal";
export { setupCanDeactivate } from "./core/utils/setups/setupCanDeactivate";
export { setupCumulateSelectedKeys } from "./core/utils/setups/setupCumulateSelectedKeys";
export { setupCloserWhenSingleSelectionChange } from "./core/utils/setups/setupCloserWhenSingleSelectionChange";
export {
  useExpandingManager,
  type IExpandItemDef,
} from "./core/utils/useExpandingManager";
export { useSelectionManager } from "./core/utils/useSelectionManager";
export { injectParent } from "./core/utils/injectParent";

// features/address
export {
  SdAddressSearchModal,
  type IAddress,
} from "./features/address/sd-address-search.modal";

// features
export { SdBaseContainerControl } from "./features/base/sd-base-container.control";
export {
  SdDataSheetControl,
  AbsSdDataSheet,
  type ISdDataSheetItemPropInfo,
  type ISdDataSheetItemInfo,
  type ISdDataSheetSearchResult,
} from "./features/data-view/sd-data-sheet.control";
export { SdDataSheetColumnDirective } from "./features/data-view/sd-data-sheet-column.directive";
export {
  SdDataDetailControl,
  AbsSdDataDetail,
  type ISdDataDetailDataInfo,
} from "./features/data-view/sd-data-detail.control";
export {
  SdDataSelectButtonControl,
  AbsSdDataSelectButton,
} from "./features/data-view/sd-data-select-button.control";

// features/shared-data
export { SdSharedDataSelectControl } from "./features/shared-data/sd-shared-data-select.control";
export { SdSharedDataSelectButtonControl } from "./features/shared-data/sd-shared-data-select-button.control";
export { SdSharedDataSelectListControl } from "./features/shared-data/sd-shared-data-select-list.control";

// ui/layout
export { SdDockContainerControl } from "./ui/layout/dock/sd-dock-container.control";
export { SdDockControl } from "./ui/layout/dock/sd-dock.control";
export { SdPaneDirective } from "./ui/layout/sd-pane.directive";
export { SdGapControl } from "./ui/layout/sd-gap.control";
export { SdViewControl } from "./ui/layout/view/sd-view.control";
export { SdViewItemControl } from "./ui/layout/view/sd-view-item.control";
export { SdCardDirective } from "./ui/layout/sd-card.directive";
export {
  SdKanbanBoardControl,
  type ISdKanbanBoardDropInfo,
  type ISdKanbanDragRef,
  type ISdKanbanDropTarget,
} from "./ui/layout/kanban/sd-kanban-board.control";
export { SdKanbanControl } from "./ui/layout/kanban/sd-kanban.control";
export { SdKanbanLaneControl } from "./ui/layout/kanban/sd-kanban-lane.control";

// ui/form/button
export { SdButtonControl } from "./ui/form/button/sd-button.control";
export { SdAnchorControl } from "./ui/form/button/sd-anchor.control";
export { SdAdditionalButtonControl } from "./ui/form/button/sd-additional-button.control";
export {
  SdModalSelectButtonControl,
  type ISdSelectModal,
  type ISelectModalOutputResult,
  type TSdSelectModalInfo,
} from "./ui/form/button/sd-modal-select-button.control";

// ui/form/input
export { SdTextfieldControl } from "./ui/form/input/sd-textfield.control";
export { type TSdTextfieldTypes, sdTextfieldTypes } from "./ui/form/input/sd-textfield-type-handlers";
export { SdTextareaControl } from "./ui/form/input/sd-textarea.control";
export { SdNumpadControl } from "./ui/form/input/sd-numpad.control";
export { SdRangeControl } from "./ui/form/input/sd-range.control";
export { SdDateRangePicker } from "./ui/form/input/sd-date-range.picker";

// ui/form/choice
export {
  SdStatePresetControl,
  type ISdStatePreset,
} from "./ui/form/choice/sd-state-preset.control";

// ui/form/checkbox
export { SdCheckboxControl } from "./ui/form/checkbox/sd-checkbox.control";
export { SdSwitchControl } from "./ui/form/checkbox/sd-switch.control";
export { SdCheckboxGroupControl } from "./ui/form/checkbox/sd-checkbox-group.control";
export { SdCheckboxGroupItemControl } from "./ui/form/checkbox/sd-checkbox-group-item.control";

// ui/form/editor
export { SdTiptapEditorControl } from "./ui/form/editor/sd-tiptap-editor.control";

// ui/form/select
export { SdSelectControl, type TSelectModeValue } from "./ui/form/select/sd-select.control";
export { SdSelectItemControl } from "./ui/form/select/sd-select-item.control";
export { SdSelectButtonControl } from "./ui/form/select/sd-select-button.control";

// ui/form
export { SdFormControl } from "./ui/form/sd-form.control";

// ui/navigation/collapse
export { SdCollapseControl } from "./ui/navigation/collapse/sd-collapse.control";
export { SdCollapseIconControl } from "./ui/navigation/collapse/sd-collapse-icon.control";

// ui/navigation/tab
export { SdTabControl } from "./ui/navigation/tab/sd-tab.control";
export { SdTabItemControl } from "./ui/navigation/tab/sd-tab-item.control";
export { SdTabviewControl } from "./ui/navigation/tab/sd-tabview.control";
export { SdTabviewItemControl } from "./ui/navigation/tab/sd-tabview-item.control";

// ui/navigation/pagination
export { SdPaginationControl } from "./ui/navigation/pagination/sd-pagination.control";

// ui/navigation/sidebar
export { SdSidebarContainerControl } from "./ui/navigation/sidebar/sd-sidebar-container.control";
export { SdSidebarControl } from "./ui/navigation/sidebar/sd-sidebar.control";
export {
  SdSidebarMenuControl,
  type ISdSidebarMenu,
} from "./ui/navigation/sidebar/sd-sidebar-menu.control";
export {
  SdSidebarUserControl,
  type ISidebarUserMenu,
} from "./ui/navigation/sidebar/sd-sidebar-user.control";

// ui/navigation/topbar
export { SdTopbarContainerControl } from "./ui/navigation/topbar/sd-topbar-container.control";
export { SdTopbarControl } from "./ui/navigation/topbar/sd-topbar.control";
export {
  SdTopbarMenuControl,
  type ISdTopbarMenu,
} from "./ui/navigation/topbar/sd-topbar-menu.control";
export {
  SdTopbarUserControl,
  type ISdTopbarUserMenu,
} from "./ui/navigation/topbar/sd-topbar-user.control";

// ui/data/list
export { SdListControl } from "./ui/data/list/sd-list.control";
export { SdListItemControl } from "./ui/data/list/sd-list-item.control";

// ui/data/sheet
export { SdSheetControl } from "./ui/data/sheet/sd-sheet.control";
export { SdSheetColumnDirective } from "./ui/data/sheet/sd-sheet-column.directive";
export { SdSheetConfigModal } from "./ui/data/sheet/sd-sheet-config.modal";
export type {
  ISdSheetColumnDef,
  ISdSheetConfig,
  ISdSheetHeaderDef,
  ISdSheetItemKeydownEventParam,
} from "./ui/data/sheet/types";

// ui/visual
export { SdLabelControl } from "./ui/visual/sd-label.control";
export { SdNoteControl } from "./ui/visual/sd-note.control";
export { SdProgressControl } from "./ui/visual/sd-progress.control";
export { SdCalendarControl } from "./ui/visual/sd-calendar.control";
export { SdBarcodeControl, type TBarcodeType } from "./ui/visual/sd-barcode.control";
export { SdEchartsControl } from "./ui/visual/sd-echarts.control";

// ui/overlay/dropdown
export { SdDropdownControl } from "./ui/overlay/dropdown/sd-dropdown.control";
export { SdDropdownPopupControl } from "./ui/overlay/dropdown/sd-dropdown-popup.control";

// ui/overlay/modal
export { SdModalControl } from "./ui/overlay/modal/sd-modal.control";
export {
  SdModalProvider,
  SdActivatedModalProvider,
  type ISdModal,
  type ISdModalInfo,
  type ISdModalOptions,
} from "./ui/overlay/modal/sd-modal.provider";
export { SdPromptModalControl } from "./ui/overlay/modal/sd-prompt-modal.control";
export { SdConfirmModalControl } from "./ui/overlay/modal/sd-confirm-modal.control";

// ui/overlay/toast
export { SdToastControl } from "./ui/overlay/toast/sd-toast.control";
export { SdToastContainerControl } from "./ui/overlay/toast/sd-toast-container.control";
export {
  SdToastProvider,
  type TSdToastSeverity,
  type TSdToastTheme,
  type ISdToast,
  type ISdToastInput,
} from "./ui/overlay/toast/sd-toast.provider";

// ui/overlay/busy
export { SdBusyContainerControl } from "./ui/overlay/busy/sd-busy-container.control";
export {
  SdBusyProvider,
  type TSdBusyType,
} from "./ui/overlay/busy/sd-busy.provider";

// core/providers (integration)
export {
  SdPrintProvider,
  type ISdPrint,
  type ISdPrintInput,
} from "./core/providers/sd-print.provider";

// core/utils
export { useSortingManager, type ISortingDef } from "./core/utils/useSortingManager";
export type {
  TDirectiveInputSignals,
  TUndefToOptional,
  TWithOptional,
} from "./core/utils/TDirectiveInputSignals";
