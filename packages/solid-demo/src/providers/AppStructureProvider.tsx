import { lazy } from "solid-js";
import { createAppStructure } from "@simplysm/solid";
import {
  IconBell,
  IconCards,
  IconForms,
  IconHome,
  IconLayoutList,
  IconLayoutSidebar,
  IconPlug,
  IconWindowMaximize,
} from "@tabler/icons-solidjs";

const MainView = lazy(() =>
  import("../views/home/main/MainView").then((m) => ({ default: m.MainView })),
);
const ButtonView = lazy(() =>
  import("../views/home/form-control/button/ButtonView").then((m) => ({ default: m.ButtonView })),
);
const SelectView = lazy(() =>
  import("../views/home/form-control/select/SelectView").then((m) => ({ default: m.SelectView })),
);
const ComboboxView = lazy(() =>
  import("../views/home/form-control/combobox/ComboboxView").then((m) => ({
    default: m.ComboboxView,
  })),
);
const FieldView = lazy(() =>
  import("../views/home/form-control/field/FieldView").then((m) => ({ default: m.FieldView })),
);
const ColorPickerView = lazy(() =>
  import("../views/home/form-control/color-picker/ColorPickerView").then((m) => ({
    default: m.ColorPickerView,
  })),
);
const CheckBoxRadioView = lazy(() =>
  import("../views/home/form-control/checkbox-radio/CheckBoxRadioView").then((m) => ({
    default: m.CheckBoxRadioView,
  })),
);
const CheckBoxRadioGroupView = lazy(() =>
  import("../views/home/form-control/checkbox-radio-group/CheckBoxRadioGroupView").then((m) => ({
    default: m.CheckBoxRadioGroupView,
  })),
);
const DateRangePickerView = lazy(() =>
  import("../views/home/form-control/date-range-picker/DateRangePickerView").then((m) => ({
    default: m.DateRangePickerView,
  })),
);
const RichTextEditorView = lazy(() =>
  import("../views/home/form-control/rich-text-editor/RichTextEditorView").then((m) => ({
    default: m.RichTextEditorView,
  })),
);
const NumpadView = lazy(() =>
  import("../views/home/form-control/numpad/NumpadView").then((m) => ({ default: m.NumpadView })),
);
const StatePresetView = lazy(() =>
  import("../views/home/form-control/state-preset/StatePresetView").then((m) => ({
    default: m.StatePresetView,
  })),
);
const ThemeToggleView = lazy(() =>
  import("../views/home/form-control/theme-toggle/ThemeToggleView").then((m) => ({
    default: m.ThemeToggleView,
  })),
);
const SidebarView = lazy(() =>
  import("../views/home/layout/sidebar/SidebarView").then((m) => ({ default: m.SidebarView })),
);
const TopbarView = lazy(() =>
  import("../views/home/layout/topbar/TopbarView").then((m) => ({ default: m.TopbarView })),
);
const FormGroupView = lazy(() =>
  import("../views/home/layout/form-group/FormGroupView").then((m) => ({
    default: m.FormGroupView,
  })),
);
const FormTableView = lazy(() =>
  import("../views/home/layout/form-table/FormTableView").then((m) => ({
    default: m.FormTableView,
  })),
);
const ListView = lazy(() =>
  import("../views/home/data/list/ListView").then((m) => ({ default: m.ListView })),
);
const TableView = lazy(() =>
  import("../views/home/data/table/TableView").then((m) => ({ default: m.TableView })),
);
const PaginationView = lazy(() =>
  import("../views/home/data/pagination/PaginationView").then((m) => ({
    default: m.PaginationView,
  })),
);
const SheetView = lazy(() =>
  import("../views/home/data/sheet/SheetView").then((m) => ({ default: m.SheetView })),
);
const SheetFullView = lazy(() =>
  import("../views/home/data/sheet-full/SheetFullView").then((m) => ({
    default: m.SheetFullView,
  })),
);
const KanbanView = lazy(() =>
  import("../views/home/data/kanban/KanbanView").then((m) => ({ default: m.KanbanView })),
);
const CalendarView = lazy(() =>
  import("../views/home/data/calendar/CalendarView").then((m) => ({ default: m.CalendarView })),
);
const PermissionTableView = lazy(() =>
  import("../views/home/data/permission-table/PermissionTableView").then((m) => ({
    default: m.PermissionTableView,
  })),
);
const CrudSheetView = lazy(() =>
  import("../views/home/data/crud-sheet/CrudSheetView").then((m) => ({
    default: m.CrudSheetView,
  })),
);
const CollapseView = lazy(() =>
  import("../views/home/disclosure/collapse/CollapseView").then((m) => ({
    default: m.CollapseView,
  })),
);
const DropdownView = lazy(() =>
  import("../views/home/disclosure/dropdown/DropdownView").then((m) => ({
    default: m.DropdownView,
  })),
);
const DialogView = lazy(() =>
  import("../views/home/disclosure/dialog/DialogView").then((m) => ({ default: m.DialogView })),
);
const TabView = lazy(() =>
  import("../views/home/disclosure/tab/TabView").then((m) => ({ default: m.TabView })),
);
const CardView = lazy(() =>
  import("../views/home/display/card/CardView").then((m) => ({ default: m.CardView })),
);
const IconView = lazy(() =>
  import("../views/home/display/icon/IconView").then((m) => ({ default: m.IconView })),
);
const TagView = lazy(() =>
  import("../views/home/display/tag/TagView").then((m) => ({ default: m.TagView })),
);
const AlertView = lazy(() =>
  import("../views/home/display/alert/AlertView").then((m) => ({ default: m.AlertView })),
);
const LinkView = lazy(() =>
  import("../views/home/display/link/LinkView").then((m) => ({ default: m.LinkView })),
);
const BarcodeView = lazy(() =>
  import("../views/home/display/barcode/BarcodeView").then((m) => ({ default: m.BarcodeView })),
);
const EchartsView = lazy(() =>
  import("../views/home/display/echarts/EchartsView").then((m) => ({ default: m.EchartsView })),
);
const NotificationView = lazy(() =>
  import("../views/home/feedback/notification/NotificationView").then((m) => ({
    default: m.NotificationView,
  })),
);
const BusyView = lazy(() =>
  import("../views/home/feedback/busy/BusyView").then((m) => ({ default: m.BusyView })),
);
const ProgressView = lazy(() =>
  import("../views/home/feedback/progress/ProgressView").then((m) => ({
    default: m.ProgressView,
  })),
);
const PrintView = lazy(() =>
  import("../views/home/feedback/print/PrintView").then((m) => ({ default: m.PrintView })),
);
const ServiceClientView = lazy(() =>
  import("../views/home/service/service-client/ServiceClientView").then((m) => ({
    default: m.ServiceClientView,
  })),
);
const SharedDataView = lazy(() =>
  import("../views/home/service/shared-data/SharedDataView").then((m) => ({
    default: m.SharedDataView,
  })),
);

export const { AppStructureProvider, useAppStructure } = createAppStructure(() => ({
  items: [
    {
      code: "home",
      title: "Home",
      children: [
        {
          code: "main",
          title: "Main",
          icon: IconHome,
          component: MainView,
        },
        {
          code: "form-control",
          title: "Form Control",
          icon: IconForms,
          children: [
            {
              code: "button",
              title: "Button",
              component: ButtonView,
            },
            {
              code: "select",
              title: "Select",
              component: SelectView,
            },
            {
              code: "combobox",
              title: "Combobox",
              component: ComboboxView,
            },
            {
              code: "field",
              title: "Field",
              component: FieldView,
            },
            {
              code: "color-picker",
              title: "ColorPicker",
              component: ColorPickerView,
            },
            {
              code: "checkbox-radio",
              title: "Checkbox & Radio",
              component: CheckBoxRadioView,
            },
            {
              code: "checkbox-radio-group",
              title: "CheckboxGroup & RadioGroup",
              component: CheckBoxRadioGroupView,
            },
            {
              code: "date-range-picker",
              title: "DateRangePicker",
              component: DateRangePickerView,
            },
            {
              code: "rich-text-editor",
              title: "RichTextEditor",
              component: RichTextEditorView,
            },
            {
              code: "numpad",
              title: "Numpad",
              component: NumpadView,
            },
            {
              code: "state-preset",
              title: "StatePreset",
              component: StatePresetView,
            },
            {
              code: "theme-toggle",
              title: "ThemeToggle",
              component: ThemeToggleView,
            },
          ],
        },
        {
          code: "layout",
          title: "Layout",
          icon: IconLayoutSidebar,
          children: [
            {
              code: "sidebar",
              title: "Sidebar",
              component: SidebarView,
            },
            {
              code: "topbar",
              title: "Topbar",
              component: TopbarView,
            },
            {
              code: "form-group",
              title: "FormGroup",
              component: FormGroupView,
            },
            {
              code: "form-table",
              title: "FormTable",
              component: FormTableView,
            },
          ],
        },
        {
          code: "data",
          title: "Data",
          icon: IconLayoutList,
          children: [
            { code: "list", title: "List", component: ListView },
            {
              code: "table",
              title: "Table",
              component: TableView,
            },
            {
              code: "pagination",
              title: "Pagination",
              component: PaginationView,
            },
            {
              code: "sheet",
              title: "DataSheet",
              component: SheetView,
            },
            {
              code: "sheet-full",
              title: "DataSheet (Full)",
              component: SheetFullView,
            },
            {
              code: "kanban",
              title: "Kanban",
              component: KanbanView,
            },
            {
              code: "calendar",
              title: "Calendar",
              component: CalendarView,
            },
            {
              code: "permission-table",
              title: "PermissionTable",
              component: PermissionTableView,
            },
            {
              code: "crud-sheet",
              title: "CrudSheet",
              component: CrudSheetView,
            },
          ],
        },
        {
          code: "disclosure",
          title: "Disclosure",
          icon: IconWindowMaximize,
          children: [
            {
              code: "collapse",
              title: "Collapse",
              component: CollapseView,
            },
            {
              code: "dropdown",
              title: "Dropdown",
              component: DropdownView,
            },
            {
              code: "modal",
              title: "Dialog",
              component: DialogView,
            },
            {
              code: "tab",
              title: "Tabs",
              component: TabView,
            },
          ],
        },
        {
          code: "display",
          title: "Display",
          icon: IconCards,
          children: [
            {
              code: "card",
              title: "Card",
              component: CardView,
            },
            {
              code: "icon",
              title: "Icon",
              component: IconView,
            },
            {
              code: "label",
              title: "Tag",
              component: TagView,
            },
            {
              code: "note",
              title: "Alert",
              component: AlertView,
            },
            {
              code: "link",
              title: "Link",
              component: LinkView,
            },
            {
              code: "barcode",
              title: "Barcode",
              component: BarcodeView,
            },
            {
              code: "echarts",
              title: "Echarts",
              component: EchartsView,
            },
          ],
        },
        {
          code: "feedback",
          title: "Feedback",
          icon: IconBell,
          children: [
            {
              code: "notification",
              title: "Notification",
              component: NotificationView,
            },
            {
              code: "busy",
              title: "Busy",
              component: BusyView,
            },
            {
              code: "progress",
              title: "Progress",
              component: ProgressView,
            },
            {
              code: "print",
              title: "Print",
              component: PrintView,
            },
          ],
        },
        {
          code: "service",
          title: "Service",
          icon: IconPlug,
          children: [
            {
              code: "client",
              title: "ServiceClient",
              component: ServiceClientView,
            },
            {
              code: "shared-data",
              title: "SharedData",
              component: SharedDataView,
            },
          ],
        },
      ],
    },
  ],
}));
